import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

// Per-turn input cap (approx, by char count); per-day turn cap pulled from env.
export const MAX_INPUT_TOKENS_PER_TURN = 8_000;
export const MAX_OUTPUT_TOKENS = 2_048;

export const DAILY_TURN_LIMIT = Number.isFinite(
  Number(process.env.AI_TUTOR_MAX_REQUESTS_PER_HOUR)
)
  ? Number(process.env.AI_TUTOR_MAX_REQUESTS_PER_HOUR)
  : 30;

export const DAILY_TOKEN_LIMIT = Number.isFinite(
  Number(process.env.AI_TUTOR_MAX_TOKENS_PER_DAY)
)
  ? Number(process.env.AI_TUTOR_MAX_TOKENS_PER_DAY)
  : 50_000;

export type RateGate =
  | { ok: true; turnsUsed: number; tokensUsed: number }
  | { ok: false; reason: 'daily_turn_limit' | 'daily_token_limit' };

export async function checkAndReserveTurn(userId: string): Promise<RateGate> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('ai_usage_today')
    .select('turns_today, tokens_today')
    .eq('user_id', userId)
    .maybeSingle();

  const turnsUsed = data?.turns_today ?? 0;
  const tokensUsed = data?.tokens_today ?? 0;

  if (turnsUsed >= DAILY_TURN_LIMIT) return { ok: false, reason: 'daily_turn_limit' };
  if (tokensUsed >= DAILY_TOKEN_LIMIT) return { ok: false, reason: 'daily_token_limit' };

  return { ok: true, turnsUsed, tokensUsed };
}

// Approximate token count: 1 token ≈ 4 chars (English). Cheap pre-flight check
// before incurring an API call. Tighten later via Anthropic's count_tokens API
// if needed.
export function approxTokens(s: string) {
  return Math.ceil(s.length / 4);
}
