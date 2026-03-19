/**
 * orchestrator.ts  (updated — drop-in replacement)
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles inbound messages from partners and routes them to the right action.
 *
 * Changes from original:
 *  - Uses updated classifier with POSITIVE classification
 *  - Sets partner status to 'POSITIVE' when positive intent is detected,
 *    which triggers the advance email on the next automation cycle
 */

import { db } from './db';
import { classifyInbound } from './classifier';
import { LANGUAGE } from './language';

type Region = keyof typeof LANGUAGE;
const VALID_REGIONS: Region[] = ['US', 'EU', 'CN'];

function safeRegion(r: string | undefined): Region {
  if (r && VALID_REGIONS.includes(r as Region)) return r as Region;
  return 'US';
}

export async function handleInbound(partnerId: string, text: string) {
  const partner = await db.partner.findUnique({ where: { id: partnerId } });
  if (!partner) throw new Error('Partner not found');

  // Log the inbound message
  await db.message.create({
    data: { partnerId, direction: 'INBOUND', body: text },
  });

  const classification = classifyInbound(text);

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
    // Create a pending ACK draft so the review page still shows activity
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
