import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { researchCompany } from '@/lib/researcher';
import { generateOutreachEmail } from '@/lib/emailWriter';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partner = await db.partner.findUnique({ where: { id: params.id } });
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Research the company (non-blocking, best-effort)
    const researchContext = await researchCompany(partner.name);

    // Generate personalized email via Claude
    const { subject, body } = await generateOutreachEmail(
      {
        name: partner.name,
        region: partner.region,
        interest: partner.interest,
        contactName: partner.contactName,
        contactTitle: partner.contactTitle,
      },
      researchContext
    );

    // Save as a PENDING draft
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
