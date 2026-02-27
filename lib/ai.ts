import Anthropic from '@anthropic-ai/sdk';

const globalForAI = globalThis as unknown as { ai: Anthropic };

export const ai =
  globalForAI.ai ||
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

if (process.env.NODE_ENV !== 'production') globalForAI.ai = ai;
