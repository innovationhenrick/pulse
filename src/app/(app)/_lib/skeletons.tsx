// Route loading states (spec §5.19): the real shells and each section's own box with its static
// titles and labels; only values are bars, so nothing moves when data arrives. Headers never skeleton.
import { Fragment } from "react"
import { DASHBOARD_DEFAULT, DASHBOARD_LABEL, type DashboardKey } from "@/lib/dashboard"
import { IntradayHrChartSkeleton } from "@/components/charts/IntradayHrChart"
import { EnergyBankChartSkeleton } from "@/components/charts/EnergyBankChart"
import { ZoneBarsSkeleton } from "@/components/charts/ZoneBars"
import { TimelineSkeleton } from "@/components/metrics/ActivityCard"
import { WeeklyTrendsSkeleton } from "@/components/metrics/WeeklyTrends"
import { InsightCardSkeleton } from "@/components/metrics/InsightCard"
import { KeyStatRowSkeleton } from "@/components/metrics/KeyStatRow"
import { Wordmark } from "@/components/brand/Wordmark"
import { ScoreDialSkeleton } from "@/components/metrics/ScoreDial"
import { SleepStagesSkeleton } from "@/components/metrics/SleepStages"
import { TickScaleSkeleton } from "@/components/metrics/TickScale"
import { DetailShell } from "@/components/shells/DetailShell"
import { PageShell } from "@/components/shells/PageShell"
import { SectionShell } from "@/components/shells/SectionShell"
import { Card, CARD_MATERIAL } from "@/components/ui/card"
import { Skeleton, SkeletonText } from "@/components/ui/skeleton"
import { ENERGY_INFO, STRAIN_RECOVERY_INFO, TONIGHT_INFO } from "./info"
import { CAPTION, LABEL, LEGEND, STAT_ICON } from "./view"
import { lazy, tr } from "@/lib/locale-context"

const rows = (n: number, Row: (i: number) => React.ReactNode) => Array.from({ length: n }, (_, i) => <Fragment key={i}>{Row(i)}</Fragment>)

const SUMMARY: Record<string, string[]> = lazy(() => ({
  Strain: [tr("Strain Target", "Meta de Esforço"), tr("Heart rate zones 1-3", "Zonas de frequência cardíaca 1-3"), tr("Heart rate zones 4-5", "Zonas de frequência cardíaca 4-5"), tr("Strength activity time", "Tempo de treino de força"), tr("Steps", "Passos")],
  Sleep: [tr("Hours vs. needed", "Horas vs. necessárias"), tr("Sleep consistency", "Consistência do sono"), tr("Sleep efficiency", "Eficiência do sono")],
}))

function CardSkeleton({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <SectionShell variant="card" title={title} level={2} className={className}>
      <div aria-hidden>{children}</div>
    </SectionShell>
  )
}

/** A monitor card body: the chip box and two lines. */
function MonitorLineSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="size-7 rounded-md" />
      <span className="min-w-0 flex-1">
        <SkeletonText className={`${LABEL} w-24`} />
        {/* A phone's half-width card wraps the status word (tr("Within range", "Dentro da faixa")) onto a second line. */}
        <SkeletonText className={`${LABEL} w-12 md:hidden`} />
        <SkeletonText className={`${CAPTION} w-16`} />
      </span>
    </div>
  )
}

/** The 32 px icon link in a Home card's header (open Strain, Journal, Sleep Planner). */
const ICON_SLOT = <span aria-hidden className="block size-8" />

/** Home's 56 px gradient banner rows (day outlook, week in review). */
const BannerSkeleton = () => <Skeleton className="h-14 rounded-2xl" />

