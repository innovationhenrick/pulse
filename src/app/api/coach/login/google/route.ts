import type { NextRequest } from "next/server";
import { requestUser } from "@/server/auth";
import { coachAccess } from "@/server/coach/store";
import { googleLoginRedirect, googleLoginUrl, newPkce } from "@/server/coach/login/google";
import { createLoginState } from "@/server/coach/login/state";
import { getConfig } from "@/server/config";
import { getDb } from "@/server/db";
import { appOrigin } from "@/server/sources/google/oauth";

/**
 * Start "Sign in with Google" for the coach: redirects to Google's consent. Needs a Pulse session and coach access;
 * the state is bound to that user. 404 when this server has no Google OAuth client.
 */
export async function GET(request: NextRequest) {
  const { google } = getConfig();
  if (!google) return new Response("Not found", { status: 404 });
  const origin = appOrigin(request, google.appUrl);
  const user = await requestUser(request);
  if (!user) return Response.redirect(`${origin}/login`, 302);
  if (!(await coachAccess(getDb(), user.userId))) return new Response("Not found", { status: 404 });
  const params = request.nextUrl.searchParams;
  const model = params.get("model")?.trim() ?? "";
  const { verifier, challenge } = newPkce();
  const state = createLoginState({ userId: user.userId, verifier, model: /^[\w.:/@-]{1,120}$/.test(model) ? model : "", returnTo: params.get("from") === "settings" ? "/settings" : "/coach" });
  return Response.redirect(googleLoginUrl({ clientId: google.clientId, redirectUri: googleLoginRedirect(origin), state, challenge }), 302);
}
