/**
 * orchestrator.ts  (updated — drop-in replacement)
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles inbound messages from partners and routes them to the right action.
 *
 * Changes from original:
 *  - Uses updated classifier with POSITIVE classification
 *  - Sets partner status to 'POSITIVE' when positive intent is detected,
 *    which triggers the advance email on the next automation cycle
 *  - Sends an instant reply alert email to REPORT_EMAIL on every inbound
 */

import { db } from './db';
import { classifyInbound } from './classifier';
import { LANGUAGE } from './language';
import { sendOutreachEmail } from './mail';

// ── Reply alert ───────────────────────────────────────────────────────────────

async function sendReplyAlert(partner: any, text: string, classification: string): Promise<void> {
  const to = process.env.REPORT_EMAIL || process.env.OWNER_EMAIL;
  if (!to) return;

  const label: Record<string, string> = {
    POSITIVE:       '🟢 Positive — advance email queued',
    HUMAN_REQUIRED: '🔴 Needs your attention',
    SIMPLE:         '⚪️ Simple / neutral',
  };

  const badge = label[classification] || classification;
  const partnerName = partner.name || partner.id;
  const contactLine = partner.contactName
    ? `<p style="margin:0 0 4px;font-size:14px;color:#555;"><strong>Contact:</strong> ${partner.contactName}${partner.contactTitle ? `, ${partner.contactTitle}` : ''}</p>`
    : '';

  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f4;margin:0;padding:32px 0;">
<table width="580" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
  <tr><td style="background:#0e0e0e;padding:20px 28px;">
    <span style="color:#fff;font-size:18px;font-weight:700;">CodeMama</span>
    <span style="color:#888;font-size:13px;margin-left:12px;">Partner Reply</span>
  </td></tr>
  <tr><td style="padding:28px;">
    <p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0e0e0e;">${partnerName} replied</p>
    <p style="margin:0 0 20px;font-size:14px;font-weight:600;color:#333;">${badge}</p>
    ${contactLine}
    <p style="margin:0 0 4px;font-size:14px;color:#555;"><strong>Region:</strong> ${partner.region || '—'}</p>
    <p style="margin:0 0 20px;font-size:14px;color:#555;"><strong>Interest:</strong> ${partner.interest || '—'}</p>
    <div style="background:#f9f9f9;border-left:3px solid #0e0e0e;padding:14px 16px;border-radius:0 6px 6px 0;margin:0 0 24px;">
      <p style="margin:0;font-size:15px;color:#222;line-height:1.6;">${text.replace(/\n/g, '<br />')}</p>
    </div>
    <p style="margin:0;font-size:12px;color:#aaa;">Received ${new Date().toUTCString()}</p>
  </td></tr>
</table>
</body></html>`;

  await sendOutreachEmail({
    to,
    subject: `[CodeMama] ${partnerName} replied — ${badge}`,
    body: html,
  });
}

// ── Region helper ─────────────────────────────────────────────────────────────

type Region = keyof typeof LANGUAGE;
const VALID_REGIONS: Region[] = ['US', 'EU', 'CN'];

function safeRegion(r: string | undefined): Region {
  if (r && VALID_REGIONS.includes(r as Region)) return r as Region;
  return 'US';
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function handleInbound(partnerId: string, text: string) {
  const partner = await db.partner.findUnique({ where: { id: partnerId } });
  if (!partner) throw new Error('Partner not found');

  // Log the inbound message
  await db.message.create({
    data: { partnerId, direction: 'INBOUND', body: text },
  });

  const classification = classifyInbound(text);

  // Send instant alert to owner — fire-and-forget, don't block the response
  sendReplyAlert(partner, text, classification).catch((e) =>
    console.error('[orchestrator] Reply alert failed:', e.message)
  );

  // ── Human escalation ──────────────────────────────────────────────────────
  if (classification === 'HUMAN_REQUIRED') {
    await db.partner.update({
      where: { id: partnerId },
      data: { humanRequired: true, status: 'HUMAN_REQUIRED' },
    });
    return { action: 'STOP', reason: 'Complexity keyword detected. Escalate to human.' };
  }

  // ── Positive response — queue for advance email ───────────────────────────
  if (classification === 'POSITIVE') {
    await db.partner.update({
      where: { id: partnerId },
      data: { status: 'POSITIVE' },
    });
    const region = safeRegion(partner.region);
    const draft = await db.draft.create({
      data: {
        partnerId,
        region,
        category: 'POSITIVE_RECEIVED',
        body: `Positive response received. Advance email will be auto-sent on the next automation cycle.\n\nInbound: ${text}`,
        status: 'PENDING',
      },
    });
    return {
      action: 'POSITIVE_QUEUED',
      draftId: draft.id,
      reason: 'Positive intent detected. Advance email queued for next automation run.',
    };
  }

  // ── Simple ACK ────────────────────────────────────────────────────────────
  const region = safeRegion(partner.region);
  const draftBody = LANGUAGE[region].ACK;

  const draft = await db.draft.create({
    data: { partnerId, region, category: 'ACK', body: draftBody, status: 'PENDING' },
  });

  return { action: 'DRAFT_CREATED', draftId: draft.id, draft: draftBody, region };
}
