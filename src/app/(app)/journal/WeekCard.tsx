import { formatDay, locale } from "@/lib/format"
import type { WeekDay } from "@/server/queries/log"
import { ColumnChart } from "@/components/charts/ColumnChart"
import { CAPTION, LABEL } from "@/components/metrics/primitives"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { tr } from "@/lib/locale-context"

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null)
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null
}

/** Journal's week beside the log: water and food for the seven days ending on the selected day, that day highlighted. */
export function WeekCard({ week, day }: { week: WeekDay[]; day: string }) {
  const rows = [
    { key: "water" as const, title: tr("Water", "Água"), unit: "ml" },
    { key: "kcal" as const, title: tr("Food", "Comida"), unit: "kcal" },
  ]
  return (
    <Card className="gap-4 px-4 py-4 xl:px-5">
      {rows.map((r) => {
        const a = avg(week.map((w) => w[r.key]))
        return (
          <section key={r.key} aria-label={tr(`${r.title}, last 7 days`, `${r.title}, últimos 7 dias`)} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className={LABEL}>{r.title}</h3>
              <span className={cn(CAPTION, "tabular-nums")}>{a === null ? tr("No data", "Sem dados") : tr(`avg ${a.toLocaleString(locale())} ${r.unit}`, `méd. ${a.toLocaleString(locale())} ${r.unit}`)}</span>
            </div>
            <ColumnChart
              summary={tr(`${r.title} per day for the 7 days to ${formatDay(day, { month: "short", day: "numeric" })}`, `${r.title} por dia nos 7 dias até ${formatDay(day, { month: "short", day: "numeric" })}`)}
              format="grouped"
              unit={r.unit}
              data={week.map((w) => ({ label: formatDay(w.day, { weekday: "short" }), title: formatDay(w.day, { weekday: "short", month: "short", day: "numeric" }), value: w[r.key], highlight: w.day === day }))}
            />
          </section>
        )
      })}
    </Card>
  )
}
