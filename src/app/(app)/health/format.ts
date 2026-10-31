import { formatValue } from "@/lib/format"
import { isPt } from "@/lib/locale-context"
import { tr } from "@/lib/locale-context"

const ORDINAL = new Intl.PluralRules("en-US", { type: "ordinal" })
const SUFFIX: Partial<Record<Intl.LDMLPluralRule, string>> = { one: "st", two: "nd", few: "rd" }

/** 78 → "78th" ("78º" in Portuguese); the English suffix comes from Intl.PluralRules. */
export const ordinal = (n: number) => {
  const r = Math.round(n)
  if (isPt()) return `${r}º`
  return `${r}${SUFFIX[ORDINAL.select(r)] ?? "th"}`
}

/** "2.3 years younger" / "1.0 years older" / "Same as your age" (spec §6), with its tone class. */
export function ageDelta(delta: number) {
  const v = formatValue("decimal1", Math.abs(delta))
  if (Number(Math.abs(delta).toFixed(1)) === 0) return { text: tr("Same as your age", "Igual à sua idade"), tone: "text-foreground-secondary" }
  return delta < 0 ? { text: tr(`${v}\u00a0years younger`, `${v}\u00a0anos mais novo`), tone: "text-optimal-text" } : { text: tr(`${v}\u00a0years older`, `${v}\u00a0anos mais velho`), tone: "text-warning-text" }
}

/** "excellent" (the core's key) → "Excellent". */
export const categoryWord = (c: string) => {
  const k = c.toLowerCase()
  const pt: Record<string, string> = { poor: "Fraco", fair: "Razoável", good: "Bom", excellent: "Excelente", superior: "Superior" }
  return tr(c.charAt(0).toUpperCase() + c.slice(1).toLowerCase(), pt[k] ?? c)
}

/** VO2 max category word colour (spec §7.6). */
export function categoryTone(c: string) {
  const k = c.toLowerCase()
  return k === "excellent" || k === "superior" ? "text-optimal-text" : k === "good" ? "text-foreground" : "text-warning-text"
}
