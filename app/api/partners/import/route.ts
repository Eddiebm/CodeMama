import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function countryToRegion(country: string): string {
  const c = (country || '').toLowerCase().trim();
  const US = ['united states', 'usa', 'us', 'canada'];
  const EU = ['germany', 'france', 'united kingdom', 'uk', 'switzerland', 'sweden',
    'netherlands', 'denmark', 'belgium', 'spain', 'italy', 'austria',
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
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const isLSN = raw[0]?.[0]?.toString().includes('LSN');
    let rows: any[] = [];

    if (isLSN) {
      const headers: string[] = raw[3] || [];
      rows = raw.slice(4).map(row => {
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        return obj;
      });
    } else {
      rows = XLSX.utils.sheet_to_json(sheet);
    }

    // Debug: log what we detected
    console.log('isLSN:', isLSN);
    console.log('total rows:', rows.length);
    if (rows.length > 0) {
      console.log('first row keys:', Object.keys(rows[0]));
      console.log('first row sample:', JSON.stringify(rows[0]).slice(0, 300));
    }

    // Load existing names for duplicate detection
    const existing = await db.partner.findMany({ select: { name: true } });
    const existingNames = new Set(existing.map(p => p.name.toLowerCase().trim()));

    // Build batch
    const toCreate: any[] = [];
    let skipped = 0;
    let duplicates = 0;

    for (const row of rows) {
      const name = row['investor_name'] || row['name'] || row['Name'] || row['Company'];
      if (!name || name.toString().trim() === '') { skipped++; continue; }

      const normalizedName = name.toString().trim().toLowerCase();
      if (existingNames.has(normalizedName)) { duplicates++; continue; }

      const country = row['country'] || row['Country'] || row['region'] || row['Region'] || '';
      const interest = row['indication_preference'] || row['sector'] || row['interest'] || row['Interest'] || '';
      const firstName = row['contact_first_name'] || row['first_name'] || '';
      const lastName = row['contact_last_name'] || row['last_name'] || '';
      const contactEmail = row['contact_email'] || row['email'] || row['Email'] || '';
      const contactTitle = row['contact_job_title'] || row['title'] || '';
      const contactName = [firstName, lastName].filter(Boolean).join(' ').trim();

      // Track this name so duplicates within the same file are also caught
      existingNames.add(normalizedName);

      toCreate.push({
        name: name.toString().trim(),
        region: countryToRegion(country.toString()),
        interest: interest.toString().trim(),
        status: 'NEW',
        contactName: contactName || null,
        contactEmail: contactEmail.toString().trim() || null,
        contactTitle: contactTitle.toString().trim() || null,
      });
    }

    // Batch insert
    if (toCreate.length > 0) {
      await db.partner.createMany({ data: toCreate });
    }

    return NextResponse.json({ created: toCreate.length, skipped, duplicates });

  } catch (err: any) {
    console.error('Import error:', err);
    return NextResponse.json({ error: err.message, created: 0, skipped: 0 }, { status: 500 });
  }
}
