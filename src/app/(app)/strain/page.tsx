import { Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatValue } from "@/lib/format"
import { reasonCopy } from "@/lib/reasons"
import { activityHref, trendHref } from "@/lib/url"
import { IntradayHrChart } from "@/components/charts/IntradayHrChart"
import { ZoneBars } from "@/components/charts/ZoneBars"
import { ActivityCard } from "@/components/metrics/ActivityCard"
import { InsightCard } from "@/components/metrics/InsightCard"
import { KeyStatRow } from "@/components/metrics/KeyStatRow"
import { ScoreDial } from "@/components/metrics/ScoreDial"
import { MetricTags } from "@/components/metrics/primitives"
import { DetailShell } from "@/components/shells/DetailShell"
import { EmptyState } from "@/components/shells/EmptyState"
import { InfoButton } from "@/components/shells/InfoButton"
import { SectionShell } from "@/components/shells/SectionShell"
import { Card } from "@/components/ui/card"
import { getStrain } from "@/server/queries/strain"
import { getWeeklyTrends, type TrendViewKey } from "@/server/queries/trendView"
import { WeeklyTrends } from "@/components/metrics/WeeklyTrends"
import type { StrainVM } from "@/server/queries/types"
import { pageDay, type SearchParams } from "../_lib/day"
import { STRAIN_INFO, STRAIN_TARGET_INFO } from "../_lib/info"
import { CAPTION, hrSeries, LABEL, statProps, TodayVsLegend } from "../_lib/view"
import { getTranslations } from "next-intl/server"
import { tr } from "@/lib/locale-context"

export async function generateMetadata() {
  const t = await getTranslations("meta.strain")
  return { title: t("title"), description: t("description") }
}

/** Weekly Trends in the reference app's order (strain-weekly-trends-*). */
const WEEKLY: readonly TrendViewKey[] = ["strain", "zones13", "zones45", "steps", "calories", "strength"]

/** Strain `/strain?d=` (spec §7.3). */
export default async function StrainPage({ searchParams }: PageProps<"/strain">) {
  const { d, today, timeZone, ctx } = await pageDay(searchParams as SearchParams, "/strain")
  const [vm, weekly] = await Promise.all([getStrain(d, ctx), getWeeklyTrends(WEEKLY, d, ctx)])
  const s = vm.strain
  const t = vm.target.value

  return (
    <DetailShell
      title={tr("Strain", "Esforço")}
      info={STRAIN_INFO}
      dateSwitcher={{ mode: "day", placement: "header", steppers: false }}
      notch
      hero={
        <ScoreDial
          variant="strain"
          size="lg"
          value={s.value}
          reason={s.reason}
          target={t ? [t.low, t.high] : null}
          extraTags={vm.soFar && s.value !== null ? ["so_far"] : undefined}
        />
      }
      summary={
        <Card className="gap-0 px-4 py-1 ring-0">
          <div className="divide-y divide-border">
            <TargetRow vm={vm} />
            {vm.summary.map((k) => (
              <KeyStatRow key={k.key} variant="row" {...statProps(k, { d, today })} />
            ))}
          </div>
          <TodayVsLegend period={tr("prior 30 days", "os 30 dias anteriores")} />
        </Card>
      }
      insight={vm.coach && <InsightCard body={vm.coach} action={{ label: tr("Explore your strain insights", "Explore seus insights de esforço"), href: trendHref("strain", { d, today }) }} />}
      primary={
        <SectionShell variant="card" title={tr("Heart rate", "Frequência cardíaca")} level={2}>
          <IntradayHrChart data={hrSeries(vm.hr, vm.maxHr)} />
        </SectionShell>
      }
      secondary={[
        <SectionShell key="zones" variant="card" title={tr("Time in zones", "Tempo nas zonas")} level={2} fill className="xl:row-span-2">
          <ZoneBars variant="rows" data={vm.zones} note={vm.zoneNote} emptyCopy={vm.isToday ? tr("No heart-rate zones yet today.", "Ainda sem zonas de frequência cardíaca hoje.") : tr("No heart-rate zones on this day.", "Sem zonas de frequência cardíaca neste dia.")} />
        </SectionShell>,
        <SectionShell key="activities" variant="card" title={tr("Activities", "Atividades")} level={2}>
          {vm.activities.length ? (
            <div className="space-y-1.5">
              {vm.activities.map((a) => (
                <ActivityCard key={a.id} name={a.name} kind={a.activityKind} strain={a.strain} start={a.start} end={a.end} distanceKm={a.distanceKm} paceS={a.paceS} href={activityHref(a.id)} timeZone={timeZone} />
              ))}
            </div>
          ) : (
            <EmptyState body={tr("No activities on this day.", "Sem atividades neste dia.")} />
          )}
        </SectionShell>,
      ]}
      footer={<WeeklyTrends cards={weekly} d={d} today={today} />}
    />
  )
}

/** "Strain Target 12.0 - 15.0": a range, so it is drawn beside the KeyStatRows rather than as one (no arrow). */
function TargetRow({ vm }: { vm: StrainVM }) {
  const t = vm.target
  const text = t.value ? `${formatValue("decimal1", t.value.low)} - ${formatValue("decimal1", t.value.high)}` : "--"
  const reason = t.value ? null : reasonCopy(t.reason, t.nightsLeft).short
  return (
    <div className="flex min-h-13 items-center gap-3 py-2">
      <span className="sr-only">{reason ? `${tr("Strain Target", "Meta de Esforço")}: ${reason}` : `${tr("Strain Target", "Meta de Esforço")} ${text.replace(" - ", tr(" to ", " a "))}`}</span>
      <span aria-hidden className="grid size-5 shrink-0 place-items-center text-muted-foreground [&_svg]:size-5">
        <Flame strokeWidth={1.75} />
      </span>
      <span aria-hidden className="min-w-0 flex-1">
        <span className={cn(LABEL, "block text-balance")}>{tr("Strain Target", "Meta de Esforço")}</span>
        {reason && <span className={cn(CAPTION, "mt-0.5 block truncate")}>{reason}</span>}
        {t.value?.estimate && <MetricTags extra={["estimate"]} className="mt-1 justify-start" />}
      </span>
      <InfoButton info={STRAIN_TARGET_INFO} label={tr("Strain Target", "Meta de Esforço")} variant="card" />
      {/* Same grid as KeyStatRow's value + arrow column, so the values right-align down the card. */}
      <span aria-hidden className="grid shrink-0 grid-cols-[auto_8px] gap-x-2">
        <span className={cn("font-numeric text-xl leading-6 font-bold tabular-nums", reason && "text-muted-foreground")}>{text}</span>
      </span>
      {/* The rows below end on a chevron: keep its column so the values still line up. */}
      <span aria-hidden className="size-4 shrink-0" />
    </div>
  )
}
