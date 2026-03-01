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

export interface PartnerContext {
  name: string;
  region: string;
  interest: string;
  partnerType: string;
  contactName?: string | null;
  contactTitle?: string | null;
}

export interface AccountContext {
  previousOutreachCount: number;   // total SENT drafts to this company
  lastSentAt?: string;             // ISO date of most recent sent draft
  previousSubjects?: string[];     // subjects of prior sent emails (for non-repetition)
}

interface EmailDraft {
  subject: string;
  body: string;
}

// ── Greeting builder ─────────────────────────────────────────────────────────

function buildGreeting(partner: PartnerContext, region: Region): string {
  if (!partner.contactName) return 'Dear Sir/Madam,';
  const parts = partner.contactName.trim().split(/\s+/);
  if (region === 'CN') {
    const lastName = parts[parts.length - 1];
    return `Dear ${lastName},`;
  }
  return `Dear ${parts[0]},`;
}

// ── SYSTEM PROMPT: Global BD Control Bundle role + overlays ─────────────────

function buildSystemPrompt(
  cfg: ProgramConfig,
  region: Region,
  partnerType: string,
  account: AccountContext,
): string {
  const isCN       = region === 'CN';
  const isInvestor = partnerType === 'INVESTOR';

  // ── 0. Global role ──────────────────────────────────────────────────────
  const globalRole = `
You are acting as a senior pharmaceutical business development executive with 20+ years of experience in oncology licensing, co-development, and M&A.

You have:
- Led global partnering discussions across the US, EU, and Asia
- Participated in buy-side and sell-side diligence for preclinical and clinical oncology assets
- Seen multiple promising programs fail due to durability limits, toxicity, or commercial misalignment
- A strong preference for restrained, precise, and credible language

Your objective is not to pitch. Your objective is to open credible, senior-level conversations.

You:
- Avoid hype, absolutes, and promotional language
- Speak in terms of unmet need, ceilings of standard of care, and development reality
- Never oversell preclinical data
- Invite dialogue rather than persuasion

You are writing on behalf of: ${cfg.sender}, ${cfg.senderTitle}, ${cfg.company}.
`.trim();

  // ── 5. Non-negotiable compliance ────────────────────────────────────────
  const compliance = `
NON-NEGOTIABLE COMPLIANCE — regardless of recipient, NEVER include:
- Pricing or reimbursement
- Valuation or deal terms
- Safety, toxicity, or comparative efficacy data
- IND timelines or regulatory strategy
- Clinical projections or probability statements
- Promotional adjectives: exciting, breakthrough, transformative, revolutionary, game-changing
- Mechanistic explanations beyond high-level framing
- Any implied claims of superiority, efficacy, or outcomes
- Language that sounds like fundraising or sales outreach

Also forbidden: ${cfg.forbiddenTopics}
`.trim();

  // ── China overlay (sections 6–10) ───────────────────────────────────────
  const chinaOverlay = isCN ? `
CHINA / GREATER CHINA REGIONAL OVERLAY — applies because recipient region is CN:

TONE: Direct, serious, respectful of hierarchy. No idioms, humor, or rhetorical flourishes. Professional neutrality throughout.

CONTENT EMPHASIS:
- Emphasize: large patient populations, unmet need, late-line disease settings, combination strategies, regional co-development potential, alignment with existing oncology franchises
- De-emphasize: founder narratives, speculative innovation language, Western venture-style enthusiasm

LANGUAGE: Use "strategic alignment", "regional development interest", "shared focus on execution".
Do NOT reference: deal terms, regulatory shortcuts, geopolitical dynamics, comparisons between markets.

ADDRESS: By family name with title (e.g., "Dear Director Chen"). Never first name alone. If title unknown: "Dear Colleague".
PATIENCE: One email is not enough. Acknowledge this respectfully. Never pressure or rush.

PREFERRED CLOSING: "We would welcome the opportunity to explore whether there is strategic alignment for discussion."

ADDITIONAL PROHIBITIONS (China): No informal language, no over-personalisation, no accelerated approval path suggestions, no national competition references.
`.trim() : '';

  // ── Pharma/Biotech overlay (sections 17–19) ─────────────────────────────
  const pharmaOverlay = !isInvestor ? `
PHARMA / BIOTECH PARTNER OVERLAY:

TONE: Clinically literate, commercially realistic, respectful of internal diligence processes.
Assume the recipient manages multiple assets, is sensitive to development risk, and values clarity over novelty.

CONTENT EMPHASIS:
- Where standard of care has reached a ceiling
- Why late-line HGSOC remains unresolved despite existing approvals
- Combination strategies as complementary, not disruptive
- Clear adjacency to existing oncology franchises

SIGNAL LANGUAGE: "portfolio adjacency", "downstream of current standards", "disciplined combination strategy", "aligned with late-line development realities"

PREFERRED CLOSING: "We would welcome a brief discussion to explore whether there is strategic or portfolio alignment."
`.trim() : '';

  // ── Investor overlay (sections 20–22) ───────────────────────────────────
  const investorOverlay = isInvestor ? `
INVESTOR OVERLAY — recipient is a VC, growth equity, family office, or strategic investor:

TONE: Rational, risk-aware, confident but restrained. Speak in terms of portfolio fit, capital efficiency, value inflection points, and strategic M&A backdrop.
Assume they have seen many preclinical oncology programs and value credible exit pathways over vision alone.

CONTENT EMPHASIS:
- Capital efficiency in preclinical development
- Validated disease area with persistent unmet need
- Combination approach as a de-risking strategy
- Clearly defined value inflection points (IND-enabling, first-in-human)

MARKET CONTEXT (use selectively): ${cfg.investorMarketHook}
MILESTONES (frame near-term catalysts): ${cfg.investorMilestones}

Do NOT discuss: valuations, exit timing promises, comparative deal examples.

PREFERRED CLOSING: "We would welcome an initial discussion to assess mutual interest and strategic fit."
`.trim() : '';

  // ── Account context (section 10–16) ─────────────────────────────────────
  const accountCtx = account.previousOutreachCount > 0 ? `
ACCOUNT CONTEXT — this company has been contacted before:
- Total prior outreach emails sent: ${account.previousOutreachCount}
- Last contact: ${account.lastSentAt ? new Date(account.lastSentAt).toDateString() : 'unknown'}
${account.previousSubjects?.length ? `- Prior subject lines used: ${account.previousSubjects.map(s => `"${s}"`).join(', ')}` : ''}

ACCOUNT DISCIPLINE:
- No two emails to the same company may share more than 50% overlapping phrasing
- Do not repeat the same hook, opening, or closing as previous emails
- This is a follow-up or continuation — adjust tone to reflect the relationship stage
`.trim() : '';

  const parts = [globalRole, compliance, chinaOverlay, pharmaOverlay, investorOverlay, accountCtx]
    .filter(Boolean)
    .join('\n\n---\n\n');

  return parts;
}

