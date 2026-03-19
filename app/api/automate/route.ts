/**
 * POST /api/automate
 * ─────────────────────────────────────────────────────────────────────────────
 * Trigger the full email automation pipeline.
 * Called automatically by Vercel Cron (see vercel.json) and can also be
 * triggered manually from any HTTP client.
 *
 * Authentication: set AUTOMATION_SECRET in your Vercel env vars.
 * Pass it as:  Authorization: Bearer <AUTOMATION_SECRET>
 *              OR x-automation-secret: <AUTOMATION_SECRET>
 *
 * Example manual trigger:
 *   curl -X POST https://code-mama.vercel.app/api/automate \
 *     -H "Authorization: Bearer YOUR_SECRET"
 */

import { NextRequest, NextResponse } from 'next/server';
import { runFullAutomation } from '@/lib/autoSender';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Pro allows up to 300s; Hobby max is 60s

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.AUTOMATION_SECRET;
  // If no secret is set, only allow in development
  if (!secret) {
    return process.env.NODE_ENV === 'development';
  }

  // Check Authorization header
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader === `Bearer ${secret}`) return true;

  // Check custom header (used by Vercel Cron)
  const customHeader = req.headers.get('x-automation-secret') || '';
  if (customHeader === secret) return true;

  return false;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[automate] Pipeline triggered at', new Date().toISOString());

  try {
    const summary = await runFullAutomation();

    console.log('[automate] Complete:', JSON.stringify(summary));

    return NextResponse.json(summary);
  } catch (err: any) {
    console.error('[automate] Fatal error:', err.message);
    return NextResponse.json(
      { ok: false, error: err.message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

// Allow Vercel Cron to call via GET as well (cron jobs use GET by default)
export async function GET(req: NextRequest) {
  return POST(req);
}
