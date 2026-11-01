// Keeps a signed-in coach account working: hands back a bundle whose access token is good for the next few minutes.
import { getConfig } from "../../config";
import type { ProviderAuth } from "../providers";
import { isFresh, LoginError, type LoginBundle } from "./bundle";
import { refreshChatgptLogin } from "./chatgpt";
import { refreshGoogleLogin } from "./google";

/** The bundle itself when still fresh, else a refreshed one (the caller stores it: refresh tokens can rotate). */
export async function freshBundle(auth: Exclude<ProviderAuth, "key">, bundle: LoginBundle, now = Date.now()): Promise<{ bundle: LoginBundle; changed: boolean }> {
  if (isFresh(bundle, now)) return { bundle, changed: false };
  if (auth === "chatgpt") return { bundle: await refreshChatgptLogin(bundle), changed: true };
  const google = getConfig().google;
  if (!google) throw new LoginError("google_not_configured");
  return { bundle: await refreshGoogleLogin({ clientId: google.clientId, clientSecret: google.clientSecret, bundle }), changed: true };
}
