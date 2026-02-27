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
  investorPitch: string;
  investorMarketHook: string;
  investorMilestones: string;
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
      marketContext: 'HGSOC accounts for ~314,000 new diagnoses globally each year. The global ovarian cancer therapeutics market is projected to exceed $3B by 2030.',
      partnerHook: 'Where the partner has an oncology program, reference strategic alignment.',
      investorPitch: 'COARE represents a capital-efficient preclinical opportunity in a high-value indication with validated biology and clear commercial precedents.',
      investorMarketHook: 'With the global ovarian cancer market projected to exceed $3B by 2030, acquirers are actively seeking differentiated preclinical programs.',
      investorMilestones: 'Key near-term value inflection points include IND-enabling studies and first-in-human readouts.',
    };
  }
}

interface PartnerContext {
  name: string;
  region: string;
  interest: string;
  partnerType: string;
  contactName?: string | null;
  contactTitle?: string | null;
}

interface EmailDraft {
  subject: string;
  body: string;
}

// ---- Cultural intelligence notes injected into every prompt ---------------
const CN_CULTURE_NOTE = `
CRITICAL — CHINESE BUSINESS CULTURE RULES (region = CN):
- Address by FAMILY NAME with title. Never use a first name alone (e.g., "Dear Director Chen", not "Dear Wei").
- Hierarchy is paramount. Do not skip ranks or contact junior staff before senior. If contact title is unknown, address formally: "Dear Colleague".
- Build relationship before business: open with respect for their organisation, not a hard pitch.
- Patience signals trustworthiness — do NOT pressure or rush to the ask.
- Avoid direct references to competition, cost-pressure, or urgency framing — this is seen as disrespectful.
- Use indirect language for the ask: "we would be honoured to arrange a brief introduction" rather than "I'd welcome a 20-minute call".
- One email is never enough — relationship building in China is a long game. Acknowledge this respectfully.
- Never reference pricing, valuation, or financial terms (even more strictly than other regions).`;

function culturalNote(region: Region): string {
  return region === 'CN' ? CN_CULTURE_NOTE : '';
}

function buildPharmaPrompt(cfg: ProgramConfig, region: Region, partner: PartnerContext, introTemplate: string): string {
  return `You are ${cfg.sender}, ${cfg.senderTitle} at ${cfg.company}.

You are writing a direct, senior-level business development email to a pharma or biotech partner. Your voice is authoritative, commercially fluent, and concise — a seasoned EVP BD writing peer-to-peer, not a sales rep. You demonstrate sector knowledge and make the reader feel you understand their pipeline and therapeutic strategy.

ABOUT THE PROGRAM:
- Company: ${cfg.company}
- Indication: ${cfg.indication}
- Type: ${cfg.programType}
- Stage: ${cfg.stage}
- BD objective: ${cfg.goalDescription}

CLINICAL CONTEXT (weave in 1–2 facts naturally — do not list them all):
${cfg.clinicalContext}

MARKET CONTEXT (use to frame commercial opportunity):
${cfg.marketContext}

PARTNER PERSONALISATION:
${cfg.partnerHook}

APPROVED LANGUAGE ANCHOR (region: ${region}):
"${introTemplate}"

GUARDRAILS — never include: ${cfg.forbiddenTopics}
Never make claims unsupportable at ${cfg.stage.toLowerCase()} stage.

STYLE:
- 3–4 tight paragraphs, no bullet points
- Open with clinical urgency or unmet need — not "I hope this finds you well"
- Reference the partner's therapeutic focus to show you've done your homework
- Close with a specific low-friction ask (a 20-minute call, not "let me know if interested")
- Region tone: US = direct/collegial; EU = measured/formal; CN = respectful/relationship-first
${culturalNote(region)}
SIGN-OFF (exact):
Best regards,
${cfg.sender}
${cfg.senderTitle}
${cfg.company}

FORMAT — return ONLY valid JSON: {"subject": "...", "body": "..."}`;
}

function buildInvestorPrompt(cfg: ProgramConfig, region: Region, partner: PartnerContext, introTemplate: string): string {
  return `You are ${cfg.sender}, ${cfg.senderTitle} at ${cfg.company}.

You are writing to a venture capital or investment firm. Your audience thinks in terms of market opportunity, capital efficiency, risk-adjusted returns, and exit potential — not therapeutic alignment. Speak their language: portfolio fit, addressable market, milestones to value, and the strategic M&A backdrop.

ABOUT THE OPPORTUNITY:
- Company: ${cfg.company}
- Asset: ${cfg.indication} — ${cfg.programType}
- Stage: ${cfg.stage}

INVESTMENT THESIS (use selectively, in your own words):
${cfg.investorPitch}

MARKET & EXIT CONTEXT (weave in 1–2 points naturally):
${cfg.investorMarketHook}

KEY MILESTONES (can reference to frame near-term catalysts):
${cfg.investorMilestones}

MARKET SIZE ANCHOR:
${cfg.marketContext}

APPROVED LANGUAGE ANCHOR (region: ${region}):
"${introTemplate}"

GUARDRAILS — never include: ${cfg.forbiddenTopics}
Never make unsubstantiated claims about returns, valuations, or exit multiples.

STYLE:
- 3–4 tight paragraphs, no bullet points
- Open by framing the commercial problem or market backdrop — not with a product pitch
- Reference what you know about the fund's therapeutic or stage focus to show fit
- Speak to capital efficiency: what can be achieved with the next tranche, what de-risks the asset
- Close with a specific, low-friction ask (a 20-minute call)
- Region tone: US = direct/collegial; EU = measured/formal; CN = respectful/relationship-first
${culturalNote(region)}
SIGN-OFF (exact):
Best regards,
${cfg.sender}
${cfg.senderTitle}
${cfg.company}

FORMAT — return ONLY valid JSON: {"subject": "...", "body": "..."}`;
}

