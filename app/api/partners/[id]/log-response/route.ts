/**
 * POST /api/partners/[id]/log-response
 *
 * Logs an inbound response from a partner.
 * Body: { note?: string }  — optional brief note about the response
 *
 * - Creates an INBOUND message
 * - Updates partner status to ACTIVE
 * - Updates partner lastContactAt
 *
 * Returns: { ok: true }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const note = (body.note || '').trim() || 'Response received (logged manually)';

    await db.$transaction([
      db.message.create({
        data: {
          partnerId: id,
          direction: 'INBOUND',
          body: note,
        },
      }),
      db.partner.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          lastContactAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