/** `stats`: My Dashboard's chosen metrics (getHome's order), so the skeleton has as many rows as the page will. */
export function HomeSkeleton({ stats = DASHBOARD_DEFAULT }: { stats?: DashboardKey[] }) {
  return (
    <PageShell loading
      title={tr("Home", "Início")}
      layout="home"
      slots={{
        top: (
          <div aria-busy className="max-md:-mt-2 md:pt-4 xl:pt-2">
            <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:items-center xl:gap-x-6">
              <div className="space-y-3 md:space-y-4 xl:col-start-1 xl:row-start-1">
                <span aria-hidden className="flex justify-center text-foreground-secondary">
                  <Wordmark className="h-[17px]" />
                </span>
                <div className="grid grid-cols-3 items-start justify-items-center">
                  <ScoreDialSkeleton size="md" variant="sleep" />
                  <ScoreDialSkeleton size="md" variant="recovery" />
                  <ScoreDialSkeleton size="md" variant="strain" />
                </div>
              </div>
              {/* Today's coach cards (HomeInsight): a title and two lines, the next card peeking underneath. */}
              <div aria-hidden className="relative pb-2 xl:col-span-2 xl:row-start-2">
                <div className="absolute inset-x-5 bottom-0 h-8 rounded-b-2xl bg-card/60" />
                <div className={`${CARD_MATERIAL} relative space-y-0.5 p-5 pr-12 xl:p-6 xl:pr-14`}>
                  <SkeletonText className="w-40 text-base leading-[22px]" />
                  <SkeletonText className="w-full text-[15px] leading-5" />
                  <SkeletonText className="w-2/3 text-[15px] leading-5 xl:hidden" />
                  <SkeletonText className="w-1/2 text-[15px] leading-5 md:hidden" />
                  <span className="absolute top-2 right-2 h-12 w-6 rounded-lg bg-foreground/8" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 xl:col-start-2 xl:row-start-1 xl:grid-cols-1 xl:gap-4">
                <SectionShell variant="card" title={tr("Health Monitor", "Monitor de saúde")} info={false} href="/health/monitor" level={2}>
                  <MonitorLineSkeleton />
                </SectionShell>
                <SectionShell variant="card" title={tr("Stress Monitor", "Monitor de estresse")} info={false} href="/health/stress" level={2}>
                  <MonitorLineSkeleton />
                </SectionShell>
              </div>
            </div>
          </div>
        ),
        main: (
          <SectionShell
            variant="section"
            title={tr("My Day", "Meu dia")}
            className="xl:flex xl:h-full xl:flex-col"
            action={<span aria-hidden className="block size-[34px] rounded-[10px] bg-foreground/90" />}
          >
            <div className="flex flex-col gap-3 xl:flex-1 xl:gap-4">
              <BannerSkeleton />
              <SectionShell variant="card" title={tr("Today’s activities", "Atividades de hoje")} action={ICON_SLOT}>
                <TimelineSkeleton />
                <Skeleton className="mt-3 h-12 rounded-xl" />
              </SectionShell>
              <SectionShell variant="card" title={tr("My journal", "Meu diário")} action={ICON_SLOT}>
                <div className="grid grid-cols-7 pt-1">
                  {rows(7, () => (
                    <div className="flex min-h-16 flex-col items-center justify-center gap-2">
                      <SkeletonText className={`${LABEL} w-[3ch]`} />
                      <span className="size-7 rounded-full ring-1 ring-foreground/25 ring-inset" />
                    </div>
                  ))}
                </div>
                <Skeleton className="mt-3 h-12 rounded-xl" />
              </SectionShell>
              <div className="grid grid-cols-1 gap-3 xl:flex-1 xl:grid-cols-2 xl:gap-4">
                <SectionShell variant="card" title={tr("Energy Bank", "Banco de Energia")} info={ENERGY_INFO} fill>
                  <div className="flex flex-1 flex-col gap-4">
                    <div className="space-y-1.5">
                      <TickScaleSkeleton />
                      <SkeletonText className={`${CAPTION} w-32`} />
                    </div>
                    <EnergyBankChartSkeleton />
                    <div className="mt-auto grid grid-cols-2 gap-3">
                      <Skeleton className="h-[68px] rounded-lg" />
                      <Skeleton className="h-[68px] rounded-lg" />
                    </div>
                    <div className="space-y-1">{rows(3, () => <SkeletonText className={`${CAPTION} w-28`} />)}</div>
                  </div>
                </SectionShell>
                <SectionShell variant="card" title={tr("Tonight’s sleep", "Sono desta noite")} info={TONIGHT_INFO} action={ICON_SLOT} fill>
                  <div className="flex flex-1 flex-col gap-4">
                    <Skeleton className="my-auto h-[60px] rounded-lg bg-muted/60" />
                    <Skeleton className="mt-auto h-11 rounded-lg" />
                    <SkeletonText className={`${CAPTION} w-28`} />
                  </div>
                </SectionShell>
              </div>
            </div>
          </SectionShell>
        ),
        aside: (
          <SectionShell variant="section" title={tr("My Dashboard", "Meu painel")} aside="vs. 30-day average" action={ICON_SLOT} className="xl:flex xl:h-full xl:flex-col">
            <ul aria-hidden className="space-y-2">
              {stats.map((key) => (
                <li key={key}>
                  <KeyStatRowSkeleton variant="card" label={DASHBOARD_LABEL[key]} icon={STAT_ICON[key]} />
                </li>
              ))}
            </ul>
            <SectionShell variant="card" title={tr("Strain & recovery", "Esforço e recuperação")} info={STRAIN_RECOVERY_INFO} fill className="mt-3 xl:mt-4 xl:flex-1">
              <div aria-hidden className="flex flex-1 flex-col">
                <Skeleton className="h-[232px] rounded-lg bg-muted/60 xl:h-auto xl:min-h-[232px] xl:flex-1" />
              </div>
            </SectionShell>
          </SectionShell>
        ),
        bottom: <BannerSkeleton />,
      }}
    />
  )
}

