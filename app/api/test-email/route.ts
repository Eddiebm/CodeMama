/**
 * GET /api/test-email
 * Sends a test email to eddie@coareholdings.com to verify Resend is working.
 * Remove or protect this route after testing.
 */

import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    const result = await resend.emails.send({
      from: 'Eddie Bannerman-Menson <eddie@coareholdings.com>',
      to: 'eddie@coareholdings.com',
      subject: '✅ GPCE Resend Test — It works!',
      text: 'This is a test email from your GPCE system via Resend. SMTP is now handled by Resend.',
      html: `
        <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; max-width: 500px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #1a6b1a;">✅ Resend is working!</h2>
          <p>This is a test email from your <strong>GPCE</strong> system.</p>
          <p>Email is now sent via <strong>Resend</strong> — better deliverability than GoDaddy SMTP.</p>
        </div>
      `,
    });

    if (result.error) throw new Error(result.error.message);

    return NextResponse.json({ success: true, messageId: result.data?.id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
