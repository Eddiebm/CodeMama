import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  const requiredPassword = process.env.APP_PASSWORD;
  if (!requiredPassword) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  if (!password || password !== requiredPassword) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const sessionToken = process.env.SESSION_SECRET;
  if (!sessionToken) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set('gpce_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
  return res;
}
