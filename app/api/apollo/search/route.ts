import { NextRequest, NextResponse } from 'next/server';
import { searchPeople } from '@/lib/apollo';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { titles, industries, locations, keywords, page, perPage } = await req.json();
    const data = await searchPeople({ titles, industries, locations, keywords, page, perPage });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
