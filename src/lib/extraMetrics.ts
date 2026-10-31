// Google Health daily roll-ups Pulse shows as they come, without scoring them (docs/research/google-health-coverage.md).
// One entry per metric: My Dashboard, Trends and the daily export all read this list, so adding a metric here
// (and its value path in src/server/sources/google/map.ts) is all it takes to show it.
import type { GoodDirection } from "./bands"
import type { FormatKey } from "./format"
import { tr } from "./locale-context"

export type ExtraMetric = {
  key: string
  label: string
  /** Shown after the value; minutes use h:mm via `format` instead. */
  unit?: string
  format: FormatKey
  direction: GoodDirection
  /** My Dashboard's editor group. Every extra opens its own detail screen, `/metric/<key>`. */
  group: "activity" | "nutrition" | "vitals"
  /** Accrues through the day: today is a gap in trends, not a low bar. */
  partialToday?: boolean
}

export const EXTRA_METRICS = [
  { key: "distance", get label() { return tr("Distance", "Distância") }, unit: "km", format: "decimal2", direction: "up", group: "activity", partialToday: true },
  { key: "floors", get label() { return tr("Floors", "Andares") }, format: "grouped", direction: "up", group: "activity", partialToday: true },
  { key: "elevation", get label() { return tr("Elevation gain", "Ganho de elevação") }, unit: "m", format: "int", direction: "up", group: "activity", partialToday: true },
  { key: "active_minutes", get label() { return tr("Active minutes", "Minutos ativos") }, format: "duration", direction: "up", group: "activity", partialToday: true },
  { key: "light_minutes", get label() { return tr("Light activity", "Atividade leve") }, format: "duration", direction: "up", group: "activity", partialToday: true },
  { key: "azm", get label() { return tr("Active Zone Minutes", "Minutos em zona ativa") }, format: "duration", direction: "up", group: "activity", partialToday: true },
  { key: "active_calories", get label() { return tr("Active calories", "Calorias ativas") }, unit: "kcal", format: "grouped", direction: "neutral", group: "activity", partialToday: true },
  { key: "sedentary_minutes", get label() { return tr("Sedentary time", "Tempo sedentário") }, format: "duration", direction: "down", group: "activity", partialToday: true },
  { key: "avg_hr", get label() { return tr("Average heart rate", "Frequência cardíaca média") }, unit: "bpm", format: "int", direction: "neutral", group: "activity" },
  { key: "water", get label() { return tr("Water", "Água") }, unit: "ml", format: "grouped", direction: "up", group: "nutrition", partialToday: true },
  { key: "calories_in", get label() { return tr("Calories eaten", "Calorias consumidas") }, unit: "kcal", format: "grouped", direction: "neutral", group: "nutrition", partialToday: true },
  { key: "protein", get label() { return tr("Protein", "Proteína") }, unit: "g", format: "int", direction: "neutral", group: "nutrition", partialToday: true },
  { key: "carbs", get label() { return tr("Carbohydrates", "Carboidratos") }, unit: "g", format: "int", direction: "neutral", group: "nutrition", partialToday: true },
  { key: "fat", get label() { return tr("Fat", "Gordura") }, unit: "g", format: "int", direction: "neutral", group: "nutrition", partialToday: true },
  { key: "glucose", get label() { return tr("Blood glucose", "Glicose no sangue") }, unit: "mg/dL", format: "int", direction: "neutral", group: "vitals" },
  { key: "core_temp", get label() { return tr("Core temperature", "Temperatura corporal") }, unit: "°C", format: "decimal1", direction: "neutral", group: "vitals" },
  { key: "swim_strokes", get label() { return tr("Swim strokes", "Braçadas de natação") }, format: "grouped", direction: "up", group: "activity", partialToday: true },
] as const satisfies readonly ExtraMetric[]

export type ExtraKey = (typeof EXTRA_METRICS)[number]["key"]

export const EXTRA_KEYS = EXTRA_METRICS.map((m) => m.key) as ExtraKey[]

export const extraMetric = (key: ExtraKey): ExtraMetric => EXTRA_METRICS.find((m) => m.key === key)!
