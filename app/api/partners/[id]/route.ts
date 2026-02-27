import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const partner = await db.partner.findUnique({
    where: { id: params.id },
    include: { messages: { orderBy: { createdAt: 'asc' } }, drafts: true },
  });
  if (!partner) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(partner);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const partner = await db.partner.update({
    where: { id: params.id },
    data: body,
  });
  return NextResponse.json(partner);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await db.partner.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
