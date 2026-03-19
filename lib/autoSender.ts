/**
 * autoSender.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fully automated email pipeline for CodeMama.
 *
 * Three cycles run in sequence every day:
 *  1. OUTREACH  – NEW partners → generate initial email → send → mark CONTACTED
 *  2. FOLLOW_UP – Partners with no reply, up to 3 nudges spaced FOLLOW_UP_DAYS apart
 *                 CONTACTED → NUDGE_1_SENT → NUDGE_2_SENT → NUDGE_3_SENT → STALE
 *  3. ADVANCE   – Partners whose latest inbound is positive → send advance email
 *
 * All sends are logged as Draft rows (status = 'SENT') so you keep a full audit trail.
 * Set AUTOMATION_SECRET in env to protect the trigger endpoint.
 */

import { db } from './db';
import { generateOutreachEmail } from './emailWriter';
import { sendOutreachEmail } from './mail';

// ── Config ────────────────────────────────────────────────────────────────────

/** Days of silence before each nudge is sent */
const FOLLOW_UP_DAYS = parseInt(process.env.FOLLOW_UP_DAYS || '7', 10);

/** Max partners to process per cycle (prevents timeout on large lists) */
const BATCH_LIMIT = parseInt(process.env.AUTOMATION_BATCH_LIMIT || '20', 10);

