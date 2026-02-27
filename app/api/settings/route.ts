import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { loadProgramConfig } from '@/lib/emailWriter';

export const dynamic = 'force-dynamic';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'program.json');

export async function GET() {
  return NextResponse.json(loadProgramConfig());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields
    const required = ['company', 'sender', 'senderTitle', 'indication', 'stage', 'programType', 'emailScope', 'goalDescription', 'forbiddenTopics', 'clinicalContext', 'marketContext', 'partnerHook', 'investorPitch', 'investorMarketHook', 'investorMilestones'];
    for (const field of required) {
      if (!body[field] || body[field].toString().trim() === '') {
        return NextResponse.json({ error: `"${field}" is required` }, { status: 400 });
      }
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(body, null, 2), 'utf-8');
    return NextResponse.json({ saved: true, config: body });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
