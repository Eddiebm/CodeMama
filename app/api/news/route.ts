/**
 * GET /api/news
 *
 * Query params:
 *   type=company&name=Pfizer          → news for a specific company
 *   type=industry&topic=partnerships  → industry-level feed
 *   type=industry&topic=mna
 *   type=industry&topic=clinical
 *   type=industry&topic=ovarian
 *   type=industry&topic=all           (default)
 *   max=8                             → optional max items (default 8)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchCompanyNews,
  fetchIndustryNews,
  type IndustryTopic,
} from '@/lib/newsClient';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type  = searchParams.get('type') || 'industry';
  const name  = searchParams.get('name') || '';
  const topic = (searchParams.get('topic') || 'all') as IndustryTopic;
  const max   = Math.min(parseInt(searchParams.get('max') || '8', 10), 20);

  try {
    if (type === 'company') {
      if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
      const items = await fetchCompanyNews(name, max);
      return NextResponse.json({ type: 'company', name, items });
    }

    // industry
    const items = await fetchIndustryNews(topic, max);
    return NextResponse.json({ type: 'industry', topic, items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
