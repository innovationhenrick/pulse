// Interface languages. Add one here, in messages/<code>.json and in the profile.locale enum (db/schema.ts).
export const LOCALES = ["en", "pt-BR"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Cookie that keeps the language for signed-out pages (login, sign-up) and for the next visit on this device. */
export const LOCALE_COOKIE = "pulse-locale";

/** The name each language calls itself, shown in the picker whatever the current language is. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", "pt-BR": "Português (Brasil)" };

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);

/** First supported language in an Accept-Language header ("pt-PT" and "pt" both map to pt-BR), else null. */
export function fromAcceptLanguage(header: string | null): Locale | null {
  for (const part of (header ?? "").split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase();
    if (tag === "pt" || tag.startsWith("pt-")) return "pt-BR";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }
  return null;
}
