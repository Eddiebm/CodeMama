import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const LSN_DIR = '/Users/eddiebannerman-menson/CodeMama/data/';

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

export async function GET(req: NextRequest) {
  try {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('file');

  // List available files
  if (!filename) {
    const files = fs.readdirSync(LSN_DIR).filter(f => f.endsWith('.xls') || f.endsWith('.xlsx'));
    return NextResponse.json({ files });
  }

  const filePath = path.join(LSN_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const wb = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const headers: string[] = raw[3] || [];
  const rows = raw.slice(4).map(row => {
    const obj: any = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });

  const toCreate: any[] = [];
  let skipped = 0;

  for (const row of rows) {
    const name = row['investor_name'];
    if (!name || name.toString().trim() === '') { skipped++; continue; }

    const country = row['country'] || '';
    const interest = row['indication_preference'] || row['sector'] || '';
    const firstName = row['contact_first_name'] || '';
    const lastName = row['contact_last_name'] || '';
    const contactEmail = row['contact_email'] || '';
    const contactTitle = row['contact_job_title'] || '';
    const contactName = [firstName, lastName].filter(Boolean).join(' ').trim();

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

  await db.partner.createMany({ data: toCreate });

  return NextResponse.json({ created: toCreate.length, skipped, file: filename });
  } catch (err: any) {
    console.error('Direct import error:', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