// ── USER PROMPT: context + drafting + quality gate + seniority check ─────────

function buildUserPrompt(
  cfg: ProgramConfig,
  region: Region,
  partner: PartnerContext,
  greeting: string,
  mode: 'initial' | 'nudge' | 'advance',
  extras: {
    researchContext?: string;
    daysSince?: number;
    followUpNumber?: number;
    responseNote?: string;
    introTemplate?: string;
    followUpTemplate?: string;
  }
): string {
  const isInvestor = partner.partnerType === 'INVESTOR';
  const audienceType = isInvestor
    ? 'venture capital / investment firm'
    : `${partner.partnerType.toLowerCase()} company`;

  const seniorityNote = partner.contactTitle
    ? `Recipient title: "${partner.contactTitle}" — write peer-to-peer at that seniority level.`
    : '';

  const researchNote = extras.researchContext
    ? `\nPartner research (use selectively — do not reproduce verbatim):\n${extras.researchContext}`
    : '';

  const approvedAnchor = extras.introTemplate
    ? `\nApproved opening language anchor: "${extras.introTemplate}"`
    : '';

  // Mode-specific instructions
  let modeInstructions = '';
  if (mode === 'initial') {
    modeInstructions = `
TASK: Write the initial outreach email.

FORMAT RULES:
- 3–4 tight paragraphs, no bullet points
- Open with clinical urgency or unmet need — NOT "I hope this finds you well"
- Reference the recipient's therapeutic focus to show you've done your homework
- Include at most ONE clinical fact and at most ONE market/strategic fact
- Close with a specific, low-friction ask (a 20-minute call)
- Region tone: US = direct/collegial; EU = measured/formal; CN = respectful/relationship-first
${approvedAnchor}

PROGRAM CONTEXT:
- Indication: ${cfg.indication}
- Type: ${cfg.programType}
- Stage: ${cfg.stage}
- BD objective: ${cfg.goalDescription}
- Clinical context (select max 1 fact): ${cfg.clinicalContext}
- Market context (select max 1 fact): ${cfg.marketContext}
`.trim();
  }

  if (mode === 'nudge') {
    const cnNote = region === 'CN'
      ? '\nFor this Chinese recipient: be especially patient and respectful. Do not pressure. Frame as maintaining respectful contact, not chasing. Subject line should be soft and non-presumptuous.'
      : '';
    modeInstructions = `
TASK: Write a NUDGE / FOLLOW-UP email. They have NOT responded. This is follow-up #${extras.followUpNumber ?? 1}. It has been ${extras.daysSince ?? 7} days since the last email.

FORMAT RULES:
- 2–3 short paragraphs MAXIMUM — shorter than the original
- Do NOT start with "I hope this email finds you well"
- Open by acknowledging they are busy and may have missed the note — gracious, not passive-aggressive
- Reference the prior outreach in ONE sentence only. Do not repeat the full pitch.
- Restate ONLY the single most compelling hook — one clinical or strategic point
- Close with an ultra low-friction ask — softer than before ("even a 15-minute exchange when convenient")
- Subject line must start with "Re: " and be softer than the original
- Tone: US = brief, direct; EU = measured, gracious; CN = highly respectful, patient, no pressure
${cnNote}
${extras.followUpTemplate ? `Approved follow-up language anchor: "${extras.followUpTemplate}"` : ''}
`.trim();
  }

  if (mode === 'advance') {
    const cnNote = region === 'CN'
      ? '\nFor this Chinese recipient: express genuine gratitude and honour for their response. Be warm but not effusive. Reinforce the long-term relationship angle. Propose next steps with flexibility — do not dictate timing.'
      : '';
    modeInstructions = `
TASK: Write an ADVANCE email. They HAVE responded. Move the conversation forward.

WHAT THEY SAID / CONTEXT:
"${extras.responseNote || 'They responded positively and expressed interest in learning more.'}"

FORMAT RULES:
- 2–3 short paragraphs MAXIMUM
- Open by thanking them genuinely — not formulaic
- Acknowledge what they said, naturally
- Propose a specific next step: a call with 2 suggested time windows, or offer to share materials
- Subject line starts with "Re: " to thread the conversation
- Tone: US = warm, direct; EU = measured, professional; CN = respectful, grateful, flexible on timing
${cnNote}
`.trim();
  }

  // Quality gate + seniority scoring (sections 3–4) — mandatory before output
  const qualityGate = `
MANDATORY BEFORE OUTPUTTING:

STEP 1 — SILENT PRE-WRITE REASONING (do not display):
- Classify the recipient: pharma BD / biotech executive / strategic investor / regional partner
- Determine why they would plausibly care about late-line HGSOC
- Select exactly ONE clinical fact (if initial) and at most ONE market fact
- Decide which sentence signals seniority and which invites response without pitching

STEP 2 — DRAFT the email following all rules above.

STEP 3 — QUALITY GATE (internal review — FAIL = rewrite):
FAIL immediately if the draft contains:
- Promotional adjectives (exciting, breakthrough, transformative, revolutionary)
- Mechanistic explanations beyond high-level framing
- Implied claims of efficacy, safety, or competitive superiority
- Language that sounds like a pitch or fundraising rather than a senior BD invitation
- Any content from the forbidden list

PASS only if:
- Tone reflects 20+ years of senior pharmaceutical BD experience
- Language acknowledges clinical and commercial reality
- Email invites discussion rather than demands interest
- Sender sounds credible to a board member or licensing head

If FAIL: rewrite until PASS criteria are met.

STEP 4 — SENIORITY SCORE: Rate the final email 0.0–1.0 for how strongly it sounds like a 20-year pharma BD veteran wrote it. If below 0.90, revise until it reaches 0.90.

STEP 5 — OUTPUT: Return ONLY valid JSON with the final passing email:
{"subject": "...", "body": "..."}

Do not output reasoning, scores, or explanations — JSON only.
`.trim();

  return `
RECIPIENT:
- Organisation: ${partner.name} (${audienceType})
- Therapeutic / investment focus: ${partner.interest || 'oncology / life sciences'}
- Region: ${region}
${seniorityNote}
${researchNote}

${modeInstructions}

Open the email with: ${greeting}

${qualityGate}
`.trim();
}

