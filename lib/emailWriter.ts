import { getAI } from './ai';
import { LANGUAGE } from './language';

type Region = keyof typeof LANGUAGE;
const VALID_REGIONS: Region[] = ['US', 'EU', 'CN'];

function safeRegion(r: string | undefined): Region {
  if (r && VALID_REGIONS.includes(r as Region)) return r as Region;
  return 'US';
}

interface PartnerContext {
  name: string;
  region: string;
  interest: string;
  contactName?: string | null;
  contactTitle?: string | null;
}

interface EmailDraft {
  subject: string;
  body: string;
}

export async function generateOutreachEmail(
  partner: PartnerContext,
  researchContext: string
): Promise<EmailDraft> {
  const region = safeRegion(partner.region);
  const introTemplate = LANGUAGE[region].INTRO;

  const contactGreeting = partner.contactName
    ? `Dear ${partner.contactName.split(' ')[0]},`
    : 'Dear Sir/Madam,';

  const seniorityNote = partner.contactTitle
    ? `The recipient's title is "${partner.contactTitle}" — calibrate formality accordingly.`
    : '';

  const researchNote = researchContext
    ? `\n\nCompany research context (use to personalize, do not copy verbatim):\n${researchContext}`
    : '';

  const systemPrompt = `You are a business development writer for COARE Holdings, a life sciences company.

YOUR TASK: Write a concise, professional introductory outreach email to a pharmaceutical/biotech partner.

ABOUT COARE HOLDINGS:
- Stage: Preclinical
- Program: Ovarian cancer combination therapy
- Goal: Identify potential licensing, co-development, or partnership discussions
- Sender: Eddie Bannerman-Menson, COARE Holdings

APPROVED LANGUAGE ANCHOR (region: ${region}):
"${introTemplate}"
Your email must be consistent with this tone and content — this is your guardrail.

STRICT RULES — NEVER include:
- Pricing, valuation, deal terms, royalties
- Safety data, toxicity findings, adverse events
- Efficacy comparisons to other drugs/programs
- IND timelines, regulatory strategy, clinical projections
- Any claims not supportable from a preclinical stage

TONE BY REGION:
- US: Direct, concise, collegial
- EU: Measured, professional, slightly formal
- CN: Formal, respectful, relationship-oriented

FORMAT — return ONLY valid JSON, nothing else:
{
  "subject": "short subject line (max 10 words)",
  "body": "full email text including greeting and sign-off"
}

The body should be 3–4 short paragraphs. End with:
Best regards,
Eddie Bannerman-Menson
COARE Holdings`;

  const userPrompt = `Write a personalized introductory outreach email for:

Company: ${partner.name}
Therapeutic focus: ${partner.interest || 'oncology/life sciences'}
Region: ${region}
${seniorityNote}
${researchNote}

Opening: ${contactGreeting}`;

  const message = await getAI().messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1024,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text : '';

  // Parse JSON response — Claude sometimes uses real newlines inside JSON strings
  // so we try multiple strategies
  const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

  // Strategy 1: direct JSON.parse
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.subject && parsed.body) {
      return { subject: parsed.subject, body: parsed.body };
    }
  } catch { /* fall through */ }

  // Strategy 2: extract subject + body via regex (handles multiline strings)
  const subjectMatch = cleaned.match(/"subject"\s*:\s*"([^"]+)"/);
  const bodyMatch = cleaned.match(/"body"\s*:\s*"([\s\S]+?)"\s*\}/);
  if (subjectMatch && bodyMatch) {
    return {
      subject: subjectMatch[1],
      body: bodyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
    };
  }

  // Strategy 3: if Claude returned plain text (no JSON), use it directly
  return {
    subject: `Introduction: COARE Holdings — ${partner.name}`,
    body: cleaned,
  };
}
