import { getAI } from './ai';
import { LANGUAGE } from './language';
import fs from 'fs';
import path from 'path';

type Region = keyof typeof LANGUAGE;
const VALID_REGIONS: Region[] = ['US', 'EU', 'CN'];

function safeRegion(r: string | undefined): Region {
  if (r && VALID_REGIONS.includes(r as Region)) return r as Region;
  return 'US';
}

export interface ProgramConfig {
  company: string;
  sender: string;
  indication: string;
  stage: string;
  programType: string;
  emailScope: string;
  goalDescription: string;
  forbiddenTopics: string;
}

export function loadProgramConfig(): ProgramConfig {
  const configPath = path.join(process.cwd(), 'data', 'program.json');
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    // Safe defaults if file is missing
    return {
      company: 'COARE Holdings',
      sender: 'Eddie Bannerman-Menson',
      indication: 'High-Grade Serous Ovarian Cancer (HGSOC)',
      stage: 'Preclinical',
      programType: 'Combination therapy',
      emailScope: 'We are reaching out to introduce COARE Holdings and a preclinical HGSOC combination program.',
      goalDescription: 'Identify potential licensing, co-development, or partnership discussions',
      forbiddenTopics: 'pricing, valuation, deal terms, safety data, toxicity, efficacy comparisons, IND timelines, regulatory strategy, clinical projections',
    };
  }
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
  const cfg = loadProgramConfig();
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

  const systemPrompt = `You are a business development writer for ${cfg.company}, a life sciences company.

YOUR TASK: Write a concise, professional introductory outreach email to a pharmaceutical/biotech partner.

ABOUT ${cfg.company.toUpperCase()}:
- Stage: ${cfg.stage}
- Program: ${cfg.indication} — ${cfg.programType}
- Goal: ${cfg.goalDescription}
- Sender: ${cfg.sender}, ${cfg.company}

APPROVED LANGUAGE ANCHOR (region: ${region}):
"${introTemplate}"
Your email must be consistent with this tone and content — this is your guardrail.
Email scope guidance: ${cfg.emailScope}

STRICT RULES — NEVER include:
- ${cfg.forbiddenTopics}
- Any claims not supportable from a ${cfg.stage.toLowerCase()} stage

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
${cfg.sender}
${cfg.company}`;

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
  const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

  // Strategy 1: direct JSON.parse
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.subject && parsed.body) {
      return { subject: parsed.subject, body: parsed.body };
    }
  } catch { /* fall through */ }

  // Strategy 2: regex extraction (handles multiline strings)
  const subjectMatch = cleaned.match(/"subject"\s*:\s*"([^"]+)"/);
  const bodyMatch = cleaned.match(/"body"\s*:\s*"([\s\S]+?)"\s*\}/);
  if (subjectMatch && bodyMatch) {
    return {
      subject: subjectMatch[1],
      body: bodyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
    };
  }

  // Strategy 3: plain text fallback
  return {
    subject: `Introduction: ${cfg.company} — ${partner.name}`,
    body: cleaned,
  };
}
