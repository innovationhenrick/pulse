// "Sign in with Google" for the coach: Gemini answers on the user's own Google account instead of an API key.
// Same OAuth client Pulse already uses for Google Health (GOOGLE_CLIENT_ID/SECRET), with its own redirect URI and
// scopes. The Cloud project that owns the client is the one Gemini bills the request to, and it needs the
// "Generative Language API" enabled. PKCE on top of the client secret, as the OpenBot desktop app does.
import { createHash, randomBytes } from "node:crypto";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { decodeJwt } from "jose";
import { jsonBody, LoginError, oauthCode, type LoginBundle } from "./bundle";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const TIMEOUT_MS = 20_000;

export const GOOGLE_LOGIN_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/generative-language.retriever"];

type Client = { clientId: string; clientSecret: string };
type Deps = { fetch?: typeof fetch; now?: () => number };

export const googleLoginRedirect = (origin: string) => `${origin}/api/coach/login/google/callback`;

/** `123456789-abc.apps.googleusercontent.com` belongs to Cloud project number 123456789. */
export const projectOf = (clientId: string) => clientId.split("-")[0];

export const newPkce = () => {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
};

export function googleLoginUrl(o: { clientId: string; redirectUri: string; state: string; challenge: string }): string {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: o.clientId,
    redirect_uri: o.redirectUri,
    response_type: "code",
    scope: GOOGLE_LOGIN_SCOPES.join(" "),
    // offline + consent is what returns a refresh token.
    access_type: "offline",
    prompt: "consent",
    state: o.state,
    code_challenge: o.challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

async function tokenRequest(body: Record<string, string>, deps: Deps): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await (deps.fetch ?? fetch)(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new LoginError("network");
  }
  const json = await jsonBody(res);
  if (!res.ok) throw new LoginError(oauthCode(json) ?? "token_failed", res.status);
  return json;
}

const expiresAt = (json: Record<string, unknown>, deps: Deps) => (deps.now?.() ?? Date.now()) + Math.max(0, Number(json.expires_in) || 0) * 1000;

/** Trades the code Google returned for the tokens. */
export async function exchangeGoogleLogin(o: Client & { redirectUri: string; code: string; verifier: string }, deps: Deps = {}): Promise<LoginBundle> {
  const json = await tokenRequest({ grant_type: "authorization_code", code: o.code, client_id: o.clientId, client_secret: o.clientSecret, redirect_uri: o.redirectUri, code_verifier: o.verifier }, deps);
  const accessToken = json.access_token;
  const refreshToken = json.refresh_token;
  if (typeof accessToken !== "string" || typeof refreshToken !== "string") throw new LoginError("no_refresh_token");
  let hint: string | undefined;
  try {
    const email = typeof json.id_token === "string" ? decodeJwt(json.id_token).email : undefined;
    hint = typeof email === "string" ? email : undefined;
  } catch {
    hint = undefined;
  }
  return { v: 1, accessToken, refreshToken, expiresAt: expiresAt(json, deps), project: projectOf(o.clientId), hint };
}

/** A new access token for the same grant. Google keeps the refresh token unless it rotates it. */
export async function refreshGoogleLogin(o: Client & { bundle: LoginBundle }, deps: Deps = {}): Promise<LoginBundle> {
  const json = await tokenRequest({ grant_type: "refresh_token", refresh_token: o.bundle.refreshToken, client_id: o.clientId, client_secret: o.clientSecret }, deps);
  if (typeof json.access_token !== "string") throw new LoginError("token_failed");
  return { ...o.bundle, accessToken: json.access_token, refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : o.bundle.refreshToken, expiresAt: expiresAt(json, deps) };
}

/** Gemini with the signed-in account: the bearer token replaces the API-key header the SDK would send. */
export function googleLoginModel(bundle: LoginBundle, model: string, fetchImpl: typeof fetch = fetch): LanguageModel {
  return createGoogleGenerativeAI({
    apiKey: "oauth",
    fetch: (url, init) => {
      const headers = new Headers(init?.headers);
      headers.delete("x-goog-api-key");
      headers.set("authorization", `Bearer ${bundle.accessToken}`);
      if (bundle.project) headers.set("x-goog-user-project", bundle.project);
      return fetchImpl(url, { ...init, headers });
    },
  })(model);
}
