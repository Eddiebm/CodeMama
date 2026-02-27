import { NextResponse } from 'next/server';
import { LANGUAGE } from '@/lib/language';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(LANGUAGE);
}
