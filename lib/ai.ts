import Anthropic from '@anthropic-ai/sdk';

// Create a fresh client each time so env vars are always current
export function getAI(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set in .env');
  return new Anthropic({ apiKey });
}
