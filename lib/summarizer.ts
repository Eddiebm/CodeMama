export function summarize(messages: string[]) {
  return {
    SUMMARY:    messages.slice(-5).join(' '),
    QUESTIONS:  messages.filter(m => m.includes('?')),
    OBJECTIONS: [],
    NEXT_STEP:  'Review manually'
  };
}
