// "Sign in with ChatGPT" for the coach: the ChatGPT plan answers instead of an API key. OpenAI's device-code flow (the
// user types a code at auth.openai.com, so no redirect back to this server is needed), then the Codex backend that
// ChatGPT plans use. Unofficial for third-party apps and OpenAI can change it; a failure surfaces as the usual
// "that didn't work" message. Protocol as published in langchain-openai's chatgpt_oauth.py / codex.py.
import { createHash, randomBytes } from "node:crypto";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { decodeJwt } from "jose";
import { jsonBody, LoginError, oauthCode, type LoginBundle } from "./bundle";

const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const DEVICE_CODE_URL = "https://auth.openai.com/api/accounts/deviceauth/usercode";
const DEVICE_TOKEN_URL = "https://auth.openai.com/api/accounts/deviceauth/token";
const TOKEN_URL = "https://auth.openai.com/oauth/token";
const DEVICE_REDIRECT_URI = "https://auth.openai.com/deviceauth/callback";
const CODEX_BASE_URL = "https://chatgpt.com/backend-api/codex";
const CLAIMS = "https://api.openai.com/auth";
const SCOPE = "openid profile email offline_access";
const TIMEOUT_MS = 20_000;

type Deps = { fetch?: typeof fetch; now?: () => number };

/** What the browser needs to show: the code to type and where. The rest stays on the server (sealed in a cookie). */
export type DeviceStart = { userCode: string; verificationUri: string; interval: number; expiresAt: number };
/** What the server keeps between the start and the polls. */
export type DevicePending = DeviceStart & { deviceCode: string; verifier: string; model: string };

