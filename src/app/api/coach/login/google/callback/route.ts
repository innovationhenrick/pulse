import { generateText } from "ai";
import { NextResponse, type NextRequest } from "next/server";
import { requestUser } from "@/server/auth";
import { LoginError, serializeBundle } from "@/server/coach/login/bundle";
import { exchangeGoogleLogin, googleLoginRedirect } from "@/server/coach/login/google";
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
    const model = state.model || providerOf("google-login")!.model;
    const m = modelFor("google-login", model, serializeBundle(bundle));
    if (!m) return back("error");
    // One tiny request, like a pasted key gets: a sign-in whose project can't call Gemini is never stored.
    await generateText({ model: m, prompt: "Reply with OK.", maxOutputTokens: 5, maxRetries: 0, abortSignal: AbortSignal.timeout(20_000) }).catch(() => {
      throw new LoginError("gemini_unavailable");
    });
    await saveProvider(db, user.userId, "google-login", model, serializeBundle(bundle), bundle.hint ?? null);
    return back("connected");
  } catch (err) {
    console.error(`[coach] google sign-in failed: ${err instanceof LoginError ? err.message : (err as Error)?.name}`);
    return back(err instanceof LoginError ? err.code : "error");
  }
}
