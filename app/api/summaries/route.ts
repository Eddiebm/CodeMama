import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { summarize } from '@/lib/summarizer';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const partnerId = searchParams.get('partnerId');
  if (!partnerId) return NextResponse.json({ error: 'partnerId required' }, { status: 400 });

  const messages = await db.message.findMany({
    where: { partnerId },
    orderBy: { createdAt: 'asc' },
  });

  const texts = messages.map(m => `[${m.direction}] ${m.body}`);
  const summary = summarize(texts);

  return NextResponse.json(summary);
}