// Nudge ladder: status before nudge → { next status, outreach count for AI }
const NUDGE_LADDER: Record<string, { nextStatus: string; outreachCount: number }> = {
  CONTACTED:    { nextStatus: 'NUDGE_1_SENT', outreachCount: 1 },
  NUDGE_1_SENT: { nextStatus: 'NUDGE_2_SENT', outreachCount: 2 },
  NUDGE_2_SENT: { nextStatus: 'NUDGE_3_SENT', outreachCount: 3 },
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CycleResult {
  cycle: 'outreach' | 'followUp' | 'advance';
  processed: number;
  sent: number;
  skipped: number;
  errors: { partnerId: string; error: string }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function sendAndLog(
  partner: any,
  emailDraft: { subject: string; body: string },
  category: string
): Promise<void> {
  const contactEmail = partner.contactEmail;
  if (!contactEmail) throw new Error('No contactEmail on partner');

  // Send via Resend
  await sendOutreachEmail({
    to: contactEmail,
    subject: emailDraft.subject,
    body: emailDraft.body,
  });

  // Log the send as a Draft row
  await db.draft.create({
    data: {
      partnerId: partner.id,
      region: partner.region,
      category,
      subject: emailDraft.subject,
      body: emailDraft.body,
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  // Update partner tracking fields
  await db.partner.update({
    where: { id: partner.id },
    data: { lastContactAt: new Date() },
  });
}

// ── Cycle 1: Initial Outreach ─────────────────────────────────────────────────

/**
 * Find all NEW partners with a valid contactEmail and send them an
 * AI-generated initial outreach email.
 */
export async function runOutreachCycle(): Promise<CycleResult> {
  const result: CycleResult = { cycle: 'outreach', processed: 0, sent: 0, skipped: 0, errors: [] };

  const partners = await db.partner.findMany({
    where: {
      status: 'NEW',
      contactEmail: { not: null },
      humanRequired: false,
    },
    take: BATCH_LIMIT,
    orderBy: { createdAt: 'asc' },
  });

  for (const partner of partners) {
    result.processed++;
    try {
      const emailDraft = await generateOutreachEmail(
        {
          name: partner.name,
          region: partner.region,
          interest: partner.interest,
          partnerType: partner.partnerType,
          contactName: partner.contactName ?? undefined,
          contactTitle: partner.contactTitle ?? undefined,
        },
        '', // No prior context for initial outreach
        { previousOutreachCount: 0 }
      );

      await sendAndLog(partner, emailDraft, 'INITIAL_OUTREACH');

      // Advance partner status
      await db.partner.update({
        where: { id: partner.id },
        data: { status: 'CONTACTED' },
      });

      result.sent++;
    } catch (err: any) {
      result.errors.push({ partnerId: partner.id, error: err.message });
    }
  }

  return result;
}

// ── Cycle 2: Follow-up / Nudge (up to 3 nudges) ──────────────────────────────

/**
 * Walk every partner through the nudge ladder:
 *   CONTACTED → NUDGE_1_SENT → NUDGE_2_SENT → NUDGE_3_SENT → STALE
 *
 * Each step waits FOLLOW_UP_DAYS of silence before sending the next nudge.
 * After NUDGE_3_SENT the partner is marked STALE and automation stops.
 */
export async function runFollowUpCycle(): Promise<CycleResult> {
  const result: CycleResult = { cycle: 'followUp', processed: 0, sent: 0, skipped: 0, errors: [] };

  const cutoff = daysAgo(FOLLOW_UP_DAYS);

  // Pick up partners at any rung of the nudge ladder that are overdue
  const partners = await db.partner.findMany({
    where: {
      status: { in: Object.keys(NUDGE_LADDER) },
      humanRequired: false,
      contactEmail: { not: null },
      lastContactAt: { lte: cutoff },
    },
    take: BATCH_LIMIT,
    orderBy: { lastContactAt: 'asc' },
  });

  for (const partner of partners) {
    result.processed++;

    const rung = NUDGE_LADDER[partner.status];

    // Shouldn't happen, but guard anyway
    if (!rung) {
      result.skipped++;
      continue;
    }

    // If this partner has already had NUDGE_3_SENT and still no reply, retire them
    if (partner.status === 'NUDGE_3_SENT') {
      await db.partner.update({ where: { id: partner.id }, data: { status: 'STALE' } });
      result.skipped++;
      continue;
    }

    try {
      // Build context from the most recent prior send
      const priorDraft = await db.draft.findFirst({
        where: { partnerId: partner.id, status: 'SENT' },
        orderBy: { sentAt: 'desc' },
      });
      const priorContext = priorDraft
        ? `Prior email sent on ${priorDraft.sentAt?.toDateString()}: ${priorDraft.body.slice(0, 200)}…`
        : '';

      const emailDraft = await generateOutreachEmail(
        {
          name: partner.name,
          region: partner.region,
          interest: partner.interest,
          partnerType: partner.partnerType,
          contactName: partner.contactName ?? undefined,
          contactTitle: partner.contactTitle ?? undefined,
        },
        priorContext,
        { previousOutreachCount: rung.outreachCount }
      );

      await sendAndLog(partner, emailDraft, rung.nextStatus.replace('_SENT', ''));
      await db.partner.update({
        where: { id: partner.id },
        data: { status: rung.nextStatus },
      });

      result.sent++;
    } catch (err: any) {
      result.errors.push({ partnerId: partner.id, error: err.message });
    }
  }

  // Any partner stuck at NUDGE_3_SENT past the cutoff gets marked STALE now
  await db.partner.updateMany({
    where: {
      status: 'NUDGE_3_SENT',
      lastContactAt: { lte: cutoff },
      humanRequired: false,
    },
    data: { status: 'STALE' },
  });

  return result;
}

// ── Cycle 3: Advance (Positive Response) ─────────────────────────────────────

/**
 * Find partners whose most recent inbound message signals positive intent
 * (status = 'POSITIVE', set by the orchestrator/classifier).
 * Send an advance email to move the conversation forward.
 */
export async function runAdvanceCycle(): Promise<CycleResult> {
  const result: CycleResult = { cycle: 'advance', processed: 0, sent: 0, skipped: 0, errors: [] };

  const partners = await db.partner.findMany({
    where: {
      status: 'POSITIVE',
      humanRequired: false,
      contactEmail: { not: null },
    },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 3 },
    },
    take: BATCH_LIMIT,
    orderBy: { lastContactAt: 'asc' },
  });

  for (const partner of partners) {
    result.processed++;
    try {
      const recentContext = (partner as any).messages
        .map((m: any) => `[${m.direction}] ${m.body}`)
        .join('\n');

      const emailDraft = await generateOutreachEmail(
        {
          name: partner.name,
          region: partner.region,
          interest: partner.interest,
          partnerType: partner.partnerType,
          contactName: partner.contactName ?? undefined,
          contactTitle: partner.contactTitle ?? undefined,
        },
        recentContext,
        { previousOutreachCount: 2 } // triggers advance mode
      );

      await sendAndLog(partner, emailDraft, 'ADVANCE');
      await db.partner.update({
        where: { id: partner.id },
        data: { status: 'ADVANCE_SENT' },
      });

      result.sent++;
    } catch (err: any) {
      result.errors.push({ partnerId: partner.id, error: err.message });
    }
  }

  return result;
}

// ── Full Pipeline ─────────────────────────────────────────────────────────────

/**
 * Run all three cycles in sequence and return a combined summary.
 */
export async function runFullAutomation(): Promise<{
  ok: boolean;
  timestamp: string;
  results: CycleResult[];
  totalSent: number;
  totalErrors: number;
}> {
  const results = await Promise.allSettled([
    runOutreachCycle(),
    runFollowUpCycle(),
    runAdvanceCycle(),
  ]);

  const settled = results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : ({ cycle: 'unknown', processed: 0, sent: 0, skipped: 0, errors: [{ partnerId: '', error: String((r as any).reason) }] } as CycleResult)
  );

  return {
    ok: true,
    timestamp: new Date().toISOString(),
    results: settled,
    totalSent: settled.reduce((s, r) => s + r.sent, 0),
    totalErrors: settled.reduce((s, r) => s + r.errors.length, 0),
  };
}
