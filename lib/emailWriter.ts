import { getAI } from './ai';
import { LANGUAGE } from './language';
import { db } from './db';

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

const DEFAULT_CONFIG: ProgramConfig = {
  company: 'COARE Holdings',
  sender: 'Eddie Bannerman-Menson',
  senderTitle: 'Executive Vice President, Business Development',
  indication: 'High-Grade Serous Ovarian Cancer (HGSOC)',
  stage: 'Preclinical',
  programType: 'Combination therapy',
  emailScope: 'Introduce COARE Holdings and a preclinical HGSOC combination program to strategic partners.',
  goalDescription: 'Identify potential licensing, co-development, or partnership discussions',
  forbiddenTopics: 'pricing, valuation, deal terms, safety data, toxicity, efficacy comparisons, regulatory strategy',
  clinicalContext: 'Approximately 80% of women with HGSOC will relapse following first-line therapy. Median survival after platinum-resistant relapse remains under 12 months.',
  marketContext: 'HGSOC accounts for ~314,000 new diagnoses globally each year. The global ovarian cancer therapeutics market is projected to exceed $3B by 2030.',
  partnerHook: 'Where the partner has an oncology program, reference strategic alignment.',
  investorPitch: 'COARE represents a capital-efficient preclinical opportunity in a high-value indication with validated biology and clear commercial precedents.',
  investorMarketHook: 'With the global ovarian cancer market projected to exceed $3B by 2030, acquirers are actively seeking differentiated preclinical programs.',
  investorMilestones: 'Key near-term value inflection points include advancing IND-enabling studies and first-in-human readouts.',
};

