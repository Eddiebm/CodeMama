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
  senderTitle: string;
  indication: string;
  stage: string;
  programType: string;
  emailScope: string;
  goalDescription: string;
  forbiddenTopics: string;
  clinicalContext: string;
  marketContext: string;
  partnerHook: string;
}

export function loadProgramConfig(): ProgramConfig {
  const configPath = path.join(process.cwd(), 'data', 'program.json');
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return {
      company: 'COARE Holdings',
      sender: 'Eddie Bannerman-Menson',
      senderTitle: 'Executive Vice President, Business Development',
      indication: 'High-Grade Serous Ovarian Cancer (HGSOC)',
      stage: 'Preclinical',
      programType: 'Combination therapy',
      emailScope: 'We are reaching out to introduce COARE Holdings and a preclinical HGSOC combination program.',
      goalDescription: 'Identify potential licensing, co-development, or partnership discussions',
      forbiddenTopics: 'pricing, valuation, deal terms, safety data, toxicity, efficacy comparisons, IND timelines, regulatory strategy',
      clinicalContext: 'Approximately 80% of women with HGSOC will relapse following first-line therapy. Median survival after platinum-resistant relapse remains under 12 months.',
      marketContext: 'HGSOC accounts for ~314,000 new diagnoses globally each year and over 207,000 deaths. The global ovarian cancer therapeutics market is projected to exceed $3B by 2030.',
      partnerHook: 'Where the partner has an oncology program, reference strategic alignment. Where less obvious, frame HGSOC as an adjacency to their existing oncology franchise.',
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
    ? `Recipient title: "${partner.contactTitle}" — write peer-to-peer at that seniority level.`
    : '';

  const researchNote = researchContext
    ? `\nPartner research (use selectively to personalise — do not reproduce verbatim):\n${researchContext}`
    : '';

  const systemPrompt = `You are ${cfg.sender}, ${cfg.senderTitle} at ${cfg.company}.

You are writing a direct, senior-level business development email to a potential pharmaceutical or biotech partner. Your voice is authoritative, commercially fluent, and concise — the way a seasoned EVP BD writes, not a junior sales rep. You get to the point, demonstrate sector knowledge, and make the reader feel you understand their world.

ABOUT THE PROGRAM:
- Company: ${cfg.company}
- Indication: ${cfg.indication}
- Type: ${cfg.programType}
- Stage: ${cfg.stage}
- BD objective: ${cfg.goalDescription}

CLINICAL CONTEXT (weave in 1–2 of these facts naturally — do not list them all):
${cfg.clinicalContext}

MARKET CONTEXT (use selectively to frame commercial opportunity):
${cfg.marketContext}

PARTNER PERSONALISATION GUIDANCE:
${cfg.partnerHook}

APPROVED LANGUAGE ANCHOR — your email must stay consistent with this register (region: ${region}):
"${introTemplate}"

GUARDRAILS — never include:
${cfg.forbiddenTopics}
Never make claims that cannot be supported at ${cfg.stage.toLowerCase()} stage.

STYLE RULES:
- 3–4 tight paragraphs, no bullet points in the email body
- Open with a clinical or market insight that creates urgency, not a generic "I hope you are well"
- Reference what you know about the partner's therapeutic focus to show relevance
- Close with a specific, low-friction ask (a 20-minute call, not "let me know if interested")
- Region tone — US: direct and collegial; EU: measured and formal; CN: respectful and relationship-first

SIGN-OFF (use exactly):
Best regards,
${cfg.sender}
${cfg.senderTitle}
${cfg.company}

FORMAT — return ONLY valid JSON, nothing else:
{"subject": "...", "body": "..."}`;

  const userPrompt = `Write the outreach email for:

Company: ${partner.name}
Therapeutic focus: ${partner.interest || 'oncology/life sciences'}
Region: ${region}
${seniorityNote}
${researchNote}

Open with: ${contactGreeting}`;

  const message = await getAI().messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1200,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text : '';
  const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

  // Strategy 1: direct JSON.parse
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.subject && parsed.body) {
      return { subject: parsed.subject, body: parsed.body };
    }
  } catch { /* fall through */ }

  // Strategy 2: regex extraction (handles real newlines inside JSON strings)
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
    subject: `${cfg.indication} BD Opportunity — ${cfg.company}`,
    body: cleaned,
  };
}
