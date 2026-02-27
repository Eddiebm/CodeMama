/**
 * GET /api/test-send?to=email&partnerId=xxx
 * Generates a real outreach email for a partner and sends it to a test address.
 * Remove this route after testing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateOutreachEmail } from '@/lib/emailWriter';
import { transporter } from '@/lib/mail';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const to = searchParams.get('to') || 'eddie@bannermanmenson.com';
    const partnerId = searchParams.get('partnerId') || '3ae27556-13f0-4efc-8f61-63fd22e0c9af'; // Boryung

    const partner = await db.partner.findUnique({ where: { id: partnerId } });
    if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });

    // Generate the real AI email
    const emailDraft = await generateOutreachEmail(
      {
        name: partner.name,
        region: partner.region,
        interest: partner.interest,
        partnerType: partner.partnerType,
        contactName: partner.contactName,
        contactTitle: partner.contactTitle,
      },
      '' // no extra research context
    );

    // Send to test address (not the real partner)
    const html = `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; max-width: 600px;">
<p style="background:#fff3cd;padding:8px 12px;border-radius:4px;font-size:12px;color:#7a5c00;">
  ⚠️ <strong>TEST SEND</strong> — This email was generated for <strong>${partner.name}</strong> (${partner.contactEmail || 'no email'}) but redirected to you for review.
</p>
${emailDraft.body.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<br/>').join('\n')}
</div>`;

    const info = await transporter.sendMail({
      from: '"Eddie Bannerman-Menson" <eddie@coareholdings.com>',
      to,
      subject: `[TEST] ${emailDraft.subject}`,
      text: emailDraft.body,
      html,
    });

    return NextResponse.json({
      success: true,
      sentTo: to,
      partnerName: partner.name,
      subject: emailDraft.subject,
      body: emailDraft.body,
      messageId: info.messageId,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
