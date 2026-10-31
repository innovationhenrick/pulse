// Shared by the Trends page and its loading shape.
import type { TrendRange } from "@/lib/url"
import { TREND_GROUPS, TREND_METRICS, type TrendMetricKey } from "@/server/queries/trends"
import { MetricSheet } from "./MetricSheet"
import { lazy, tr } from "@/lib/locale-context"

/** Chart card beside the Averages card from 1280 px. */
export const TRENDS_GRID = "grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:items-start xl:gap-4"

export const PERIOD: Record<TrendRange, { label: string; prior: string }> = lazy(() => ({
  w: { label: tr("Last 7 days", "Últimos 7 dias"), prior: tr("the 7 days before", "os 7 dias anteriores") },
  m: { label: tr("Last 30 days", "Últimos 30 dias"), prior: tr("the 30 days before", "os 30 dias anteriores") },
  "6m": { label: tr("Last 6 months", "Últimos 6 meses"), prior: tr("the 6 months before", "os 6 meses anteriores") },
  "1y": { label: tr("Last 12 months", "Últimos 12 meses"), prior: tr("the year before", "o ano anterior") },
}))

/**
 * The metric picker (spec §7.17): one row naming the section and metric on show; it opens a sheet on a phone and a
 * popover of every section from 768 px (MetricSheet). A choice keeps `?r=`.
 */
export function MetricPicker({ current, r }: { current?: TrendMetricKey; r?: string }) {
  const groups = TREND_GROUPS.map((g) => ({ group: g, metrics: TREND_METRICS.filter((m) => m.group === g).map(({ key, label }) => ({ key, label })) }))
  return <MetricSheet groups={groups} current={current} r={r} />
}
