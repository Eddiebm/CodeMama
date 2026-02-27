import { db } from './db';
import { classifyInbound } from './classifier';
import { LANGUAGE } from './language';

type Region = keyof typeof LANGUAGE;
const VALID_REGIONS: Region[] = ['US', 'EU', 'CN'];

function safeRegion(r: string | undefined): Region {
  if (r && VALID_REGIONS.includes(r as Region)) return r as Region;
  return 'US';
}

export async function handleInbound(partnerId: string, text: string) {
  const partner = await db.partner.findUnique({ where: { id: partnerId } });
  if (!partner) throw new Error('Partner not found');

  await db.message.create({
    data: { partnerId, direction: 'INBOUND', body: text },
  });

  const classification = classifyInbound(text);

  if (classification === 'HUMAN_REQUIRED') {
    await db.partner.update({
      where: { id: partnerId },
      data: { humanRequired: true, status: 'HUMAN_REQUIRED' },
    });
    return { action: 'STOP', reason: 'Complexity keyword detected. Escalate to human.' };
  }

  const region = safeRegion(partner.region);
  const draftBody = LANGUAGE[region].ACK;

  const draft = await db.draft.create({
    data: { partnerId, region, category: 'ACK', body: draftBody, status: 'PENDING' },
  });

  return { action: 'DRAFT_CREATED', draftId: draft.id, draft: draftBody, region };
}
