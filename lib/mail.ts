import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Eddie Bannerman-Menson <eddie@coareholdings.com>';

interface SendOptions {
  to: string;
  subject: string;
  body: string;
  includeDeck?: boolean;
}

export async function sendOutreachEmail({ to, subject, body, includeDeck = false }: SendOptions) {
  // Convert plain text to simple HTML
  const html = `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; max-width: 600px;">
${body.split('\n').map(line => line.trim() ? `<p style="margin:0 0 10px;">${line}</p>` : '').join('\n')}
</div>`;

  const attachments: { filename: string; content: Buffer }[] = [];

  if (includeDeck && process.env.DECK_PATH) {
    const deckPath = path.resolve(process.env.DECK_PATH);
    if (fs.existsSync(deckPath)) {
      attachments.push({
        filename: 'COARE Holdings.pdf',
        content: fs.readFileSync(deckPath),
      });
    }
  }

  const result = await resend.emails.send({
    from: FROM,
    to,
    subject,
    text: body,
    html,
    ...(attachments.length > 0 ? { attachments } : {}),
  });

  if (result.error) throw new Error(result.error.message);

  return { messageId: result.data?.id ?? 'sent', accepted: [to] };
}