export async function loadProgramConfig(): Promise<ProgramConfig> {
  try {
    const row = await db.setting.findUnique({ where: { key: 'program_config' } });
    if (row) return { ...DEFAULT_CONFIG, ...JSON.parse(row.value) };
  } catch { /* fall through to default */ }
  return DEFAULT_CONFIG;
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

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────

function buildSystemPrompt(
  cfg: ProgramConfig,
  region: Region,
  partnerType: string,
  account: AccountContext,
): string {
  const isCN       = region === 'CN';
  const isInvestor = partnerType === 'INVESTOR';

  // ── 1. Global role ──────────────────────────────────────────────────────
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

  // ── 2. Banned phrases (auto-reject) ─────────────────────────────────────
  const bannedPhrases = `
BANNED PHRASES — AUTO-REJECT if any of the following appear in the draft. Rewrite immediately.

Opening phrases (banned):
- "We are reaching out"
- "We wanted to introduce"
- "We believe this may be of interest"
- "I am writing to"
- "I hope this email finds you"
- "I hope this finds you well"

Promotional language (banned):
- "Exciting" / "exciting opportunity"
- "Innovative" / "innovation" (as a marketing claim)
- "Revolutionary" / "revolutionizing"
- "Groundbreaking"
- "Transformative"
- "Breakthrough" (as a standalone adjective)
- "Game-changing"

Zero tolerance: if any banned phrase appears anywhere in the email body or subject → discard and rewrite from scratch.
`.trim();

  // ── 3. Required content blocks ──────────────────────────────────────────
  const requiredBlocks = `
REQUIRED CONTENT BLOCKS — all four must be present in the final draft:

A. POSITIONING SENTENCE
   Must include at least one of: resistance-focused / combination-engineered / mechanism-driven / platform
   This is the strategic framing of why the program is relevant.

B. DIFFERENTIATION SENTENCE
   Must include at least one of: limited competition / lack of durable options / persistent unmet need / resistance biology
   This establishes why the disease setting remains unresolved.

C. MOMENTUM SIGNAL
   Must include at least one phrase from Category A or B:
   Category A (program milestones — factual, confirmed in-progress):
     "advancing IND-enabling" / "next development phase"
   Category B (process signal — always valid, projects structure and selectivity):
     "structured evaluation process" / "select group of strategic partners"

D. CONTROLLED CLOSE
   Must use language similar to:
   "If aligned, we would welcome a brief discussion to determine whether deeper diligence is warranted."
   (Exact wording may vary; tone must be confident, non-pressuring, and reciprocal.)

If any block is absent → rewrite until all four are present.
`.trim();

  // ── 4. Factual integrity ─────────────────────────────────────────────────
  const factualIntegrity = `
FACTUAL INTEGRITY — ABSOLUTE RULE:
You may ONLY reference facts explicitly stated in the Program Context provided to you.
Do NOT infer, assume, extrapolate, or invent ANY details about:
- The program's mechanism of action or compound type (do NOT say "small molecule", "antibody", "ADC" unless explicitly stated)
- The program's clinical or preclinical data
- The company's partnerships, funding, or history
- Any outcomes, results, or timelines not explicitly given

Also forbidden: ${cfg.forbiddenTopics}

If a detail is not in the Program Context, omit it entirely. Do not fill gaps with plausible-sounding information.
`.trim();

  // ── 5. Word count rule ───────────────────────────────────────────────────
  const wordCountRule = `
WORD COUNT RULE (body text only — excluding greeting and sign-off):
- INVESTOR recipients: 150–180 words. Outside this range → rewrite.
- PHARMA / BIOTECH recipients: maximum 220 words. Above limit → trim and rewrite.

Count words carefully before outputting. Compliance is mandatory.
`.trim();

  // ── 6. China overlay ─────────────────────────────────────────────────────
  const chinaOverlay = isCN ? `
CHINA / GREATER CHINA REGIONAL OVERLAY:

TONE: Direct, serious, respectful of hierarchy. No idioms, humor, or rhetorical flourishes. Professional neutrality throughout.

CONTENT EMPHASIS:
- Emphasize: long-term collaboration, large patient populations, unmet need in late-line settings, combination strategies, co-development potential, alignment with oncology franchises
- De-emphasize: founder narratives, speculative innovation language, Western venture-style enthusiasm, aggressive scarcity framing

LANGUAGE: Use "strategic alignment", "long-term collaboration", "regional co-development potential", "shared focus on execution".
Do NOT reference: deal terms, regulatory shortcuts, geopolitical dynamics, competitive dominance language.

ADDRESS: By family name with title (e.g., "Dear Director Chen"). Never first name alone. If title unknown: "Dear Colleague".

PREFERRED CLOSING: "We would welcome the opportunity to explore whether there is strategic alignment for discussion."

ADDITIONAL PROHIBITIONS: No informal language, no over-personalisation, no accelerated approval path suggestions, no high-pressure urgency.
`.trim() : '';

  // ── 7. Pharma / Biotech overlay ──────────────────────────────────────────
  const pharmaOverlay = !isInvestor ? `
PHARMA / BIOTECH PARTNER OVERLAY:

TONE: Clinically literate, commercially realistic, peer-level BD. Assume the recipient manages multiple assets, is sensitive to development risk, and values clarity over novelty.

REQUIRED KEYWORD SIGNALS — at least one from each:
- Portfolio signal: "portfolio alignment" / "portfolio adjacency" / "oncology franchise"
- Combination rationale: combination approach framed against a clinical or mechanistic gap
- Differentiation: "mechanistic differentiation" / resistance biology / ceiling of standard of care
- Adjacency: explicit reference to how this fits their existing pipeline or therapeutic focus

PROHIBITED: capital efficiency framing, exit language, fundraising tone, academic mechanistic explanations.

PREFERRED CLOSING: "We would welcome a brief discussion to explore whether there is strategic or portfolio alignment."
`.trim() : '';

  // ── 8. Investor overlay ──────────────────────────────────────────────────
  const investorOverlay = isInvestor ? `
INVESTOR OVERLAY — recipient is a VC, growth equity, family office, or strategic investor:

TONE: Rational, risk-aware, confident but restrained. Speak in terms of portfolio fit, capital efficiency, value inflection points, and strategic M&A backdrop. Assume they have seen many preclinical oncology programs and value credible exit pathways over vision alone.

REQUIRED KEYWORD SIGNALS — at least one from each:
- Capital signal: "capital-efficient" / "capital efficiency"
- Inflection: "defined inflection point" / "value inflection" / "IND-enabling"
- Exit context: "strategic acquirer" / "strategic M&A" / "exit"
- Indication gravity: "high-mortality" / "high unmet need" / persistent late-line mortality framing

MARKET CONTEXT (use selectively): ${cfg.investorMarketHook}
MILESTONES (frame near-term catalysts): ${cfg.investorMilestones}

PROHIBITED: detailed mechanistic explanations, academic tone, regulatory detail, valuations, exit timing promises, comparative deal examples, fundraising tone.

PREFERRED CLOSING: "We would welcome an initial discussion to assess mutual interest and strategic fit."
`.trim() : '';

  // ── 9. Account context ───────────────────────────────────────────────────
  const accountCtx = account.previousOutreachCount > 0 ? `
ACCOUNT CONTEXT — this company has been contacted before:
- Total prior outreach emails sent: ${account.previousOutreachCount}
- Last contact: ${account.lastSentAt ? new Date(account.lastSentAt).toDateString() : 'unknown'}
${account.previousSubjects?.length ? `- Prior subject lines used: ${account.previousSubjects.map(s => `"${s}"`).join(', ')}` : ''}

ACCOUNT DISCIPLINE:
- No two emails to the same company may share more than 50% overlapping phrasing
- Do not repeat the same hook, opening, or closing as previous emails
- Adjust tone to reflect the relationship stage
`.trim() : '';

  return [globalRole, bannedPhrases, requiredBlocks, factualIntegrity, wordCountRule, chinaOverlay, pharmaOverlay, investorOverlay, accountCtx]
    .filter(Boolean)
    .join('\n\n---\n\n');
}

// ── USER PROMPT ───────────────────────────────────────────────────────────────

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
    followUpTemplate?: string;
  }
): string {
  const isInvestor = partner.partnerType === 'INVESTOR';
  const audienceType = isInvestor
    ? 'venture capital / investment firm'
    : `${partner.partnerType.toLowerCase()} company`;
  const wordLimit = isInvestor ? '150–180 words' : 'maximum 220 words';

  const seniorityNote = partner.contactTitle
    ? `Recipient title: "${partner.contactTitle}" — write peer-to-peer at that seniority level.`
    : '';

  const researchNote = extras.researchContext
    ? `\nPartner research — use ONLY to substantiate the fit hypothesis, never to demonstrate homework:\n${extras.researchContext}`
    : '';

  // Mode-specific instructions
  let modeInstructions = '';

  if (mode === 'initial') {
    modeInstructions = `
TASK: Write the initial outreach email.

MANDATORY 4-PARAGRAPH STRUCTURE — no exceptions:
¶1 — Strategic positioning + alignment
   Open directly with WHY this specific company is a plausible fit RIGHT NOW.
   State the fit hypothesis in the first sentence. No pleasantries. No preamble.
   Base it on their therapeutic focus, portfolio stage, or strategic position.

¶2 — Differentiation + resistance thesis
   Establish the unmet need in HGSOC specifically: where existing options fall short,
   why late-line disease settings remain unresolved, and how the combination approach
   addresses that gap. One clinical fact maximum.

¶3 — Momentum + value inflection
   Signal a structured, selective evaluation process.
   Must include at least one momentum phrase (Category A or B from required blocks).
   One market or strategic fact maximum.

¶4 — Controlled, confident close
   Low-friction ask — a brief call to assess fit.
   Must use language in the spirit of:
   "If aligned, we would welcome a brief discussion to determine whether deeper diligence is warranted."

FORMAT RULES:
- Exactly 4 paragraphs. No bullet points. No sub-headers.
- ${wordLimit} (body text, excluding greeting and sign-off)
- Do NOT open with any banned phrase
- Region tone: US = direct/collegial; EU = measured/formal; CN = respectful/relationship-first

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
      ? '\nFor this Chinese recipient: be especially patient and respectful. Do not pressure. Frame as maintaining respectful contact. Subject line must be soft and non-presumptuous.'
      : '';
    modeInstructions = `
TASK: Write a NUDGE / FOLLOW-UP email. They have NOT responded. This is follow-up #${extras.followUpNumber ?? 1}. It has been ${extras.daysSince ?? 7} days since the last email.

FORMAT RULES:
- 2–3 short paragraphs MAXIMUM — shorter than the original
- Open by acknowledging they are busy and may have missed the note — gracious, not passive-aggressive
- Reference the prior outreach in ONE sentence only. Do not repeat the full pitch.
- Restate ONLY the single most compelling hook — one clinical or strategic point
- Close with an ultra low-friction ask — softer than the original ("even a 15-minute exchange when convenient")
- Subject line must start with "Re: " and be softer than the original
- Tone: US = brief, direct; EU = measured, gracious; CN = highly respectful, patient, no pressure
- Do NOT use any banned phrase
${cnNote}
${extras.followUpTemplate ? `Follow-up language anchor (adapt, do not copy verbatim): "${extras.followUpTemplate}"` : ''}
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
- Do NOT use any banned phrase
${cnNote}
`.trim();
  }

  // Quality gate — mandatory before output
  const qualityGate = `
MANDATORY BEFORE OUTPUTTING:

STEP 1 — SILENT PRE-WRITE REASONING (do not display):
- Classify the recipient: pharma BD / biotech executive / strategic investor / regional partner
- State in one sentence the specific fit hypothesis: why is THIS company a plausible partner RIGHT NOW?
- Identify whether any research detail substantiates that hypothesis — if not, omit all research
- Confirm the 4-paragraph structure and word count plan before drafting

STEP 2 — DRAFT the email following all rules above.

STEP 3 — QUALITY GATE (internal review — FAIL = rewrite from scratch):
FAIL immediately if the draft:
- Contains ANY banned phrase from the banned phrase list
- Is missing any of required blocks A, B, C, or D
- Exceeds word count limit or (for INVESTOR) falls below minimum
- Contains ANY factual claim about the program not explicitly stated in the Program Context
- Does not open with a specific, credible fit hypothesis for this recipient
- Contains a research detail that exists to show homework rather than substantiate fit
- Uses more than 4 paragraphs or uses bullet points or sub-headers
- Sounds like a pitch, fundraising email, or unsolicited sales contact
- Contains mechanistic explanations beyond high-level framing
- Makes implied claims of efficacy, safety, or competitive superiority

PASS only if:
- No banned phrase appears anywhere
- All four required blocks (A, B, C, D) are present
- Word count is within permitted range
- Opening states a specific, credible fit hypothesis for this recipient
- Tone reflects 20+ years of senior pharmaceutical BD experience
- Email invites discussion rather than demands interest

If FAIL: rewrite until all PASS criteria are met.

STEP 4 — SELF-SCORING (5 dimensions, 1–10 each, internal only — do not display):
1. Senior tone — sounds like a 20-year pharma BD veteran, not a sales rep
2. Strategic clarity — fit hypothesis is specific and credible, not generic
3. Differentiation strength — resistance/unmet need framing is precise
4. Momentum signal — projects confidence and structured selectivity
5. Audience alignment — every element tuned to this specific recipient type

Rules:
- Any single score < 8 → rewrite that section
- Average score < 9 → rewrite entire draft
Only proceed to STEP 5 when all scores ≥ 8 and average ≥ 9.

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

// ── Claude call ───────────────────────────────────────────────────────────────

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const message = await getAI().messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 4096,
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

// ── Public: initial outreach email ────────────────────────────────────────────

export async function generateOutreachEmail(
  partner: PartnerContext,
  researchContext: string,
  account: AccountContext = { previousOutreachCount: 0 },
): Promise<EmailDraft> {
  const cfg      = await loadProgramConfig();
  const region   = safeRegion(partner.region);
  const greeting = buildGreeting(partner, region);

  const systemPrompt = buildSystemPrompt(cfg, region, partner.partnerType, account);
  const userPrompt   = buildUserPrompt(cfg, region, partner, greeting, 'initial', {
    researchContext,
    // No introTemplate — engine generates cold opens from scratch
  });

  const raw = await callClaude(systemPrompt, userPrompt);
  const fallback = `${cfg.indication} — ${partner.partnerType === 'INVESTOR' ? 'Investment Opportunity' : 'BD Opportunity'} | ${cfg.company}`;
  return parseEmailResponse(raw, fallback);
}

// ── Public: nudge email (no reply received) ───────────────────────────────────

export async function generateFollowUpEmail(
  partner: PartnerContext,
  daysSince: number,
  followUpNumber: number,
  account: AccountContext = { previousOutreachCount: 1 },
): Promise<EmailDraft> {
  const cfg      = await loadProgramConfig();
  const region   = safeRegion(partner.region);
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

// ── Public: advance email (they responded — move forward) ─────────────────────

export async function generateAdvanceEmail(
  partner: PartnerContext,
  responseNote: string,
  account: AccountContext = { previousOutreachCount: 1 },
): Promise<EmailDraft> {
  const cfg      = await loadProgramConfig();
  const region   = safeRegion(partner.region);
  const greeting = buildGreeting(partner, region);

  const systemPrompt = buildSystemPrompt(cfg, region, partner.partnerType, account);
  const userPrompt   = buildUserPrompt(cfg, region, partner, greeting, 'advance', {
    responseNote,
  });

  const raw = await callClaude(systemPrompt, userPrompt);
  const fallback = `Re: ${cfg.indication} — ${partner.partnerType === 'INVESTOR' ? 'Investment Opportunity' : 'BD Opportunity'} | ${cfg.company}`;
  return parseEmailResponse(raw, fallback);
}
