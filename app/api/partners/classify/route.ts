import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Keywords that signal an investor/VC rather than an operating pharma/biotech company
const INVESTOR_TITLE_KEYWORDS = [
  'investor', 'investment', 'venture', 'capital', 'fund', 'partner', 'principal',
  'analyst', 'portfolio', 'managing director', 'general partner', 'limited partner',
  'asset management', 'equity', 'family office', 'endowment', 'wealth',
  'associate', 'vice president, investments', 'director, investments',
];

const INVESTOR_COMPANY_KEYWORDS = [
  'ventures', 'venture', 'capital', 'fund', 'partners', 'investment', 'equity',
  'asset management', 'holdings', 'family office', 'endowment', 'wealth',
  'management', 'advisors', 'group', 'healthcare fund', 'life science fund',
];

// Keywords that signal a large pharma (vs biotech)
const PHARMA_COMPANY_KEYWORDS = [
  'pharmaceutical', 'pharma', 'pfizer', 'roche', 'novartis', 'astrazeneca',
  'merck', 'abbvie', 'bristol', 'eli lilly', 'sanofi', 'gsk', 'bayer',
  'takeda', 'astellas', 'daiichi', 'eisai', 'otsuka', 'boryung', 'yuhan',
  'hanmi', 'chong kun dang', 'green cross',
];

const BIOTECH_COMPANY_KEYWORDS = [
  'biosciences', 'biotech', 'therapeutics', 'oncology', 'biologics',
  'biopharma', 'genomics', 'proteomics', 'immunotherapy', 'bio ',
];

export function classifyPartner(name: string, contactTitle: string | null): string {
  const n = (name || '').toLowerCase();
  const t = (contactTitle || '').toLowerCase();

  // Investor signals — title takes priority
  const titleIsInvestor = INVESTOR_TITLE_KEYWORDS.some(k => t.includes(k));
  const nameIsInvestor = INVESTOR_COMPANY_KEYWORDS.some(k => n.includes(k)) &&
    !PHARMA_COMPANY_KEYWORDS.some(k => n.includes(k)) &&
    !BIOTECH_COMPANY_KEYWORDS.some(k => n.includes(k));

  if (titleIsInvestor || nameIsInvestor) return 'INVESTOR';

  // Pharma vs biotech
  if (PHARMA_COMPANY_KEYWORDS.some(k => n.includes(k))) return 'PHARMA';
  if (BIOTECH_COMPANY_KEYWORDS.some(k => n.includes(k))) return 'BIOTECH';

  // Default — if title sounds operational/scientific, lean pharma/biotech
  const operationalTitleWords = ['bd', 'business development', 'licensing', 'partnerships',
    'scientific', 'medical', 'clinical', 'research', 'regulatory', 'cmo', 'cso', 'ceo', 'coo', 'cto'];
  if (operationalTitleWords.some(k => t.includes(k))) return 'PHARMA';

  return 'PHARMA'; // conservative default for an LSN database
}

// POST /api/partners/classify — bulk-classify all untyped partners
export async function POST() {
  try {
    const partners = await db.partner.findMany({
      select: { id: true, name: true, contactTitle: true, partnerType: true },
    });

    const updates: { id: string; type: string }[] = [];

    for (const p of partners) {
      const type = classifyPartner(p.name, p.contactTitle);
      updates.push({ id: p.id, type });
    }

    // Batch update
    await Promise.all(
      updates.map(u =>
        db.partner.update({ where: { id: u.id }, data: { partnerType: u.type } })
      )
    );

    // Summary
    const counts = updates.reduce((acc, u) => {
      acc[u.type] = (acc[u.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({ classified: updates.length, breakdown: counts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
