import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const drafts = await db.draft.findMany({
    where: { status: 'PENDING' },
    include: { Partner: true },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(drafts);
}
