import { requiresHuman } from './guardrails';

export function classifyInbound(text: string) {
  return requiresHuman(text) ? 'HUMAN_REQUIRED' : 'SIMPLE';
}
