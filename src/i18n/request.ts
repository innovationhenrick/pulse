import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getRequestConfig } from "next-intl/server";
import { currentUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { profile } from "@/server/db/schema";
import { INTL_TAG, setFormatLocale } from "@/lib/locale-context";
import { DEFAULT_LOCALE, fromAcceptLanguage, isLocale, LOCALE_COOKIE, type Locale } from "./config";

/**
 * Signed in: the language saved on the account (it follows the person to every device). Signed out: this device's
 * cookie, then the browser's language, then English.
 */
async function resolveLocale(): Promise<Locale> {
  const user = await currentUser().catch(() => null);
  if (user) {
    const [row] = await getDb().select({ locale: profile.locale }).from(profile).where(eq(profile.userId, user.userId));
    if (row) return row.locale;
  }
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return fromAcceptLanguage((await headers()).get("accept-language")) ?? DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  // Dates, numbers and spoken labels in lib/format.ts follow the language, for this request only.
  setFormatLocale(INTL_TAG[locale]);
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
