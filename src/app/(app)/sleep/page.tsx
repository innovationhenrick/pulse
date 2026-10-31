import { cn } from "@/lib/utils"
import { clock, hmm, type TimeFormat } from "@/lib/format"
import { FEATURES } from "@/lib/features"
import { trendHref } from "@/lib/url"
import { InsightCard } from "@/components/metrics/InsightCard"
import { KeyStatRow } from "@/components/metrics/KeyStatRow"
import { ReasonPlaceholder } from "@/components/metrics/ReasonPlaceholder"
import { ScoreDial } from "@/components/metrics/ScoreDial"
import { SleepStages } from "@/components/metrics/SleepStages"
import { DetailShell } from "@/components/shells/DetailShell"
import { SectionShell } from "@/components/shells/SectionShell"
import { Card } from "@/components/ui/card"
import { getSleep } from "@/server/queries/sleep"
import { getWeeklyTrends, type TrendViewKey } from "@/server/queries/trendView"
import { WeeklyTrends } from "@/components/metrics/WeeklyTrends"
import type { SleepVM } from "@/server/queries/types"
import { pageDay, type SearchParams } from "../_lib/day"
import { HashScroll } from "../_lib/HashScroll"
import { SLEEP_INFO, TONIGHT_INFO } from "../_lib/info"
import { CAPTION, LABEL, LEGEND, statProps } from "../_lib/view"
import { HoursVsNeed, SleepConsistency, SleepEfficiency, SleepStress } from "./SleepCards"
import { getTranslations } from "next-intl/server"
import { tr } from "@/lib/locale-context"

export async function generateMetadata() {
  const t = await getTranslations("meta.sleep")
  return { title: t("title"), description: t("description") }
}

const statusLegend = () =>
  [
    ["bg-warning", tr("Poor", "Ruim")],
    ["bg-foreground-secondary", tr("Sufficient", "Suficiente")],
    ["bg-optimal", tr("Optimal", "Ótimo")],
  ] as const

/** Weekly Trends, in the reference app's order (sleep-weekly-trends-*). */
const WEEKLY: readonly TrendViewKey[] = ["sleep", "hours", "hours_need", "restorative", "consistency", "time_in_bed", "efficiency"]

export default async function SleepPage({ searchParams }: PageProps<"/sleep">) {
  const { d, today, timeZone, timeFormat, ctx } = await pageDay(searchParams as SearchParams, "/sleep")
  const [vm, weekly] = await Promise.all([getSleep(d, ctx), getWeeklyTrends(WEEKLY, d, ctx)])
  const p = vm.performance

  return (
    <DetailShell
      title={tr("Sleep", "Sono")}
      info={SLEEP_INFO}
      dateSwitcher={{ mode: "day", placement: "header", steppers: false }}
      notch
      hero={
        <ScoreDial
          variant="sleep"
          size="lg"
          value={p.value}
          reason={p.reason}
          nightsLeft={p.nightsLeft}
          provisional={p.provisional}
          tags={p.tags}
          status={p.value === null ? undefined : p.value >= 85 ? "optimal" : p.value >= 70 ? "sufficient" : "poor"}
        />
      }
      summary={
        <Card className="gap-0 px-4 py-1 ring-0">
          <div className="divide-y divide-border">
            {vm.summary.map((k) => (
              <KeyStatRow key={k.key} variant="row" {...statProps(k, { d, today })} average={null} direction="none" />
            ))}
          </div>
          <p className={cn(LEGEND, "flex flex-wrap items-center gap-x-4 gap-y-1")}>
            {statusLegend().map(([swatch, word]) => (
              <span key={word} className="inline-flex items-center gap-1.5">
                <span aria-hidden className={cn("h-1 w-4 rounded-sm", swatch)} />
                {word}
              </span>
            ))}
          </p>
        </Card>
      }
      insight={vm.insight && <InsightCard body={vm.insight} action={{ label: tr("Explore your sleep insights", "Explore seus insights de sono"), href: trendHref("sleep", { d, today }) }} />}
      primary={
        <SectionShell variant="card" title={tr("Last night’s sleep", "Sono da noite passada")} aside={tr("vs. prior 30 days", "vs. 30 dias anteriores")} level={2}>
          <SleepStages hours={vm.hours} hr={vm.nightHr} data={vm.stages} restorative={vm.restorative} />
        </SectionShell>
      }
      secondary={[
        <SectionShell key="need" variant="card" title={tr("Hours vs. needed", "Horas vs. necessárias")} level={2}>
          <HoursVsNeed vm={vm} />
        </SectionShell>,
        <SectionShell key="consistency" variant="card" title={tr("Sleep consistency", "Consistência do sono")} level={2}>
          <SleepConsistency vm={vm} />
        </SectionShell>,
        <SectionShell key="efficiency" variant="card" title={tr("Sleep efficiency", "Eficiência do sono")} level={2}>
          <SleepEfficiency vm={vm} />
        </SectionShell>,
        FEATURES.sleepStress && (
          <SectionShell key="stress" variant="card" title={tr("Sleep stress", "Estresse durante o sono")} level={2}>
            <SleepStress vm={vm} />
          </SectionShell>
        ),
        <SectionShell key="planner" variant="card" title={tr("Tonight’s sleep", "Sono desta noite")} id="planner" info={TONIGHT_INFO} level={2}>
          <Planner vm={vm} timeZone={timeZone} timeFormat={timeFormat} />
          <HashScroll />
        </SectionShell>,
      ].filter(Boolean)}
      footer={<WeeklyTrends cards={weekly} d={d} today={today} />}
    />
  )
}

function Planner({ vm, timeZone, timeFormat }: { vm: SleepVM; timeZone: string; timeFormat: TimeFormat }) {
  const m = vm.planner
  if (m.value === null)
    return (
      <ReasonPlaceholder
        reason={m.reason}
        nightsLeft={m.nightsLeft}
        size="md"
        copy={m.reason === "calibrating" ? tr("Sleep Planner needs 7 nights to learn your wake time.", "O Planejador de Sono precisa de 7 noites para aprender seu horário de acordar.") : undefined}
      />
    )
  const plan = m.value
  const row = (label: string, caption: string, time: string) => (
    <div key={label} className="flex min-h-13 items-center gap-3 py-2">
      <span className="min-w-0 flex-1">
        <span className={cn(LABEL, "block truncate")}>{label}</span>
        <span className={cn(CAPTION, "mt-0.5 block truncate")}>{caption}</span>
      </span>
      <span className="font-numeric text-xl leading-6 font-bold tabular-nums">{time}</span>
    </div>
  )
  return (
    <div className="space-y-2">
      <div className="divide-y divide-border">
        {plan.plans.map((p) => row(p.label, tr(`${Math.round(p.share * 100)}% of need`, `${Math.round(p.share * 100)}% da necessidade`), clock(p.bedtimeAt, timeZone, timeFormat)))}
        {row(tr("Typical wake", "Despertar típico"), plan.weekdayWake ? tr("Weekday wake time", "Horário de acordar em dias úteis") : tr("Weekend wake time", "Horário de acordar no fim de semana"), clock(plan.wakeAt, timeZone, timeFormat))}
      </div>
      <p className={CAPTION}>
        {tr("Need tonight:", "Necessidade desta noite:")} <span className="font-numeric tabular-nums">{hmm(plan.needMin)}</span>
      </p>
    </div>
  )
}
