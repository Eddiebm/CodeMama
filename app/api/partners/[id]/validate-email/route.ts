import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import dns from 'dns/promises';

function isValidEmailSyntax(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function hasMxRecord(domain: string): Promise<boolean> {
  try {
    const records = await dns.resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partner = await db.partner.findUnique({ where: { id: params.id } });
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    if (!partner.contactEmail) {
      await db.emailValidation.upsert({
        where: { partnerId: params.id },
        update: { status: 'NO_EMAIL', reason: 'No email address on record', checkedAt: new Date() },
        create: { partnerId: params.id, status: 'NO_EMAIL', reason: 'No email address on record' },
      });
      return NextResponse.json({ valid: false, status: 'NO_EMAIL', reason: 'No email address on record' });
    }

    const email = partner.contactEmail.trim();

    if (!isValidEmailSyntax(email)) {
      await db.emailValidation.upsert({
        where: { partnerId: params.id },
        update: { status: 'INVALID', reason: 'Invalid email format', checkedAt: new Date() },
        create: { partnerId: params.id, status: 'INVALID', reason: 'Invalid email format' },
      });
      return NextResponse.json({ valid: false, status: 'INVALID', reason: 'Invalid email format' });
    }

    const domain = email.split('@')[1];
    const hasMx = await hasMxRecord(domain);

    if (!hasMx) {
      await db.emailValidation.upsert({
        where: { partnerId: params.id },
        update: { status: 'INVALID', reason: `Domain ${domain} has no MX record`, checkedAt: new Date() },
        create: { partnerId: params.id, status: 'INVALID', reason: `Domain ${domain} has no MX record` },
      });
      return NextResponse.json({ valid: false, status: 'INVALID', reason: `Domain ${domain} has no MX record` });
    }

    await db.emailValidation.upsert({
      where: { partnerId: params.id },
      update: { status: 'VALID', reason: null, checkedAt: new Date() },
      create: { partnerId: params.id, status: 'VALID', reason: null },
    });

    return NextResponse.json({ valid: true, status: 'VALID' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
