/**
 * POST /api/partners/[id]/follow-up
 *
 * Generates a follow-up draft — two modes:
 *
 *   type=nudge   (default)
 *     They have NOT responded. Write a brief, soft nudge.
 *     Body: { type: 'nudge', daysSince: number }
 *
 *   type=advance
 *     They HAVE responded. Write a warm reply that advances the conversation.
 *     Body: { type: 'advance', responseNote: string }
 *
 * Returns: { draftId, subject, body, followUpNumber }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateFollowUpEmail, generateAdvanceEmail } from '@/lib/emailWriter';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await req.json();
    const type: 'nudge' | 'advance' = body.type === 'advance' ? 'advance' : 'nudge';

    const partner = await db.partner.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        region: true,
        interest: true,
        partnerType: true,
        contactName: true,
        contactTitle: true,
        contactEmail: true,
        drafts: {
          where: { category: 'FOLLOW_UP', status: 'SENT' },
          select: { id: true },
        },
      },
    });

    if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    if (!partner.contactEmail) return NextResponse.json({ error: 'No contact email' }, { status: 400 });

    const ctx = {
      name: partner.name,
      region: partner.region,
      interest: partner.interest,
      partnerType: partner.partnerType,
      contactName: partner.contactName,
      contactTitle: partner.contactTitle,
    };

    let emailDraft;
    const followUpNumber = partner.drafts.length + 1;

    if (type === 'advance') {
      const responseNote = (body.responseNote || '').trim() || 'They expressed interest in learning more.';
      emailDraft = await generateAdvanceEmail(ctx, responseNote);
    } else {
      const daysSince: number = body.daysSince ?? 7;
      emailDraft = await generateFollowUpEmail(ctx, daysSince, followUpNumber);
    }

    const draft = await db.draft.create({
      data: {
        partnerId: id,
        region: partner.region,
        category: 'FOLLOW_UP',
        subject: emailDraft.subject,
        body: emailDraft.body,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      draftId: draft.id,
      subject: emailDraft.subject,
      body: emailDraft.body,
      followUpNumber,
      type,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
