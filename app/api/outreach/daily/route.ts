/**
 * GET /api/outreach/daily
 *
 * Returns a recommended outreach list for a given date.
 *
 * Query params:
 *   date=YYYY-MM-DD   — which day's list to return (default: today)
 *   limit=N           — how many to return (default 10, max 30)
 *
 * SCORING (higher = contact today):
 *   +100  NEW status  (never contacted)
 *   +60   ACTIVE status  (has been contacted before)
 *   +40   Has a validated VALID email
 *   +20   Contact name is known
 *   +20   Has not been contacted in the last 30 days (or never)
 *   +15   Has not been contacted in the last 7 days  (or never)
 *   -200  DONE / OPT_OUT / BOUNCED status
 *   -100  humanRequired = true
 *   -50   Email is INVALID
 *
 * DAILY ROTATION:
 *   Within each score tier, partners are shuffled deterministically using the
 *   date as a seed. Same date → same list; different date → different rotation.
 *   This ensures you see fresh faces each day without losing the priority ranking.
 *
 * DIVERSITY RULES:
 *   Target mix: ~40% PHARMA, ~20% BIOTECH, ~30% INVESTOR, ~10% OTHER
 *   Daily target: 10 (configurable via ?limit=N, max 30)
 *
 * Returns:
 *   { date, isToday, totalPartners, totalEligible, recommendations, stats }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const RE_CONTACT_DAYS = 30;

// ---- Deterministic date-seeded shuffle ----------------------------------

function dateToSeed(dateStr: string): number {
  // FNV-1a 32-bit hash
  let h = 0x811c9dc5;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
    h = h >>> 0;
  }
  return h;
}

function seededFloat(seed: number, index: number): number {
  const x = Math.sin(seed * 9301 + index * 49297 + 233) * 49297;
  return x - Math.floor(x);
}

/** Shuffle array in-place deterministically using seed (Fisher-Yates). */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(seededFloat(seed, i) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ---- Types ---------------------------------------------------------------

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

// ---- Scoring ------------------------------------------------------------

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

  if (['DONE', 'OPT_OUT', 'BOUNCED'].includes(p.status)) {
    score -= 200;
    reasons.push(`Status: ${p.status}`);
  }
  if (p.humanRequired) {
    score -= 100;
    reasons.push('Flagged for human review');
  }

  if (p.status === 'NEW') {
    score += 100;
    reasons.push('Never contacted');
  } else if (p.status === 'ACTIVE') {
    score += 60;
    reasons.push('Previously engaged');
  }

  const emailStatus = p.emailValidation?.status ?? null;
  if (emailStatus === 'VALID') {
    score += 40;
    reasons.push('Email verified ✓');
  } else if (emailStatus === 'INVALID') {
    score -= 50;
    reasons.push('Email invalid ✗');
  } else if (p.contactEmail) {
    score += 10;
    reasons.push('Email present (unvalidated)');
  }

  if (p.contactName) {
    score += 20;
    reasons.push('Named contact');
  }

  if (!p.lastContactAt) {
    score += 20;
  } else {
    const daysSince = (Date.now() - new Date(p.lastContactAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince >= RE_CONTACT_DAYS) {
      score += 20;
      reasons.push(`Last contact: ${Math.floor(daysSince)}d ago`);
    } else if (daysSince >= 7) {
      score += 15;
      reasons.push(`Last contact: ${Math.floor(daysSince)}d ago`);
    } else {
      score -= 30;
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

// ---- Diversity + date-seeded rotation -----------------------------------

const TYPE_TARGETS: Record<string, number> = {
  PHARMA: 0.40,
  BIOTECH: 0.20,
  INVESTOR: 0.30,
  OTHER: 0.10,
};

function pickDiverseBatch(
  eligible: ScoredPartner[],
  limit: number,
  dateSeed: number,
): ScoredPartner[] {
  // Group partners by score tier (quantised to 10s for wider tiers)
  const tiers = new Map<number, ScoredPartner[]>();
  for (const p of eligible) {
    const tier = Math.floor(p.score / 10) * 10;
    if (!tiers.has(tier)) tiers.set(tier, []);
    tiers.get(tier)!.push(p);
  }

  // Within each tier, shuffle deterministically by date
  const rotated: ScoredPartner[] = [];
  for (const [tier, group] of Array.from(tiers.entries()).sort((a, b) => b[0] - a[0])) {
    rotated.push(...seededShuffle(group, dateSeed + tier));
  }

  // Bucket by type
  const buckets: Record<string, ScoredPartner[]> = {
    PHARMA: [], BIOTECH: [], INVESTOR: [], OTHER: [],
  };
  for (const p of rotated) {
    const key = buckets[p.partnerType] ? p.partnerType : 'OTHER';
    buckets[key].push(p);
  }

  // Fill quota per type
  const result: ScoredPartner[] = [];
  for (const [type, fraction] of Object.entries(TYPE_TARGETS)) {
    const quota = Math.round(limit * fraction);
    result.push(...buckets[type].slice(0, quota));
    buckets[type] = buckets[type].slice(quota);
  }

  // Top-up with best remaining if under limit (re-sort remaining by score)
  if (result.length < limit) {
    const remaining = Object.values(buckets)
      .flat()
      .sort((a, b) => b.score - a.score);
    result.push(...remaining.slice(0, limit - result.length));
  }

  return result.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ---- Route ---------------------------------------------------------------

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 30);

  // Parse and validate date param
  const todayStr = new Date().toISOString().split('T')[0];
  let dateStr = searchParams.get('date') || todayStr;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) dateStr = todayStr;

  const isToday = dateStr === todayStr;
  const dateSeed = dateToSeed(dateStr);

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

    const scored  = partners.map(scorePartner);
    const eligible = scored.filter(p => p.score > 0 && p.contactEmail);
    const recommendations = pickDiverseBatch(eligible, limit, dateSeed);

    // Stats (always based on full DB, not filtered by date)
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
      verified:  partners.filter(p => p.emailValidation?.status === 'VALID').length,
      invalid:   partners.filter(p => p.emailValidation?.status === 'INVALID').length,
      unchecked: partners.filter(p => p.contactEmail && !p.emailValidation).length,
    };

    return NextResponse.json({
      date: dateStr,
      isToday,
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
