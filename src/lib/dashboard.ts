// Home's My Dashboard catalogue: every metric the Home view model can show, grouped as the editor lists them
// (spec §7.1 row 8, §11 CD1, CD2). Stored keys are these keys; never rename one.
import type { GoodDirection } from "./bands"
import { EXTRA_METRICS, type ExtraKey } from "./extraMetrics"
import type { FormatKey } from "./format"
import { metricHref } from "./url"
import { tr } from "./locale-context"

export const DASHBOARD_GROUPS = [
  { key: "recovery", get label() { return tr("Recovery & sleep", "Recuperação e sono") } },
  { key: "activity", get label() { return tr("Activity", "Atividade") } },
  { key: "body", get label() { return tr("Body", "Corpo") } },
  { key: "nutrition", get label() { return tr("Nutrition", "Nutrição") } },
  { key: "vitals", get label() { return tr("Vitals", "Sinais vitais") } },
] as const
export type DashboardGroup = (typeof DASHBOARD_GROUPS)[number]["key"]

/** The eight v1 rows; their units and reasons live in the Home query (`keyStats`). */
const CORE = [
  { key: "hrv", get label() { return tr("Heart rate variability", "Variabilidade da frequência cardíaca") }, group: "recovery" },
  { key: "rhr", get label() { return tr("Resting heart rate", "Frequência cardíaca de repouso") }, group: "recovery" },
  { key: "resp", get label() { return tr("Respiratory rate", "Frequência respiratória") }, group: "vitals" },
  { key: "sleep", get label() { return tr("Sleep performance", "Desempenho do sono") }, group: "recovery" },
  { key: "calories", get label() { return tr("Calories", "Calorias") }, group: "activity" },
  { key: "steps", get label() { return tr("Steps", "Passos") }, group: "activity" },
  { key: "spo2", get label() { return tr("Blood oxygen", "Oxigênio no sangue") }, group: "vitals" },
  { key: "skin", get label() { return tr("Skin temperature", "Temperatura da pele") }, group: "vitals" },
] as const

/**
 * The reference app's other rows (dashboard-customize-*, dashboard-tiles-new-metrics*). Keys match the Trend View each opens where there is one;
 * "(weekly)" rows total the 7 days ending on the day and compare with the same 7-day total over the prior 30 days.
 */
const SCORED = [
  { key: "recovery", get label() { return tr("Recovery", "Recuperação") }, group: "recovery" },
  { key: "consistency", get label() { return tr("Sleep consistency", "Consistência do sono") }, group: "recovery" },
  { key: "hours", get label() { return tr("Hours of sleep", "Horas de sono") }, group: "recovery" },
  { key: "restorative_pct", get label() { return tr("Restorative sleep (%)", "Sono restaurador (%)") }, group: "recovery" },
  { key: "restorative", get label() { return tr("Restorative sleep (hours)", "Sono restaurador (horas)") }, group: "recovery" },
  { key: "debt", get label() { return tr("Sleep debt", "Dívida de sono") }, group: "recovery" },
  { key: "strain", get label() { return tr("Day strain", "Esforço do dia") }, group: "activity" },
  { key: "zones13", get label() { return tr("HR zones 1-3 (weekly)", "Zonas de FC 1-3 (semanal)") }, group: "activity" },
  { key: "zones45", get label() { return tr("HR zones 4-5 (weekly)", "Zonas de FC 4-5 (semanal)") }, group: "activity" },
  { key: "zones_all", get label() { return tr("HR zones all (weekly)", "Todas as zonas de FC (semanal)") }, group: "activity" },
  { key: "strength", get label() { return tr("Strength activity time (weekly)", "Tempo de treino de força (semanal)") }, group: "activity" },
  { key: "vo2max", get label() { return tr("VO2 max", "VO2 máx.") }, group: "body" },
  { key: "lean_mass", get label() { return tr("Lean body mass", "Massa magra") }, group: "body" },
] as const
export type ScoredKey = (typeof SCORED)[number]["key"]

/** Stress Monitor: a chart tile rather than a row (the day's stress line), placed and reordered like any metric. */
const STRESS = { key: "stress", get label() { return tr("Stress Monitor", "Monitor de estresse") }, group: "recovery" } as const

/** Google's weight and body-fat readings (daily_metrics); each opens its detail screen. */
export const BODY_METRICS = [
  { key: "weight", get label() { return tr("Weight", "Peso") }, unit: "kg", format: "decimal1", direction: "neutral", href: metricHref("weight") },
  { key: "body_fat", get label() { return tr("Body fat", "Gordura corporal") }, unit: "%", format: "decimal1", direction: "neutral", href: metricHref("body_fat") },
] as const satisfies readonly { key: string; label: string; unit: string; format: FormatKey; direction: GoodDirection; href: string }[]
export type BodyKey = (typeof BODY_METRICS)[number]["key"]

export type DashboardKey = (typeof CORE)[number]["key"] | ScoredKey | typeof STRESS.key | BodyKey | ExtraKey

const ALL: { key: DashboardKey; label: string; group: DashboardGroup }[] = [
  ...CORE,
  ...SCORED,
  STRESS,
  ...BODY_METRICS.map((m) => ({ key: m.key, label: m.label, group: "body" as const })),
  ...EXTRA_METRICS.map((m) => ({ key: m.key, label: m.label, group: m.group })),
]

/** Every metric, in editor order: by group, then catalogue order within it. */
export const DASHBOARD_METRICS = DASHBOARD_GROUPS.flatMap((g) => ALL.filter((m) => m.group === g.key))

export const DASHBOARD_LABEL = Object.fromEntries(ALL.map((m) => [m.key, m.label])) as Record<DashboardKey, string>

export const isDashboardKey = (k: string): k is DashboardKey => Object.hasOwn(DASHBOARD_LABEL, k)

/** The default list, the reference app's (dashboard-customize-reorder); installs that never saved a list follow it. */
export const DASHBOARD_DEFAULT: DashboardKey[] = ["hrv", "sleep", "consistency", "hours", "stress", "rhr", "vo2max", "steps"]

/** The default for an account that has never synced heart rate (phone only, no Fitbit band): what its phone counts. */
export const PHONE_DEFAULT: DashboardKey[] = ["steps", "distance", "calories", "active_minutes", "active_calories", "floors"]

/** Phone Home's lead card (spec §11 CD2): what a phone records without a band. */
export const PHONE_STATS: DashboardKey[] = ["steps", "distance", "calories", "active_minutes"]
