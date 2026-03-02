import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loadProgramConfig } from '@/lib/emailWriter';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await loadProgramConfig();
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const required = [
      'company', 'sender', 'senderTitle', 'indication', 'stage', 'programType',
      'emailScope', 'goalDescription', 'forbiddenTopics', 'clinicalContext',
      'marketContext', 'partnerHook', 'investorPitch', 'investorMarketHook', 'investorMilestones',
    ];

    for (const field of required) {
      if (!body[field] || body[field].toString().trim() === '') {
        return NextResponse.json({ error: `"${field}" is required` }, { status: 400 });
      }
    }

    await db.setting.upsert({
      where:  { key: 'program_config' },
      update: { value: JSON.stringify(body) },
      create: { key: 'program_config', value: JSON.stringify(body) },
    });

    return NextResponse.json({ saved: true, config: body });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
