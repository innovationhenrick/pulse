"use client"

import { useLocale } from "next-intl"
import { INTL_TAG, setFormatLocale } from "@/lib/locale-context"
import type { Locale } from "@/i18n/config"

/**
 * Hands the interface language to the formatters in lib/format.ts for client-side renders. It renders before its
 * siblings (first inside the provider), so every component under it formats in the right language on its first pass.
 */
export function FormatLocale() {
  setFormatLocale(INTL_TAG[useLocale() as Locale])
  return null
}
