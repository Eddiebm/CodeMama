import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtpout.secureserver.net',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  tls: {
    rejectUnauthorized: false, // GoDaddy often needs this
  },
});

interface SendOptions {
  to: string;
  subject: string;
  body: string;
  includeDeck?: boolean;
}

export async function sendOutreachEmail({ to, subject, body, includeDeck = false }: SendOptions) {
  const from = `"Eddie Bannerman-Menson" <${process.env.SMTP_USER || 'eddie@coareholdings.com'}>`;

  // Convert plain text body to simple HTML
  const html = `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; max-width: 600px;">
${body.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<br/>').join('\n')}
</div>`;

  const attachments: nodemailer.Attachment[] = [];

  if (includeDeck && process.env.DECK_PATH) {
    const deckPath = path.resolve(process.env.DECK_PATH);
    if (fs.existsSync(deckPath)) {
      attachments.push({
        filename: 'COARE Holdings.pdf',
        path: deckPath,
      });
    }
  }

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text: body,
    html,
    attachments,
  });

  return { messageId: info.messageId, accepted: info.accepted };
}
