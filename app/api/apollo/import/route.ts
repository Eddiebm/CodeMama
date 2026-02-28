import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function countryToRegion(country: string): string {
  const c = (country || '').toLowerCase().trim();
  const US = ['united states', 'usa', 'us', 'canada'];
  const EU = ['germany', 'france', 'united kingdom', 'uk', 'great britain', 'switzerland',
    'sweden', 'netherlands', 'denmark', 'belgium', 'spain', 'italy', 'austria',
    'norway', 'finland', 'ireland', 'luxembourg', 'portugal', 'poland',
    'czech republic', 'europe'];
  const CN = ['china', 'hong kong', 'taiwan', 'singapore'];
  if (US.includes(c)) return 'US';
  if (EU.includes(c)) return 'EU';
  if (CN.includes(c)) return 'CN';
  return 'US';
}

export async function POST(req: NextRequest) {
  try {
    const { people } = (await req.json()) as { people: any[] };
    if (!people?.length) {
      return NextResponse.json({ error: 'No people provided' }, { status: 400 });
    }

    // Load existing company names for duplicate detection
    const existing = await db.partner.findMany({ select: { name: true } });
    const existingNames = new Set(existing.map(p => p.name.toLowerCase().trim()));

    const toCreate: any[] = [];
    let duplicates = 0;
    let skipped = 0;

    for (const person of people) {
      const companyName = (person.organization?.name || '').trim();
      if (!companyName) { skipped++; continue; }

      const normalised = companyName.toLowerCase();
      if (existingNames.has(normalised)) { duplicates++; continue; }
      existingNames.add(normalised); // catch intra-batch dupes

      // Apollo marks unavailable emails as "email_not_unlocked@domain.com"
      const rawEmail = (person.email || '').trim();
      const email = rawEmail && !rawEmail.includes('email_not_unlocked') ? rawEmail : null;

      toCreate.push({
        name: companyName,
        region: countryToRegion(person.country || ''),
        interest: person.organization?.industry || '',
        status: 'NEW',
        contactName: person.name || null,
        contactEmail: email,
        contactTitle: person.title || null,
      });
    }

    if (toCreate.length > 0) {
      await db.partner.createMany({ data: toCreate });
    }

    return NextResponse.json({ created: toCreate.length, duplicates, skipped });
  } catch (err: any) {
    console.error('Apollo import error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
