import { NextRequest, NextResponse } from 'next/server';
import { handleInbound } from '@/lib/orchestrator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { partnerId, text } = await req.json();

  if (!partnerId || !text) {
    return NextResponse.json({ error: 'partnerId and text required' }, { status: 400 });
  }

  try {
    const result = await handleInbound(partnerId, text);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
