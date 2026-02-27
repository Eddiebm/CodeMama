import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const partners = await db.partner.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(partners);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, region, interest } = body;

  if (!['US', 'EU', 'CN'].includes(region)) {
    return NextResponse.json({ error: 'Invalid region' }, { status: 400 });
  }

  const partner = await db.partner.create({
    data: { name, region, interest, status: 'NEW' },
  });

  return NextResponse.json(partner, { status: 201 });
}
