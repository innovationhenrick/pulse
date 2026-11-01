// What a signed-in coach account stores instead of an API key: the tokens a login returned, as one JSON blob sealed
// with the same encryption as a key (crypto.ts). `hint` names the account in Settings ("you@gmail.com").
export type LoginBundle = {
  v: 1;
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds the access token stops working. */
  expiresAt: number;
  /** ChatGPT only: the workspace the Codex backend wants in `ChatGPT-Account-Id`. */
  accountId?: string;
  /** Google only: the Cloud project number Gemini bills the request to (`x-goog-user-project`). */
  project?: string;
  hint?: string;
};

/** Refresh when the access token has under this long left. */
export const EXPIRY_MARGIN_MS = 5 * 60_000;

export const serializeBundle = (b: LoginBundle) => JSON.stringify(b);

export function parseBundle(text: string): LoginBundle | null {
  try {
    const b = JSON.parse(text) as Partial<LoginBundle>;
    if (b?.v === 1 && typeof b.accessToken === "string" && typeof b.refreshToken === "string" && typeof b.expiresAt === "number") return b as LoginBundle;
  } catch {
    // fall through
  }
  return null;
}

export const isFresh = (b: LoginBundle, now = Date.now()) => b.expiresAt - EXPIRY_MARGIN_MS > now;

/** An error with a short code only: tokens and response bodies never reach a log or a message. */
export class LoginError extends Error {
  override name = "LoginError";
  constructor(
    readonly code: string,
    readonly status?: number,
  ) {
    super(`[coach-login] ${code}${status ? ` (HTTP ${status})` : ""}`);
  }
}

/** Parses a JSON body without ever quoting it in an error. */
export async function jsonBody(res: Response): Promise<Record<string, unknown>> {
  try {
    const v = (await res.json()) as unknown;
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** OAuth error codes are short enum-like strings; anything else could be free text, so it is dropped. */
export function oauthCode(body: Record<string, unknown>): string | undefined {
  const e = body.error;
  return typeof e === "string" && /^[A-Za-z_]{1,64}$/.test(e) ? e : undefined;
}
