import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { action } = await req.json();

  if (!['APPROVE', 'REJECT'].includes(action)) {
    return NextResponse.json({ error: 'action must be APPROVE or REJECT' }, { status: 400 });
  }

  const draft = await db.draft.findUnique({ where: { id: params.id } });
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  if (draft.status !== 'PENDING') {
    return NextResponse.json({ error: 'Draft already reviewed' }, { status: 409 });
  }

  const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

  const updated = await db.draft.update({
    where: { id: params.id },
    data: { status, reviewedAt: new Date() },
  });

  if (status === 'APPROVED') {
    await db.message.create({
      data: { partnerId: draft.partnerId, direction: 'OUTBOUND', body: draft.body },
    });
    await db.partner.update({
      where: { id: draft.partnerId },
      data: { lastContactAt: new Date(), status: 'ACTIVE' },
    });
  }

  return NextResponse.json(updated);
}
