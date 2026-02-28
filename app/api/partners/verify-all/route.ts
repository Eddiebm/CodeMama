import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PROXYCURL_KEY = process.env.PROXYCURL_API_KEY;
const PC = 'https://nubela.co/proxycurl/api';

async function pcGet(path: string, params: Record<string, string>) {
  const url = new URL(`${PC}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${PROXYCURL_KEY}` },
  });
  if (!res.ok) return null;
  return res.json();
}

function companyMatches(companyName: string, partnerName: string): boolean {
  const c = companyName.toLowerCase();
  const p = partnerName.toLowerCase();
  const firstWord = p.split(/\s+/)[0].replace(/[^a-z]/g, '');
  return c.includes(firstWord) || p.includes(c.split(/\s+/)[0].replace(/[^a-z]/g, ''));
}

// Small delay to avoid hitting Proxycurl rate limits
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  if (!PROXYCURL_KEY) {
    return NextResponse.json(
      { error: 'PROXYCURL_API_KEY is not set. Add it to your Vercel environment variables.' },
      { status: 503 }
    );
  }

  // Accept optional list of IDs; default to all partners with a contactName
  const body = await req.json().catch(() => ({}));
  const { ids, limit = 20 } = body as { ids?: string[]; limit?: number };

  const where = ids?.length
    ? { id: { in: ids }, contactName: { not: null } }
    : { contactName: { not: null } };

  const partners = await db.partner.findMany({
    where,
    take: limit,
    orderBy: { employmentCheckedAt: 'asc' }, // oldest check first
  });

  const results: { id: string; name: string; contact: string; status: string; note: string }[] = [];
  let confirmed = 0, moved = 0, notFound = 0, errors = 0;

  for (const partner of partners) {
    const parts = (partner.contactName as string).trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';

    let linkedinUrl: string | null = null;

    // Email resolve first
    if (partner.contactEmail) {
      const r = await pcGet('/linkedin/profile/resolve/email', { email: partner.contactEmail });
      linkedinUrl = r?.url ?? null;
    }

    // Name + company fallback
    if (!linkedinUrl) {
      const r = await pcGet('/linkedin/profile/resolve', {
        first_name: firstName,
        last_name: lastName,
        company_name: partner.name,
        similarity_checks: 'include',
      });
      linkedinUrl = r?.url ?? null;
    }

    if (!linkedinUrl) {
      await db.partner.update({
        where: { id: partner.id },
        data: { employmentCheckedAt: new Date(), employmentStatus: 'NOT_FOUND', employmentNote: 'LinkedIn profile not found.' },
      });
      results.push({ id: partner.id, name: partner.name, contact: partner.contactName as string, status: 'NOT_FOUND', note: 'LinkedIn profile not found.' });
      notFound++;
      await delay(200);
      continue;
    }

    const profile = await pcGet('/v2/linkedin', { url: linkedinUrl, use_cache: 'if-present' });

    if (!profile) {
      await db.partner.update({
        where: { id: partner.id },
        data: { employmentCheckedAt: new Date(), employmentStatus: 'ERROR', employmentNote: 'Could not fetch LinkedIn profile.' },
      });
      results.push({ id: partner.id, name: partner.name, contact: partner.contactName as string, status: 'ERROR', note: 'Could not fetch profile.' });
      errors++;
      await delay(200);
      continue;
    }

    const experiences: any[] = profile.experiences ?? [];
    const current = experiences.find((e: any) => !e.ends_at);
    const currentCompany: string = current?.company ?? '';
    const currentTitle: string = current?.title ?? '';
    const stillThere = currentCompany ? companyMatches(currentCompany, partner.name) : false;

    let status: string;
    let note: string;

    if (!currentCompany) {
      status = 'NOT_FOUND'; note = 'No current employer listed on LinkedIn.'; notFound++;
    } else if (stillThere) {
      status = 'CONFIRMED'; note = `Still at ${partner.name}${currentTitle ? ` as ${currentTitle}` : ''}.`; confirmed++;
    } else {
      status = 'MOVED'; note = `Now at ${currentCompany}${currentTitle ? ` as ${currentTitle}` : ''}.`; moved++;
    }

    await db.partner.update({
      where: { id: partner.id },
      data: { employmentCheckedAt: new Date(), employmentStatus: status, employmentNote: note },
    });

    results.push({ id: partner.id, name: partner.name, contact: partner.contactName as string, status, note });
    await delay(300); // ~3 req/sec to stay within Proxycurl rate limits
  }

  return NextResponse.json({
    checked: results.length,
    confirmed, moved, notFound, errors,
    results,
  });
}
