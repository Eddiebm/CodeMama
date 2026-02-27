/**
 * GET /api/outreach/daily
 *
 * Returns today's recommended outreach list: a scored, diverse set of partners
 * to contact today. Algorithm factors:
 *
 * SCORING (higher = contact today):
 *   +100  NEW status  (never contacted)
 *   +60   ACTIVE status  (has been contacted before)
 *   +40   Has a validated VALID email
 *   +20   Contact name is known
 *   +20   Has not been contacted in the last 30 days  (or never)
 *   +15   Has not been contacted in the last 7 days   (or never)
 *   -200  DONE / OPT_OUT / BOUNCED status
 *   -100  humanRequired = true  (flagged for manual review)
 *   -50   Email is INVALID
 *
 * DIVERSITY RULES applied after scoring:
 *   - Target mix: ~40% PHARMA, ~20% BIOTECH, ~30% INVESTOR, ~10% OTHER
 *   - Target mix across regions: roughly balanced US/EU/APAC
 *   - Daily target: 10 outreach emails (configurable via ?limit=N, max 30)
 *
 * Returns:
 *   { date, totalEligible, recommendations: [...], stats: {...} }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// How many days to wait before re-contacting an ACTIVE partner
const RE_CONTACT_DAYS = 30;

interface ScoredPartner {
  id: string;
  name: string;
  region: string;
  interest: string;
  status: string;
  partnerType: string;
  contactName: string | null;
  contactEmail: string | null;
  contactTitle: string | null;
  lastContactAt: Date | null;
  emailStatus: string | null;
  score: number;
  reasons: string[];
}

function scorePartner(p: {
  id: string;
  name: string;
  region: string;
  interest: string;
  status: string;
  partnerType: string;
  contactName: string | null;
  contactEmail: string | null;
  contactTitle: string | null;
  lastContactAt: Date | null;
  humanRequired: boolean;
  emailValidation: { status: string } | null;
}): ScoredPartner {
  let score = 0;
  const reasons: string[] = [];

  // Hard disqualifiers
  if (['DONE', 'OPT_OUT', 'BOUNCED'].includes(p.status)) {
    score -= 200;
    reasons.push(`Status: ${p.status}`);
  }
  if (p.humanRequired) {
    score -= 100;
    reasons.push('Flagged for human review');
  }

  // Status bonuses
  if (p.status === 'NEW') {
    score += 100;
    reasons.push('Never contacted');
  } else if (p.status === 'ACTIVE') {
    score += 60;
    reasons.push('Previously engaged');
  }

  // Email quality
  const emailStatus = p.emailValidation?.status ?? null;
  if (emailStatus === 'VALID') {
    score += 40;
    reasons.push('Email verified ✓');
  } else if (emailStatus === 'INVALID') {
    score -= 50;
    reasons.push('Email invalid ✗');
  } else if (p.contactEmail) {
    score += 10; // has email, not yet validated
    reasons.push('Email present (unvalidated)');
  }

  // Contact name known
  if (p.contactName) {
    score += 20;
    reasons.push('Named contact');
  }

  // Time since last contact
  if (!p.lastContactAt) {
    score += 20; // never contacted → always fresh
  } else {
    const daysSince = (Date.now() - new Date(p.lastContactAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince >= RE_CONTACT_DAYS) {
      score += 20;
      reasons.push(`Last contact: ${Math.floor(daysSince)} days ago`);
    } else if (daysSince >= 7) {
      score += 15;
      reasons.push(`Last contact: ${Math.floor(daysSince)} days ago`);
    } else {
      score -= 30; // contacted very recently — deprioritise
      reasons.push(`Recently contacted (${Math.floor(daysSince)}d ago)`);
    }
  }

  return {
    id: p.id,
    name: p.name,
    region: p.region,
    interest: p.interest,
    status: p.status,
    partnerType: p.partnerType,
    contactName: p.contactName,
    contactEmail: p.contactEmail,
    contactTitle: p.contactTitle,
    lastContactAt: p.lastContactAt,
    emailStatus,
    score,
    reasons,
  };
}

// Target type distribution for a daily batch
const TYPE_TARGETS: Record<string, number> = {
  PHARMA: 0.40,
  BIOTECH: 0.20,
  INVESTOR: 0.30,
  OTHER: 0.10,
};

function pickDiverseBatch(scored: ScoredPartner[], limit: number): ScoredPartner[] {
  // Sort descending by score
  const sorted = [...scored].sort((a, b) => b.score - a.score);

  // Filter out disqualified
  const eligible = sorted.filter(p => p.score > 0);

  // Bucket by type
  const buckets: Record<string, ScoredPartner[]> = {
    PHARMA: [], BIOTECH: [], INVESTOR: [], OTHER: [],
  };
  for (const p of eligible) {
    const key = buckets[p.partnerType] ? p.partnerType : 'OTHER';
    buckets[key].push(p);
  }

  // Fill quota per type
  const result: ScoredPartner[] = [];
  for (const [type, fraction] of Object.entries(TYPE_TARGETS)) {
    const quota = Math.round(limit * fraction);
    const picks = buckets[type].slice(0, quota);
    result.push(...picks);
    // Remove picked from buckets
    buckets[type] = buckets[type].slice(quota);
  }

  // Top-up with best remaining if under limit
  if (result.length < limit) {
    const remaining = Object.values(buckets)
      .flat()
      .sort((a, b) => b.score - a.score);
    result.push(...remaining.slice(0, limit - result.length));
  }

  // Final sort by score so highest priority is first
  return result.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 30);

  try {
    const partners = await db.partner.findMany({
      select: {
        id: true,
        name: true,
        region: true,
        interest: true,
        status: true,
        partnerType: true,
        contactName: true,
        contactEmail: true,
        contactTitle: true,
        lastContactAt: true,
        humanRequired: true,
        emailValidation: { select: { status: true } },
      },
    });

    const scored = partners.map(scorePartner);
    const eligible = scored.filter(p => p.score > 0 && p.contactEmail);
    const recommendations = pickDiverseBatch(eligible, limit);

    // Stats
    const totalByType = partners.reduce((acc, p) => {
      acc[p.partnerType] = (acc[p.partnerType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalByStatus = partners.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const emailStats = {
      withEmail: partners.filter(p => p.contactEmail).length,
      verified: partners.filter(p => p.emailValidation?.status === 'VALID').length,
      invalid: partners.filter(p => p.emailValidation?.status === 'INVALID').length,
      unchecked: partners.filter(p => p.contactEmail && !p.emailValidation).length,
    };

    return NextResponse.json({
      date: new Date().toISOString().split('T')[0],
      totalPartners: partners.length,
      totalEligible: eligible.length,
      recommendations,
      stats: {
        byType: totalByType,
        byStatus: totalByStatus,
        email: emailStats,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
