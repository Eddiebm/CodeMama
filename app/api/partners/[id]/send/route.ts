import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendOutreachEmail } from '@/lib/mail';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { draftId, includeDeck = false, subject: editedSubject, body: editedBody } = await req.json();

    if (!draftId) {
      return NextResponse.json({ error: 'draftId is required' }, { status: 400 });
    }

    // Fetch partner
    const partner = await db.partner.findUnique({ where: { id: params.id } });
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }
    if (!partner.contactEmail) {
      return NextResponse.json({ error: 'Partner has no contact email' }, { status: 400 });
    }

    // Fetch and verify draft
    const draft = await db.draft.findUnique({ where: { id: draftId } });
    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
    if (draft.partnerId !== params.id) {
      return NextResponse.json({ error: 'Draft does not belong to this partner' }, { status: 400 });
    }
    if (draft.status === 'SENT') {
      return NextResponse.json({ error: 'Email already sent' }, { status: 409 });
    }

    // Use edited content if provided by the user, otherwise fall back to stored draft
    const finalSubject = (editedSubject && editedSubject.trim()) ? editedSubject.trim() : (draft.subject || 'Introduction: COARE Holdings');
    const finalBody    = (editedBody    && editedBody.trim())    ? editedBody.trim()    : draft.body;

    const result = await sendOutreachEmail({
      to: partner.contactEmail,
      subject: finalSubject,
      body: finalBody,
      includeDeck,
    });

    // Mark draft as SENT and persist the final (possibly edited) content
    await db.draft.update({
      where: { id: draftId },
      data: { status: 'SENT', sentAt: new Date(), reviewedAt: new Date(), subject: finalSubject, body: finalBody },
    });

    // Log outbound message
    await db.message.create({
      data: { partnerId: partner.id, direction: 'OUTBOUND', body: draft.body },
    });

    // Update partner status
    await db.partner.update({
      where: { id: partner.id },
      data: { lastContactAt: new Date(), status: 'ACTIVE' },
    });

    return NextResponse.json({ sent: true, messageId: result.messageId, to: partner.contactEmail });
  } catch (err: any) {
    console.error('Send error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
