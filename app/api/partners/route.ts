import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const partners = await db.partner.findMany({
    orderBy: { createdAt: 'desc' },
    // Only fetch list-view fields — skip heavy text columns (notes, emailDraft, etc.)
    select: {
      id: true,
      name: true,
      region: true,
      status: true,
      partnerType: true,
      interest: true,
      contactName: true,
      contactTitle: true,
      contactEmail: true,
      employmentStatus: true,
      createdAt: true,
    },
  });

  return NextResponse.json(partners, {
    headers: {
      // Browser serves cached list instantly; revalidates in background every 15s
      'Cache-Control': 'private, max-age=15, stale-while-revalidate=60',
    },
  });
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

  // Duplicate check (case-insensitive) — SQLite doesn't support mode:'insensitive'
  const normalised = name.trim().toLowerCase();
  const allNames = await db.partner.findMany({ select: { name: true } });
  const isDuplicate = allNames.some(p => p.name.toLowerCase() === normalised);

  if (isDuplicate) {
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
