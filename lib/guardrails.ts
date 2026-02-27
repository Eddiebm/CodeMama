export const COMPLEXITY_KEYWORDS = [
  'safety','toxicity','efficacy','compare','regulatory',
  'ind','ip','exclusivity','pricing','valuation','timeline'
];

export function requiresHuman(text: string): boolean {
  const t = text.toLowerCase();
  return COMPLEXITY_KEYWORDS.some(k => t.includes(k));
}

export function assertApprovedLanguage(source: 'INTRO' | 'FOLLOWUP' | 'ACK') {
  if (!['INTRO','FOLLOWUP','ACK'].includes(source)) {
    throw new Error('Unapproved language source');
  }
}
