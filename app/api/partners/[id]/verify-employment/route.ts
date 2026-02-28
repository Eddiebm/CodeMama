import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const PROXYCURL_KEY = process.env.PROXYCURL_API_KEY;

// Proxycurl base
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

// Check if a company name roughly matches the partner name
function companyMatches(companyName: string, partnerName: string): boolean {
  const c = companyName.toLowerCase();
  const p = partnerName.toLowerCase();
  // Check if the first meaningful word of the partner name appears in the company name
  const firstWord = p.split(/\s+/)[0].replace(/[^a-z]/g, '');
  return c.includes(firstWord) || p.includes(c.split(/\s+/)[0].replace(/[^a-z]/g, ''));
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!PROXYCURL_KEY) {
    return NextResponse.json(
      { error: 'PROXYCURL_API_KEY is not set. Add it to your Vercel environment variables.' },
      { status: 503 }
    );
  }

  const partner = await db.partner.findUnique({ where: { id: params.id } });
  if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
  if (!partner.contactName) {
    return NextResponse.json({ error: 'No contact name on record — cannot look up on LinkedIn.' }, { status: 400 });
  }

  // Split full name into first + last
  const parts = partner.contactName.trim().split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ') || '';

  let linkedinUrl: string | null = null;

  // Step 1: Try email-based resolve first (cheaper, more accurate)
  if (partner.contactEmail) {
    const emailResolve = await pcGet('/linkedin/profile/resolve/email', {
      email: partner.contactEmail,
    });
    linkedinUrl = emailResolve?.url ?? null;
  }

  // Step 2: Fall back to name + company resolve
  if (!linkedinUrl) {
    const nameResolve = await pcGet('/linkedin/profile/resolve', {
      first_name: firstName,
      last_name: lastName,
      company_name: partner.name,
      similarity_checks: 'include',
    });
    linkedinUrl = nameResolve?.url ?? null;
  }

  if (!linkedinUrl) {
    // Save NOT_FOUND result
    await db.partner.update({
      where: { id: params.id },
      data: {
        employmentCheckedAt: new Date(),
        employmentStatus: 'NOT_FOUND',
        employmentNote: 'Could not find LinkedIn profile matching this name and company.',
      },
    });
    return NextResponse.json({ status: 'NOT_FOUND', linkedinUrl: null });
  }

  // Step 3: Fetch their full LinkedIn profile
  const profile = await pcGet('/v2/linkedin', {
    url: linkedinUrl,
    use_cache: 'if-present',
  });

  if (!profile) {
    await db.partner.update({
      where: { id: params.id },
      data: {
        employmentCheckedAt: new Date(),
        employmentStatus: 'ERROR',
        employmentNote: 'Found LinkedIn URL but could not fetch profile.',
      },
    });
    return NextResponse.json({ status: 'ERROR', linkedinUrl });
  }

  // Step 4: Find their current employer (experience with no end date)
  const experiences: any[] = profile.experiences ?? [];
  const current = experiences.find((e: any) => !e.ends_at);
  const currentCompany: string = current?.company ?? '';
  const currentTitle: string = current?.title ?? '';

  const stillThere = currentCompany ? companyMatches(currentCompany, partner.name) : false;

  let status: string;
  let note: string;

  if (!currentCompany) {
    status = 'NOT_FOUND';
    note = 'LinkedIn profile found but no current employer listed.';
  } else if (stillThere) {
    status = 'CONFIRMED';
    note = `Confirmed at ${partner.name}${currentTitle ? ` as ${currentTitle}` : ''}.`;
  } else {
    status = 'MOVED';
    note = `Now at ${currentCompany}${currentTitle ? ` as ${currentTitle}` : ''}.`;
  }

  // Save result to DB
  await db.partner.update({
    where: { id: params.id },
    data: {
      employmentCheckedAt: new Date(),
      employmentStatus: status,
      employmentNote: note,
    },
  });

  return NextResponse.json({
    status,
    note,
    currentCompany,
    currentTitle,
    linkedinUrl,
    profileName: profile.full_name,
  });
}
