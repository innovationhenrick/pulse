"use client"

import { useSearchParams } from "next/navigation"
import { DAY, formatDay, type FormatKey } from "@/lib/format"
import type { GoodDirection } from "@/lib/bands"
import type { Metric } from "@/lib/reasons"
import { parseRange, type TrendRange } from "@/lib/url"
import { KeyStatRow } from "@/components/metrics/KeyStatRow"
import { SectionShell } from "@/components/shells/SectionShell"
import type { RangeStats as Stats } from "@/server/queries/metric"
import { lazy, tr } from "@/lib/locale-context"

const RANGE: Record<TrendRange, { label: string; prior: string }> = lazy(() => ({
  w: { label: tr("Last 7 days", "Últimos 7 dias"), prior: tr("the 7 days before", "os 7 dias anteriores") },
  m: { label: tr("Last 30 days", "Últimos 30 dias"), prior: tr("the 30 days before", "os 30 dias anteriores") },
  "6m": { label: tr("Last 6 months", "Últimos 6 meses"), prior: tr("the 6 months before", "os 6 meses anteriores") },
  "1y": { label: tr("Last 12 months", "Últimos 12 meses"), prior: tr("the year before", "o ano anterior") },
}))

type Props = { ranges: Record<TrendRange, Stats>; format: FormatKey; unit?: string; direction: GoodDirection; total: boolean }

const metric = (v: number | null): Metric<number> => (v === null ? { value: null, reason: "no_data", provisional: false } : { value: v, reason: null, provisional: false })

/** The history card's range in words and numbers; follows `?r=` as the chart's toggle sets it. */
export function RangeStats(p: Props) {
  const range = parseRange(useSearchParams().get("r") ?? undefined)
  return <RangeStatsCard {...p} range={range} />
}

/** The card itself, for one range (the Suspense fallback renders the default range). */
export function RangeStatsCard({ ranges, format, unit, direction, total, range }: Props & { range: TrendRange }) {
  const s = ranges[range]
  const r = RANGE[range]
  const row = { variant: "row" as const, format, unit }
  return (
    <SectionShell variant="card" level={2} title={r.label}>
      <div className="divide-y divide-border">
        <KeyStatRow {...row} label={tr("Daily average", "Média diária")} caption={`vs. ${r.prior}`} metric={metric(s.average)} average={s.prior} averageLabel={r.prior} direction={direction} />
        {total && <KeyStatRow {...row} label={tr("Total", "Total")} metric={metric(s.total)} direction="none" />}
        <KeyStatRow {...row} label={tr("Highest", "Mais alto")} caption={s.high ? formatDay(s.high.day, DAY.short) : undefined} metric={metric(s.high?.value ?? null)} direction="none" />
        <KeyStatRow {...row} label={tr("Lowest", "Mais baixo")} caption={s.low ? formatDay(s.low.day, DAY.short) : undefined} metric={metric(s.low?.value ?? null)} direction="none" />
        <KeyStatRow variant="row" format="int" unit={tr(`of ${s.days}`, `de ${s.days}`)} label={tr("Days with data", "Dias com dados")} metric={metric(s.withData)} direction="none" />
      </div>
    </SectionShell>
  )
}
