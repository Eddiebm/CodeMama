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
import { generateFollowUpEmail, generateAdvanceEmail, AccountContext } from '@/lib/emailWriter';

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
          where: { status: 'SENT' },
          select: { id: true, subject: true, sentAt: true, category: true },
          orderBy: { sentAt: 'desc' },
        },
      },
    });

    if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    if (!partner.contactEmail) return NextResponse.json({ error: 'No contact email' }, { status: 400 });

    const sentDrafts = partner.drafts.filter(d => d.sentAt);
    const followUpDrafts = sentDrafts.filter(d => d.category === 'FOLLOW_UP');
    const followUpNumber = followUpDrafts.length + 1;

    // Account context for the BD Control Bundle
    const account: AccountContext = {
      previousOutreachCount: sentDrafts.length,
      lastSentAt: sentDrafts[0]?.sentAt?.toISOString(),
      previousSubjects: sentDrafts.slice(0, 5).map(d => d.subject ?? '').filter(Boolean),
    };

    const ctx = {
      name: partner.name,
      region: partner.region,
      interest: partner.interest,
      partnerType: partner.partnerType,
      contactName: partner.contactName,
      contactTitle: partner.contactTitle,
    };

    let emailDraft;

    if (type === 'advance') {
      const responseNote = (body.responseNote || '').trim() || 'They expressed interest in learning more.';
      emailDraft = await generateAdvanceEmail(ctx, responseNote, account);
    } else {
      const daysSince: number = body.daysSince ?? 7;
      emailDraft = await generateFollowUpEmail(ctx, daysSince, followUpNumber, account);
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
