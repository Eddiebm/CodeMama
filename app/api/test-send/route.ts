/**
 * GET /api/test-send?to=email&partnerId=xxx
 * Generates a real outreach email for a partner and sends it to a test address.
 * Remove this route after testing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateOutreachEmail } from '@/lib/emailWriter';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const to = searchParams.get('to') || 'eddie@bannermanmenson.com';
    const partnerId = searchParams.get('partnerId') || '3ae27556-13f0-4efc-8f61-63fd22e0c9af';

    const partner = await db.partner.findUnique({ where: { id: partnerId } });
    if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });

    const emailDraft = await generateOutreachEmail(
      {
        name: partner.name,
        region: partner.region,
        interest: partner.interest,
        partnerType: partner.partnerType,
        contactName: partner.contactName,
        contactTitle: partner.contactTitle,
      },
      ''
    );

    const html = `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; max-width: 600px;">
<p style="background:#fff3cd;padding:8px 12px;border-radius:4px;font-size:12px;color:#7a5c00;">
  ⚠️ <strong>TEST SEND</strong> — Generated for <strong>${partner.name}</strong>, redirected to you for review.
</p>
${emailDraft.body.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '').join('\n')}
</div>`;

    const result = await resend.emails.send({
      from: 'Eddie Bannerman-Menson <eddie@coareholdings.com>',
      to,
      subject: `[TEST] ${emailDraft.subject}`,
      text: emailDraft.body,
      html,
    });

    if (result.error) throw new Error(result.error.message);

    return NextResponse.json({
      success: true,
      sentTo: to,
      partnerName: partner.name,
      subject: emailDraft.subject,
      messageId: result.data?.id,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
