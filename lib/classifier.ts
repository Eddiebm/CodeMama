/**
 * classifier.ts  (updated — drop-in replacement)
 * ─────────────────────────────────────────────────────────────────────────────
 * Classifies inbound partner messages into three buckets:
 *  - HUMAN_REQUIRED  → escalate, stop automation
 *  - POSITIVE        → partner is interested; trigger advance email
 *  - SIMPLE          → neutral ACK, continue normal flow
 */

import { requiresHuman } from './guardrails';

const POSITIVE_SIGNALS = [
  'interested',
  'would like to',
  'open to',
  'happy to',
  'please send',
  'let\'s connect',
  'let\'s schedule',
  'schedule a call',
  'set up a meeting',
  'learn more',
  'tell me more',
  'sounds interesting',
  'worth exploring',
  'looking forward',
  'reach out',
  'connect',
  'call next week',
  'availability',
  'calendar',
];

export type Classification = 'HUMAN_REQUIRED' | 'POSITIVE' | 'SIMPLE';

export function classifyInbound(text: string): Classification {
  if (requiresHuman(text)) return 'HUMAN_REQUIRED';

  const lower = text.toLowerCase();
  if (POSITIVE_SIGNALS.some((signal) => lower.includes(signal))) return 'POSITIVE';

  return 'SIMPLE';
}
