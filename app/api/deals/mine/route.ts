import { NextRequest, NextResponse } from 'next/server';
import { mineDeals } from '@/lib/dealMiner';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_QUERY =
  '"licensing agreement" OR "license agreement" oncology (biotech OR pharma) site:businesswire.com OR site:prnewswire.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query: string = body.query || DEFAULT_QUERY;
    const maxArticles: number = Math.min(body.maxArticles ?? 10, 20);

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not set.' },
        { status: 503 }
      );
    }

    const articles = await mineDeals(query, maxArticles);

    // Summary stats
    const totalContacts = articles.reduce((n, a) => n + a.contacts.length, 0);

    return NextResponse.json({ articles, totalContacts });
  } catch (err: any) {
    console.error('Deal mining error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
