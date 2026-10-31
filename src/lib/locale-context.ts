import { cache } from "react";

// The language the Intl formatters and spoken labels in format.ts use. Those functions are plain and synchronous (76
// files call them, on the server and in the browser), so the language is ambient rather than a parameter.
//
// - Server Components: one box per request. React's cache() is scoped to the request, so two people on different
//   languages never see each other's dates. src/i18n/request.ts fills it before the page renders.
// - Browser, and the server-side pass over Client Components: a module variable, set from the language provider
//   (FormatLocale). In the browser that is exactly one person; the server pass is the only place it can be shared, and
//   it only differs from the browser's when two languages are rendered at the same instant (the browser then repaints).
export const INTL_TAG = { en: "en-US", "pt-BR": "pt-BR" } as const;
export type IntlTag = (typeof INTL_TAG)[keyof typeof INTL_TAG];

const requestBox = cache(() => ({ tag: "en-US" as IntlTag }));
let shared: IntlTag = "en-US";

/** True where cache() really is per request (Server Components); elsewhere it hands out a fresh box on every call. */
const scoped = () => requestBox() === requestBox();

export function setFormatLocale(tag: IntlTag) {
  if (scoped()) requestBox().tag = tag;
  else shared = tag;
}

export function formatLocale(): IntlTag {
  return scoped() ? requestBox().tag : shared;
}

export const isPt = () => formatLocale() === "pt-BR";

/**
 * Picks the copy for the interface language: `tr("Sleep", "Sono")`. For text that lives in plain code (lib copy, view
 * models built on the server); JSX text goes through next-intl messages instead. Call it where the text is used,
 * never at module load: the language is per request, so a module-level constant would freeze the first one.
 */
export const tr = <T,>(en: T, pt: T): T => (isPt() ? pt : en);

/**
 * A constant table whose text depends on the language: `lazy(() => ({ green: tr("Green", "Verde") }))` reads like the
 * plain object it replaces (`BAND_WORD[band]`, `key in TABLE`, Object.keys) but is rebuilt on every access, so it
 * follows the language of the request instead of the one that was active when the module first loaded.
 */
export function lazy<T extends object>(make: () => T): T {
  return new Proxy({} as T, {
    get: (_, key) => (make() as Record<PropertyKey, unknown>)[key],
    has: (_, key) => key in make(),
    ownKeys: () => Reflect.ownKeys(make()),
    getOwnPropertyDescriptor: (_, key) => ({ enumerable: true, configurable: true, value: (make() as Record<PropertyKey, unknown>)[key] }),
  });
}