// ---- Follow-up prompt: NUDGE (no response received) ----------------------
function buildNudgePrompt(
  cfg: ProgramConfig,
  region: Region,
  partner: PartnerContext,
  followUpTemplate: string,
  daysSince: number,
  followUpNumber: number,
  isInvestor: boolean,
): string {
  const cnPatience = region === 'CN'
    ? '\nFor this Chinese recipient: be especially patient and respectful. Do not pressure. Frame this follow-up as maintaining respectful contact, not chasing a response. The subject line should be soft and non-presumptuous.'
    : '';

  return `You are ${cfg.sender}, ${cfg.senderTitle} at ${cfg.company}.

You previously sent an introductory email to ${partner.name} about ${cfg.indication} — ${cfg.programType} (${isInvestor ? 'investment opportunity' : 'BD/licensing opportunity'}). It has been ${daysSince} days with NO RESPONSE. This is follow-up #${followUpNumber}.

YOUR TASK: Write a brief NUDGE email — they haven't replied yet.

NUDGE RULES:
- 2–3 short paragraphs MAXIMUM — shorter than the original
- Do NOT start with "I hope this email finds you well"
- Open by acknowledging they are busy and may have missed the note — gracious, not passive-aggressive
- Reference the prior outreach in one sentence. Do not repeat the full pitch.
- Restate ONLY the single most compelling hook — one clinical/market point or milestone
- End with an ultra low-friction ask: softer than before ("even a 15-minute exchange when convenient")
- Subject line must start with "Re: " and be softer than the original
- Tone: US = brief, direct; EU = measured, gracious; CN = highly respectful, patient, no pressure
${cnPatience}
APPROVED LANGUAGE (region: ${region}):
"${followUpTemplate}"

GUARDRAILS — never include: ${cfg.forbiddenTopics}
${culturalNote(region)}
SIGN-OFF (exact):
Best regards,
${cfg.sender}
${cfg.senderTitle}
${cfg.company}

FORMAT — return ONLY valid JSON: {"subject": "...", "body": "..."}`;
}

// ---- Follow-up prompt: ADVANCE (they responded, move conversation forward) ---
function buildAdvancePrompt(
  cfg: ProgramConfig,
  region: Region,
  partner: PartnerContext,
  responseNote: string,
  isInvestor: boolean,
): string {
  const cnContinuity = region === 'CN'
    ? '\nFor this Chinese recipient: express genuine gratitude and honour for their response. Be warm but not effusive. Reinforce the long-term relationship angle. Propose next steps with flexibility — do not dictate timing.'
    : '';

  return `You are ${cfg.sender}, ${cfg.senderTitle} at ${cfg.company}.

A partner at ${partner.name} has RESPONDED to your initial outreach about ${cfg.indication} — ${cfg.programType} (${isInvestor ? 'investment opportunity' : 'BD/licensing opportunity'}).

WHAT THEY SAID / CONTEXT:
"${responseNote || 'They responded positively / expressed interest'}"

YOUR TASK: Write a brief, warm ADVANCE email — they replied; now move the conversation forward.

ADVANCE RULES:
- 2–3 short paragraphs MAXIMUM
- Open by thanking them for their response — genuine and warm, not formulaic
- Acknowledge what they said (reference the context note above, naturally)
- Advance the conversation: propose a specific next step (a call, a deck, a brief meeting)
- For a call: suggest 2 specific time windows (do not just say "let me know when you are free")
- Attach deck if appropriate — mention it if you will be including materials
- Subject line: start with "Re: " to thread the conversation
- Tone: US = warm, direct; EU = measured, professional; CN = respectful, grateful, flexible on timing
${cnContinuity}
GUARDRAILS — never include: ${cfg.forbiddenTopics}
${culturalNote(region)}
SIGN-OFF (exact):
Best regards,
${cfg.sender}
${cfg.senderTitle}
${cfg.company}

FORMAT — return ONLY valid JSON: {"subject": "...", "body": "..."}`;
}

// ---- Shared Claude call + JSON parser ------------------------------------

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const message = await getAI().messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1200,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });
  return message.content[0].type === 'text' ? message.content[0].text : '';
}

