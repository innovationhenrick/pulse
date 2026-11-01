// The Google sign-in's single-use state: bound to the user who started it and holding the PKCE verifier the callback
// needs. Held in memory (a restart mid-consent means signing in again), on globalThis because Next bundles the
// start and callback routes separately.
import { randomBytes } from "node:crypto";

const TTL_MS = 10 * 60_000;
export type LoginState = { userId: number; verifier: string; model: string; returnTo: "/coach" | "/settings" };

const g = globalThis as typeof globalThis & { __pulseCoachLoginStates?: Map<string, LoginState & { expires: number }> };
const states = () => (g.__pulseCoachLoginStates ??= new Map());

export function createLoginState(s: LoginState, now = Date.now()): string {
  for (const [k, { expires }] of states()) if (expires <= now) states().delete(k);
  const state = randomBytes(32).toString("base64url");
  states().set(state, { ...s, expires: now + TTL_MS });
  return state;
}

/** The stored state once, for the user who started it and within ten minutes; null otherwise. */
export function consumeLoginState(state: string | null, userId: number, now = Date.now()): LoginState | null {
  if (!state) return null;
  const entry = states().get(state);
  states().delete(state);
  return entry && entry.expires > now && entry.userId === userId ? entry : null;
}
