import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const drafts = await db.draft.findMany({
    where: { status: 'PENDING' },
    include: { Partner: true },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(drafts);
}