function parseEmailResponse(raw: string, fallbackSubject: string): EmailDraft {
  const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.subject && parsed.body) return { subject: parsed.subject, body: parsed.body };
  } catch { /* fall through */ }

  const subjectMatch = cleaned.match(/"subject"\s*:\s*"([^"]+)"/);
  const bodyMatch    = cleaned.match(/"body"\s*:\s*"([\s\S]+?)"\s*\}/);
  if (subjectMatch && bodyMatch) {
    return {
      subject: subjectMatch[1],
      body: bodyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
    };
  }
  return { subject: fallbackSubject, body: cleaned };
}

// ---- Greeting helper (CN-aware) ------------------------------------------

function buildGreeting(partner: PartnerContext, region: Region): string {
  if (!partner.contactName) return 'Dear Sir/Madam,';
  const parts = partner.contactName.trim().split(/\s+/);
  if (region === 'CN') {
    // CN: family name first in Chinese names, but we may have Western-order names.
    // Use full name + title if known, otherwise last name only.
    const lastName = parts[parts.length - 1];
    return `Dear ${lastName},`;
  }
  return `Dear ${parts[0]},`;
}

// ---- Public: initial outreach email ---------------------------------------

export async function generateOutreachEmail(
  partner: PartnerContext,
  researchContext: string
): Promise<EmailDraft> {
  const cfg = loadProgramConfig();
  const region = safeRegion(partner.region);
  const introTemplate = LANGUAGE[region].INTRO;
  const isInvestor = partner.partnerType === 'INVESTOR';

  const contactGreeting = buildGreeting(partner, region);
  const seniorityNote = partner.contactTitle
    ? `Recipient title: "${partner.contactTitle}" — write peer-to-peer at that seniority level.`
    : '';
  const researchNote = researchContext
    ? `\nPartner research (use selectively — do not reproduce verbatim):\n${researchContext}`
    : '';

  const systemPrompt = isInvestor
    ? buildInvestorPrompt(cfg, region, partner, introTemplate)
    : buildPharmaPrompt(cfg, region, partner, introTemplate);

  const audienceTag = isInvestor ? 'venture capital / investment firm' : `${partner.partnerType.toLowerCase()} company`;

  const userPrompt = `Write the outreach email for:

Recipient organisation: ${partner.name} (${audienceTag})
Therapeutic / investment focus: ${partner.interest || 'oncology/life sciences'}
Region: ${region}
${seniorityNote}
${researchNote}

Open with: ${contactGreeting}`;

  const raw = await callClaude(systemPrompt, userPrompt);
  const fallback = `${cfg.indication} — ${isInvestor ? 'Investment Opportunity' : 'BD Opportunity'} | ${cfg.company}`;
  return parseEmailResponse(raw, fallback);
}

// ---- Public: nudge email (no reply) ---------------------------------------

export async function generateFollowUpEmail(
  partner: PartnerContext,
  daysSince: number,
  followUpNumber: number,
): Promise<EmailDraft> {
  const cfg = loadProgramConfig();
  const region = safeRegion(partner.region);
  const followUpTemplate = LANGUAGE[region].FOLLOWUP;
  const isInvestor = partner.partnerType === 'INVESTOR';

  const systemPrompt = buildNudgePrompt(
    cfg, region, partner, followUpTemplate,
    daysSince, followUpNumber, isInvestor,
  );

  const contactGreeting = buildGreeting(partner, region);
  const userPrompt = `Write the nudge/follow-up email for:

Recipient organisation: ${partner.name}
Therapeutic / investment focus: ${partner.interest || 'oncology/life sciences'}
Region: ${region}
${partner.contactTitle ? `Recipient title: "${partner.contactTitle}"` : ''}

Open with: ${contactGreeting}`;

  const raw = await callClaude(systemPrompt, userPrompt);
  const fallback = `Re: ${cfg.indication} — ${isInvestor ? 'Investment Opportunity' : 'BD Opportunity'} | ${cfg.company}`;
  return parseEmailResponse(raw, fallback);
}

// ---- Public: advance email (they responded — move forward) ---------------

export async function generateAdvanceEmail(
  partner: PartnerContext,
  responseNote: string,
): Promise<EmailDraft> {
  const cfg = loadProgramConfig();
  const region = safeRegion(partner.region);
  const isInvestor = partner.partnerType === 'INVESTOR';

  const systemPrompt = buildAdvancePrompt(
    cfg, region, partner, responseNote, isInvestor,
  );

  const contactGreeting = buildGreeting(partner, region);
  const userPrompt = `Write the advance/reply email for:

Recipient organisation: ${partner.name}
Therapeutic / investment focus: ${partner.interest || 'oncology/life sciences'}
Region: ${region}
${partner.contactTitle ? `Recipient title: "${partner.contactTitle}"` : ''}

Open with: ${contactGreeting}`;

  const raw = await callClaude(systemPrompt, userPrompt);
  const fallback = `Re: ${cfg.indication} — ${isInvestor ? 'Investment Opportunity' : 'BD Opportunity'} | ${cfg.company}`;
  return parseEmailResponse(raw, fallback);
}