async function post(url: string, body: Record<string, string>, deps: Deps, pendingOk = false): Promise<{ json: Record<string, unknown>; pending?: string }> {
  let res: Response;
  try {
    res = await (deps.fetch ?? fetch)(url, { method: "POST", headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new LoginError("network");
  }
  const json = await jsonBody(res);
  if (res.ok) return { json };
  const code = oauthCode(json);
  if (pendingOk && (code === "authorization_pending" || code === "slow_down")) return { json, pending: code };
  throw new LoginError(code ?? "token_failed", res.status);
}

/** Asks OpenAI for a code the user types at the verification page. */
export async function startChatgptLogin(model: string, deps: Deps = {}): Promise<DevicePending> {
  const verifier = randomBytes(32).toString("base64url");
  const { json } = await post(DEVICE_CODE_URL, { client_id: CLIENT_ID, scope: SCOPE, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }, deps);
  const deviceCode = json.device_code;
  const userCode = json.user_code;
  const verificationUri = json.verification_uri ?? json.verification_uri_complete;
  if (typeof deviceCode !== "string" || typeof userCode !== "string" || typeof verificationUri !== "string") throw new LoginError("bad_device_response");
  const interval = Math.min(30, Math.max(3, Number(json.interval) || 5));
  const lifetime = Math.min(900, Number(json.expires_in) || 600);
  return { deviceCode, userCode, verificationUri, interval, verifier, model, expiresAt: (deps.now?.() ?? Date.now()) + lifetime * 1000 };
}

export type DevicePoll = { status: "pending"; interval: number } | { status: "done"; bundle: LoginBundle };

/** One poll: still waiting for the user, or the finished sign-in. */
export async function pollChatgptLogin(p: DevicePending, deps: Deps = {}): Promise<DevicePoll> {
  const now = deps.now?.() ?? Date.now();
  if (p.expiresAt <= now) throw new LoginError("expired_token");
  const { json, pending } = await post(DEVICE_TOKEN_URL, { client_id: CLIENT_ID, device_code: p.deviceCode }, deps, true);
  if (pending) return { status: "pending", interval: pending === "slow_down" ? p.interval + 5 : p.interval };
  const code = json.authorization_code;
  if (typeof code !== "string") return { status: "pending", interval: p.interval };
  const { json: tokens } = await post(TOKEN_URL, { grant_type: "authorization_code", code, redirect_uri: DEVICE_REDIRECT_URI, client_id: CLIENT_ID, code_verifier: p.verifier }, deps);
  return { status: "done", bundle: bundleFrom(tokens, undefined, deps) };
}

function bundleFrom(json: Record<string, unknown>, previous: LoginBundle | undefined, deps: Deps): LoginBundle {
  const accessToken = json.access_token;
  const refreshToken = typeof json.refresh_token === "string" ? json.refresh_token : previous?.refreshToken;
  const lifetime = Number(json.expires_in);
  if (typeof accessToken !== "string" || !refreshToken || !(lifetime > 0)) throw new LoginError("bad_token_response");
  let accountId = previous?.accountId;
  let hint = previous?.hint;
  try {
    if (typeof json.id_token === "string") {
      const claims = decodeJwt(json.id_token);
      const auth = claims[CLAIMS] as { chatgpt_account_id?: unknown } | undefined;
      if (typeof auth?.chatgpt_account_id === "string") accountId = auth.chatgpt_account_id;
      if (typeof claims.email === "string") hint = claims.email;
    }
  } catch {
    // The id token only names the account; a bundle without it still works if the backend allows it.
  }
  return { v: 1, accessToken, refreshToken, expiresAt: (deps.now?.() ?? Date.now()) + lifetime * 1000, accountId, hint };
}

export async function refreshChatgptLogin(bundle: LoginBundle, deps: Deps = {}): Promise<LoginBundle> {
  const { json } = await post(TOKEN_URL, { grant_type: "refresh_token", refresh_token: bundle.refreshToken, client_id: CLIENT_ID }, deps);
  return bundleFrom(json, bundle, deps);
}

type Json = Record<string, unknown>;

/**
 * The Codex backend takes the Responses API with three differences from OpenAI's own: system text goes in
 * `instructions`, `store` must be false, and it only streams. Rewrites the request on its way out and, when the
 * caller asked for a plain response, folds the stream back into one.
 */
export function codexFetch(inner: typeof fetch = fetch): typeof fetch {
  return async (url, init) => {
    if (typeof init?.body !== "string") return inner(url, init);
    let body: Json;
    try {
      body = JSON.parse(init.body) as Json;
    } catch {
      return inner(url, init);
    }
    const wantsStream = body.stream === true;
    const input = Array.isArray(body.input) ? (body.input as Json[]) : [];
    const system = input.filter((m) => (m.role === "system" || m.role === "developer") && typeof m.content === "string").map((m) => m.content as string);
    const rest = input.filter((m) => !((m.role === "system" || m.role === "developer") && typeof m.content === "string"));
    const next: Json = { ...body, input: rest, store: false, stream: true, instructions: [typeof body.instructions === "string" ? body.instructions : "", ...system].filter(Boolean).join("\n\n") || "You are a helpful assistant." };
    // The ChatGPT backend rejects sampling and length knobs the public API accepts.
    for (const k of ["max_output_tokens", "temperature", "top_p"]) delete next[k];
    const res = await inner(url, { ...init, body: JSON.stringify(next) });
    if (wantsStream || !res.ok) return res;
    const final = lastCompleted(await res.text());
    return final ? new Response(JSON.stringify(final), { status: 200, headers: { "content-type": "application/json" } }) : new Response(JSON.stringify({ error: { message: "no_response" } }), { status: 502, headers: { "content-type": "application/json" } });
  };
}

/** The finished response object out of a server-sent-events body. */
export function lastCompleted(sse: string): Json | null {
  let found: Json | null = null;
  for (const line of sse.split("\n")) {
    if (!line.startsWith("data:")) continue;
    try {
      const event = JSON.parse(line.slice(5).trim()) as { type?: string; response?: Json };
      if ((event.type === "response.completed" || event.type === "response.incomplete") && event.response) found = event.response;
    } catch {
      // keep-alive or partial line
    }
  }
  return found;
}

export function chatgptLoginModel(bundle: LoginBundle, model: string, fetchImpl: typeof fetch = fetch): LanguageModel {
  return createOpenAI({
    baseURL: CODEX_BASE_URL,
    apiKey: bundle.accessToken,
    headers: { originator: "pulse", ...(bundle.accountId && { "ChatGPT-Account-Id": bundle.accountId }) },
    fetch: codexFetch(fetchImpl),
  }).responses(model);
}