/** Recovery, Strain and Sleep (spec §7.2-§7.4): the date as the header title, the dial with the notched summary card. */
function DialDetail({
  title,
  dial,
  summary,
  primary,
  secondary,
  action = false,
  footer,
}: {
  title: string
  dial: "recovery" | "strain" | "sleep"
  /** The insight card links on (Recovery, Strain). */
  action?: boolean
  summary: React.ReactNode
  primary: React.ReactNode
  secondary: React.ReactNode[]
  footer?: React.ReactNode
}) {
  return (
    <DetailShell loading
      footer={footer}
      title={title}
      dateSwitcher={{ mode: "day", placement: "header", steppers: false }}
      notch
      hero={<ScoreDialSkeleton size="lg" variant={dial} />}
      summary={
        <Card aria-hidden className="gap-0 px-4 py-1 ring-0">
          {summary}
        </Card>
      }
      insight={<InsightCardSkeleton action={action} />}
      primary={primary}
      secondary={secondary}
    />
  )
}

const statRows = (labels: string[]) => (
  <div className="divide-y divide-border">
    {labels.map((l) => (
      <KeyStatRowSkeleton key={l} variant="row" label={l} />
    ))}
  </div>
)

export function RecoverySkeleton() {
  return (
    <DialDetail
      title={tr("Recovery", "Recuperação")}
      dial="recovery"
      action
      summary={
        <>
          {statRows([tr("Heart rate variability", "Variabilidade da frequência cardíaca"), tr("Resting heart rate", "Frequência cardíaca de repouso"), tr("Respiratory rate", "Frequência respiratória"), tr("Sleep performance", "Desempenho do sono")])}
          <p className={LEGEND}>{tr("Today vs. last 30 days", "Hoje vs. últimos 30 dias")}</p>
        </>
      }
      primary={null}
      footer={<WeeklyTrendsSkeleton titles={[tr("Recovery", "Recuperação"), tr("Heart Rate Variability", "Variabilidade da frequência cardíaca"), tr("Resting Heart Rate", "Frequência cardíaca de repouso"), tr("Respiratory Rate", "Frequência respiratória"), tr("Sleep Performance", "Desempenho do sono")]} />}
      secondary={[]}
    />
  )
}

export function StrainSkeleton() {
  return (
    <DialDetail
      title={tr("Strain", "Esforço")}
      dial="strain"
      action
      summary={
        <>
          {statRows(SUMMARY.Strain)}
          <p className={LEGEND}>{tr("Today vs. prior 30 days", "Hoje vs. 30 dias anteriores")}</p>
        </>
      }
      primary={
        <CardSkeleton title={tr("Heart rate", "Frequência cardíaca")}>
          <IntradayHrChartSkeleton />
        </CardSkeleton>
      }
      secondary={[
        <SectionShell key="zones" variant="card" title={tr("Time in zones", "Tempo nas zonas")} level={2} fill className="xl:row-span-2">
          <div aria-hidden>
            <ZoneBarsSkeleton variant="rows" />
            <SkeletonText className={`${CAPTION} mt-3 w-56`} />
          </div>
        </SectionShell>,
        <CardSkeleton key="activities" title={tr("Activities", "Atividades")}>
          <TimelineSkeleton rows={1} />
        </CardSkeleton>,
      ]}
      footer={<WeeklyTrendsSkeleton titles={[tr("Strain", "Esforço"), tr("HR Zones 1-3", "Zonas de FC 1-3"), tr("HR Zones 4-5", "Zonas de FC 4-5"), tr("Steps", "Passos"), tr("Calories", "Calorias"), tr("Strength Activity Time", "Tempo de treino de força")]} />}
    />
  )
}

/** A measure card's shape (sleep's hours vs. needed and efficiency): the percentage, a bar, then its legend rows. */
function MeasureSkeleton({ rows: labels }: { rows: string[] }) {
  return (
    <div aria-hidden>
      <SkeletonText className="w-24 font-numeric text-4xl leading-10 font-bold" />
      <Skeleton className="mt-4 h-3.5 rounded-[3px]" />
      <dl className="mt-4 space-y-2 rounded-lg bg-inset px-3 py-3">
        {labels.map((l) => (
          <div key={l} className="flex items-center gap-3 text-[13px] leading-4 font-medium">
            <span className="size-3 shrink-0 rounded-[3px] bg-secondary" />
            <dt className="flex-1 text-foreground-secondary">{l}</dt>
            <SkeletonText className="w-[5ch]" />
          </div>
        ))}
      </dl>
    </div>
  )
}

