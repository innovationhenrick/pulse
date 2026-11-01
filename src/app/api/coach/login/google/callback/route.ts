import { generateText } from "ai";
import { NextResponse, type NextRequest } from "next/server";
import { requestUser } from "@/server/auth";
import { LoginError, serializeBundle } from "@/server/coach/login/bundle";
import { exchangeGoogleLogin, geminiFailure, googleLoginRedirect, listGeminiModels } from "@/server/coach/login/google";
import { consumeLoginState } from "@/server/coach/login/state";
import { providerOf } from "@/server/coach/providers";
import { coachAccess, modelFor, saveProvider } from "@/server/coach/store";
import { getConfig } from "@/server/config";
import { getDb } from "@/server/db";
import { appOrigin } from "@/server/sources/google/oauth";

/**
 * Google's redirect back after "Sign in with Google" for the coach. Lands on Coach or Settings with
 * `?coach_login=connected` or `?coach_login=<code>`. A missing, reused, expired or another user's `state` touches nothing.
 */
export async function GET(request: NextRequest) {
  const { google, authSecret } = getConfig();
  if (!google) return new Response("Not found", { status: 404 });
  const params = request.nextUrl.searchParams;
  const origin = appOrigin(request, google.appUrl);
  const user = await requestUser(request);
  if (!user) return NextResponse.redirect(`${origin}/login`, 302);
  const state = consumeLoginState(params.get("state"), user.userId);
  const back = (result: string, to: string = state?.returnTo ?? "/coach") => NextResponse.redirect(`${origin}${to}?coach_login=${encodeURIComponent(result)}`, 302);
  if (!state) return back("expired");
  const code = params.get("code");
  if (!code) return back("access_denied");
  const db = getDb();
  if (!(await coachAccess(db, user.userId))) return back("no_access");
  if (!authSecret) return back("no_secret");
  try {
    const bundle = await exchangeGoogleLogin({ clientId: google.clientId, clientSecret: google.clientSecret, redirectUri: googleLoginRedirect(origin), code, verifier: state.verifier });
    const wanted = state.model || providerOf("google-login")!.model;
    // One tiny request, like a pasted key gets: a sign-in that can't call Gemini is never stored. When the model the
    // user asked for isn't served to this account (404) or is busy (503), the account's own model list supplies others.
    const tried: string[] = [];
    let working: string | null = null;
    let failure = "gemini";
    const available = await listGeminiModels(bundle);
    console.warn(`[coach] gemini models for this account: ${available.slice(0, 12).join(", ") || "none listed"}`);
    for (const candidate of [wanted, ...available]) {
      if (tried.includes(candidate) || tried.length >= 5) continue;
      tried.push(candidate);
      const m = modelFor("google-login", candidate, serializeBundle(bundle));
      if (!m) return back("error");
      try {
        await generateText({ model: m, prompt: "Reply with OK.", maxOutputTokens: 5, maxRetries: 0, abortSignal: AbortSignal.timeout(15_000) });
        working = candidate;
        break;
      } catch (e) {
        const { code, status } = geminiFailure(e);
        failure = code;
        console.warn(`[coach] gemini test with ${candidate} failed: ${code === "gemini" ? (e as Error)?.name : code}`);
        // A refused sign-in or a permission error is the same for every model, so stop. Anything else (missing, busy,
        // out of quota for that model, a timeout) is worth the next candidate: quotas are per model.
        if (status === 401 || status === 403) break;
      }
    }
    if (!working) throw new LoginError(failure);
    await saveProvider(db, user.userId, "google-login", working, serializeBundle(bundle), bundle.hint ?? null);
    return back("connected");
  } catch (err) {
    console.error(`[coach] google sign-in failed: ${err instanceof LoginError ? err.message : (err as Error)?.name}`);
    return back(err instanceof LoginError ? err.code : "error");
  }
}
