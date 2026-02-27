/**
 * GET /api/outreach/pipeline
 *
 * Returns all partners grouped by pipeline stage:
 *
 *   NOT_STARTED    — never emailed (no SENT draft)
 *   AWAITING       — sent within the last 7 days (or 14 days for CN), no reply
 *   FOLLOW_UP_DUE  — sent 7+ days ago (14+ for CN) with no inbound message
 *   RESPONDED      — has at least one INBOUND message (reply received)
 *   DONE           — partner.status === 'DONE'
 *   OPT_OUT        — partner.status === 'OPT_OUT'
 *
 * Each record includes:
 *   daysSinceContact, followUpCount (FOLLOW_UP drafts sent),
 *   lastSentAt, lastInboundAt
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Days to wait before flagging follow-up needed (longer for CN out of respect)
const FOLLOW_UP_DAYS: Record<string, number> = {
  CN: 14,
  EU: 7,
  US: 7,
};
const DEFAULT_FOLLOW_UP_DAYS = 7;

export type PipelineStage = 'NOT_STARTED' | 'AWAITING' | 'FOLLOW_UP_DUE' | 'RESPONDED' | 'DONE' | 'OPT_OUT';

export interface PipelinePartner {
  id: string;
  name: string;
  region: string;
  partnerType: string;
  contactName: string | null;
  contactEmail: string | null;
  contactTitle: string | null;
  status: string;
  stage: PipelineStage;
  lastSentAt: string | null;
  lastInboundAt: string | null;
  daysSinceContact: number | null;
  followUpCount: number;
  totalSent: number;
}

function computeStage(
  status: string,
  region: string,
  lastSentAt: Date | null,
  lastInboundAt: Date | null,
): PipelineStage {
  if (status === 'DONE')    return 'DONE';
  if (status === 'OPT_OUT') return 'OPT_OUT';
  if (lastInboundAt)        return 'RESPONDED';
  if (!lastSentAt)          return 'NOT_STARTED';

  const threshold = FOLLOW_UP_DAYS[region] ?? DEFAULT_FOLLOW_UP_DAYS;
  const daysSince = (Date.now() - lastSentAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= threshold ? 'FOLLOW_UP_DUE' : 'AWAITING';
}

export async function GET() {
  try {
    const partners = await db.partner.findMany({
      select: {
        id: true,
        name: true,
        region: true,
        partnerType: true,
        contactName: true,
        contactEmail: true,
        contactTitle: true,
        status: true,
        drafts: {
          where: { status: 'SENT' },
          select: { category: true, sentAt: true },
          orderBy: { sentAt: 'asc' },
        },
        messages: {
          where: { direction: 'INBOUND' },
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const pipeline: PipelinePartner[] = partners.map(p => {
      const sentDrafts = p.drafts.filter(d => d.sentAt);
      const followUpCount = sentDrafts.filter(d => d.category === 'FOLLOW_UP').length;
      const totalSent = sentDrafts.length;
      const lastSentAt = sentDrafts.length
        ? sentDrafts.reduce((max, d) => d.sentAt! > max ? d.sentAt! : max, sentDrafts[0].sentAt!)
        : null;
      const lastInboundAt = p.messages[0]?.createdAt ?? null;
      const stage = computeStage(p.status, p.region, lastSentAt, lastInboundAt);
      const daysSinceContact = lastSentAt
        ? Math.floor((Date.now() - new Date(lastSentAt).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: p.id,
        name: p.name,
        region: p.region,
        partnerType: p.partnerType,
        contactName: p.contactName,
        contactEmail: p.contactEmail,
        contactTitle: p.contactTitle,
        status: p.status,
        stage,
        lastSentAt: lastSentAt ? new Date(lastSentAt).toISOString() : null,
        lastInboundAt: lastInboundAt ? new Date(lastInboundAt).toISOString() : null,
        daysSinceContact,
        followUpCount,
        totalSent,
      };
    });

    // Group by stage
    const stages: Record<PipelineStage, PipelinePartner[]> = {
      FOLLOW_UP_DUE: [],
      AWAITING:      [],
      RESPONDED:     [],
      NOT_STARTED:   [],
      DONE:          [],
      OPT_OUT:       [],
    };
    for (const p of pipeline) stages[p.stage].push(p);

    // Sort each stage
    stages.FOLLOW_UP_DUE.sort((a, b) => (b.daysSinceContact ?? 0) - (a.daysSinceContact ?? 0));
    stages.AWAITING.sort((a, b) => (b.daysSinceContact ?? 0) - (a.daysSinceContact ?? 0));
    stages.RESPONDED.sort((a, b) => (b.lastInboundAt ?? '').localeCompare(a.lastInboundAt ?? ''));
    stages.NOT_STARTED.sort((a, b) => a.name.localeCompare(b.name));

    const counts: Record<PipelineStage, number> = {} as any;
    for (const [k, v] of Object.entries(stages)) counts[k as PipelineStage] = v.length;

    return NextResponse.json({ stages, counts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