export function SleepSkeleton() {
  return (
    <DialDetail
      title={tr("Sleep", "Sono")}
      dial="sleep"
      summary={
        <>
          {statRows(SUMMARY.Sleep)}
          <p className={LEGEND}>
            <SkeletonText className="w-48" />
          </p>
        </>
      }
      primary={
        <SectionShell variant="card" title={tr("Last night’s sleep", "Sono da noite passada")} aside="vs. prior 30 days" level={2}>
          <SleepStagesSkeleton />
        </SectionShell>
      }
      secondary={[
        <CardSkeleton key="need" title={tr("Hours vs. needed", "Horas vs. necessárias")}>
          <MeasureSkeleton rows={[tr("Healthy minimum", "Mínimo saudável"), tr("Recent strain", "Esforço recente"), tr("Sleep debt", "Dívida de sono")]} />
        </CardSkeleton>,
        <CardSkeleton key="consistency" title={tr("Sleep consistency", "Consistência do sono")}>
          <div className="space-y-4">
            <SkeletonText className="w-24 font-numeric text-4xl leading-10 font-bold" />
            <Skeleton className="h-52 rounded-lg" />
          </div>
        </CardSkeleton>,
        <CardSkeleton key="efficiency" title={tr("Sleep efficiency", "Eficiência do sono")}>
          <div aria-hidden className="space-y-4">
            <SkeletonText className="w-24 font-numeric text-4xl leading-10 font-bold" />
            <Skeleton className="h-3.5 rounded-[3px]" />
            <Skeleton className="h-3.5 rounded-[3px] bg-muted/60" />
            <SkeletonText className={`${LABEL} w-32`} />
          </div>
        </CardSkeleton>,
        <SectionShell key="planner" variant="card" title={tr("Tonight’s sleep", "Sono desta noite")} info={TONIGHT_INFO} level={2}>
          <div aria-hidden className="space-y-2">
            <div className="divide-y divide-border">
              {rows(4, () => (
                <div className="flex min-h-13 items-center gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    <SkeletonText className={`${LABEL} w-20`} />
                    <SkeletonText className={`${CAPTION} mt-0.5 w-24`} />
                  </span>
                  <SkeletonText className="w-[5ch] font-numeric text-xl leading-6 font-bold" />
                </div>
              ))}
            </div>
            <SkeletonText className={`${CAPTION} w-28`} />
          </div>
        </SectionShell>,
      ]}
      footer={<WeeklyTrendsSkeleton titles={[tr("Sleep Performance", "Desempenho do sono"), tr("Hours vs. Needed (hours)", "Horas vs. necessárias (horas)"), tr("Hours vs. Needed (%)", "Horas vs. necessárias (%)"), tr("Restorative Sleep", "Sono restaurador"), tr("Sleep Consistency", "Consistência do sono"), tr("Time in Bed", "Tempo na cama"), tr("Sleep Efficiency", "Eficiência do sono")]} />}
    />
  )
}

export function ActivitySkeleton() {
  return (
    <DetailShell loading
      title={tr("Activity", "Atividade")}
      align="start"
      hero={
        <div aria-hidden className="w-full space-y-2">
          <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
            {[tr("Activity strain", "Esforço da atividade"), tr("Duration", "Duração")].map((l) => (
              <div key={l}>
                <SkeletonText className="w-[3ch] font-numeric text-[34px] leading-none font-bold" />
                <p className={`${LABEL} mt-2 text-foreground-secondary`}>{l}</p>
              </div>
            ))}
          </div>
          <SkeletonText className={`${CAPTION} w-24`} />
        </div>
      }
      primary={
        <div aria-hidden className="space-y-6">
          <IntradayHrChartSkeleton variant="activity" />
          <div>
            <ZoneBarsSkeleton variant="rows" />
            <SkeletonText className={`${CAPTION} mt-3 w-56`} />
          </div>
        </div>
      }
      secondary={[
        <SectionShell key="stats" variant="section" title={tr("Key statistics", "Estatísticas principais")} aside="vs. 30-day average" level={2} className="flex flex-col">
          <div aria-hidden className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-3 xl:gap-4">
            {[
              ["avgHr", tr("Average heart rate", "Frequência cardíaca média")],
              ["maxHr", tr("Max heart rate", "Frequência cardíaca máxima")],
              ["calories", tr("Calories", "Calorias")],
            ].map(([k, l]) => (
              <KeyStatRowSkeleton key={k} variant="tile" label={l} icon={STAT_ICON[k]} />
            ))}
          </div>
        </SectionShell>,
        <SectionShell key="hrr" variant="section" title={tr("Heart rate recovery", "Recuperação da frequência cardíaca")} level={2} className="flex flex-col">
          <Card aria-hidden className="flex-1 justify-center gap-0 p-4 xl:p-5">
            <Skeleton className="h-24 rounded-lg bg-muted/60" />
          </Card>
        </SectionShell>,
      ]}
      footer={<InsightCardSkeleton />}
    />
  )
}
