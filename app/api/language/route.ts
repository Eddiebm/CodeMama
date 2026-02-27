import { NextResponse } from 'next/server';
import { LANGUAGE } from '@/lib/language';

export async function GET() {
  return NextResponse.json(LANGUAGE);
}
