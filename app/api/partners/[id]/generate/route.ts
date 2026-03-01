import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { researchCompany } from '@/lib/researcher';
import { generateOutreachEmail, AccountContext } from '@/lib/emailWriter';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partner = await db.partner.findUnique({
      where: { id: params.id },
      include: {
        drafts: {
          where: { status: 'SENT' },
          select: { subject: true, sentAt: true },
          orderBy: { sentAt: 'desc' },
        },
      },
    });

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Build account context for the BD Control Bundle
    const sentDrafts = partner.drafts.filter(d => d.sentAt);
    const account: AccountContext = {
      previousOutreachCount: sentDrafts.length,
      lastSentAt: sentDrafts[0]?.sentAt?.toISOString(),
      previousSubjects: sentDrafts.slice(0, 5).map(d => d.subject ?? '').filter(Boolean),
    };

    // Research the company (best-effort)
    const researchContext = await researchCompany(partner.name);

    // Generate via the BD Control Bundle
    const { subject, body } = await generateOutreachEmail(
      {
        name: partner.name,
        region: partner.region,
        interest: partner.interest,
        partnerType: partner.partnerType || 'PHARMA',
        contactName: partner.contactName,
        contactTitle: partner.contactTitle,
      },
      researchContext,
      account,
    );

    const draft = await db.draft.create({
      data: {
        partnerId: partner.id,
        region: partner.region,
        category: 'OUTREACH',
        subject,
        body,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ draftId: draft.id, subject, body });
  } catch (err: any) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