// ── Claude call ──────────────────────────────────────────────────────────────

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const message = await getAI().messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
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

// ── Public: initial outreach email ───────────────────────────────────────────

export async function generateOutreachEmail(
  partner: PartnerContext,
  researchContext: string,
  account: AccountContext = { previousOutreachCount: 0 },
): Promise<EmailDraft> {
  const cfg    = loadProgramConfig();
  const region = safeRegion(partner.region);
  const greeting = buildGreeting(partner, region);

  const systemPrompt = buildSystemPrompt(cfg, region, partner.partnerType, account);
  const userPrompt   = buildUserPrompt(cfg, region, partner, greeting, 'initial', {
    researchContext,
    introTemplate: LANGUAGE[region].INTRO,
  });

  const raw = await callClaude(systemPrompt, userPrompt);
  const fallback = `${cfg.indication} — ${partner.partnerType === 'INVESTOR' ? 'Investment Opportunity' : 'BD Opportunity'} | ${cfg.company}`;
  return parseEmailResponse(raw, fallback);
}

// ── Public: nudge email (no reply received) ──────────────────────────────────

export async function generateFollowUpEmail(
  partner: PartnerContext,
  daysSince: number,
  followUpNumber: number,
  account: AccountContext = { previousOutreachCount: 1 },
): Promise<EmailDraft> {
  const cfg    = loadProgramConfig();
  const region = safeRegion(partner.region);
  const greeting = buildGreeting(partner, region);

  const systemPrompt = buildSystemPrompt(cfg, region, partner.partnerType, account);
  const userPrompt   = buildUserPrompt(cfg, region, partner, greeting, 'nudge', {
    daysSince,
    followUpNumber,
    followUpTemplate: LANGUAGE[region].FOLLOWUP,
  });

  const raw = await callClaude(systemPrompt, userPrompt);
  const fallback = `Re: ${cfg.indication} — ${partner.partnerType === 'INVESTOR' ? 'Investment Opportunity' : 'BD Opportunity'} | ${cfg.company}`;
  return parseEmailResponse(raw, fallback);
}

// ── Public: advance email (they responded — move forward) ────────────────────

export async function generateAdvanceEmail(
  partner: PartnerContext,
  responseNote: string,
  account: AccountContext = { previousOutreachCount: 1 },
): Promise<EmailDraft> {
  const cfg    = loadProgramConfig();
  const region = safeRegion(partner.region);
  const greeting = buildGreeting(partner, region);

  const systemPrompt = buildSystemPrompt(cfg, region, partner.partnerType, account);
  const userPrompt   = buildUserPrompt(cfg, region, partner, greeting, 'advance', {
    responseNote,
  });

  const raw = await callClaude(systemPrompt, userPrompt);
  const fallback = `Re: ${cfg.indication} — ${partner.partnerType === 'INVESTOR' ? 'Investment Opportunity' : 'BD Opportunity'} | ${cfg.company}`;
  return parseEmailResponse(raw, fallback);
}
