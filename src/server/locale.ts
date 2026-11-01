import { getLocale } from "next-intl/server";

/**
 * The interface language of this request, which also fills the ambient format language (src/i18n/request.ts) that
 * `tr()` reads. Actions and route handlers call it before they build a message; outside a request (tests) it is "en".
 */
export async function requestLocale(): Promise<string> {
  try {
    return await getLocale();
  } catch {
    return "en";
  }
}
