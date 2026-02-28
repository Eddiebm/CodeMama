import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const partners = await db.partner.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(partners);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, region, interest } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  if (!['US', 'EU', 'CN'].includes(region)) {
    return NextResponse.json({ error: 'Invalid region' }, { status: 400 });
  }

  // Duplicate check (case-insensitive)
  const existing = await db.partner.findFirst({
    where: { name: { equals: name.trim(), mode: 'insensitive' } },
  });

  if (existing) {
    return NextResponse.json(
      { error: `"${name.trim()}" already exists in your database.` },
      { status: 409 }
    );
  }

  const partner = await db.partner.create({
    data: { name: name.trim(), region, interest, status: 'NEW' },
  });

  return NextResponse.json(partner, { status: 201 });
}
