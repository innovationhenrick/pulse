import { Rabbit, Turtle } from "lucide-react"
import { cn } from "@/lib/utils"
import { ageLabel, formatValue, MISSING } from "@/lib/format"
import { getHealthspan } from "@/server/queries/health"
import type { HealthspanVM } from "@/server/queries/types"
import { TrendChart } from "@/components/charts/TrendChart"
import { InsightCard } from "@/components/metrics/InsightCard"
import { TickScale } from "@/components/metrics/TickScale"
import { AgeOrb } from "@/components/metrics/AgeOrb"
import { DetailShell } from "@/components/shells/DetailShell"
import { EmptyState } from "@/components/shells/EmptyState"
import { SectionShell } from "@/components/shells/SectionShell"
import { ContributorCard } from "./ContributorCard"
import { pageDay, type SearchParams } from "../../_lib/day"
import { CAPTION } from "@/components/metrics/primitives"
import { tr } from "@/lib/locale-context"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  return { title: (await getTranslations("meta.healthspan"))("title") }
}

const info = () => ({
  title: tr("About Healthspan", "Sobre o Healthspan"),
  body: (
    <p>
      {tr(
        `${ageLabel()} estimates how old your body behaves, from nine habits and vitals measured over the last 6 months. Pace of Aging compares your last 30 days with those 6 months: 1.0x means aging at the normal rate, below 1.0x slower, above 1.0x faster. Both are estimates for personal insight, not a medical assessment.`,
        `A ${ageLabel()} estima a idade que seu corpo aparenta, a partir de nove hábitos e sinais vitais medidos nos últimos 6 meses. O Ritmo de envelhecimento compara seus últimos 30 dias com esses 6 meses: 1,0x significa envelhecer no ritmo normal, abaixo de 1,0x mais devagar, acima de 1,0x mais rápido. Ambos são estimativas para conhecimento pessoal, não uma avaliação médica.`,
      )}
    </p>
  ),
})

/** The one glow in the app (spec §2.6, docs/design/orb.md): the Pulse Age orb. `compact`: the collapsed header's 108 px orb. */
function Orb({ vm, compact }: { vm: HealthspanVM; compact?: boolean }) {
  const r = vm.result.value
  if (compact)
    // Hangs 8 px below the stats' centre line, about 30 px past the band, as in [latest-healthspan-collapsed-2].
    return (
      <div className="translate-y-2">
        <AgeOrb compact age={r?.pulseAge ?? null} deltaYears={r?.deltaYears ?? null} reason={vm.result.reason} />
      </div>
    )
  return (
    <div className="flex flex-col items-center gap-3">
      <AgeOrb age={r?.pulseAge ?? null} deltaYears={r?.deltaYears ?? null} provisional={vm.result.provisional} reason={vm.result.reason} size={300} />
      <p className={cn(CAPTION, "text-center tabular-nums")}>
        {r ? tr(`Your age: ${formatValue("decimal1", vm.age)}`, `Sua idade: ${formatValue("decimal1", vm.age)}`) : tr("Healthspan needs 20 days of data.", "O Healthspan precisa de 20 dias de dados.")}
      </p>
      {r && vm.result.provisional && <p className={cn(CAPTION, "text-center")}>{tr("Healthspan firms up after 20 days of data.", "O Healthspan se firma depois de 20 dias de dados.")}</p>}
    </div>
  )
}

/** Healthspan `/health/healthspan?d=` (spec §7.7): the ISO week containing `d`. */
export default async function HealthspanPage({ searchParams }: PageProps<"/health/healthspan">) {
  const { d, ctx } = await pageDay(searchParams as SearchParams, "/health/healthspan")
  const vm = await getHealthspan(d, ctx)
  const r = vm.result.value
  const pace = r ? { value: r.pace, reason: null, provisional: r.paceProvisional } : { value: null, reason: vm.result.reason, provisional: false }
  const hasHistory = vm.history.some((p) => p.value !== null)
  const group = (g: "sleep" | "strain" | "fitness") => vm.contributors.filter((c) => c.group === g)
  const n = vm.nextUpdateInDays
  // Collapsed header stats ([latest-healthspan-collapsed-1..5]): years younger in green, older in amber; pace in white.
  const older = !!r && r.deltaYears > 0
  const stats = {
    left: {
      value: r ? formatValue("decimal1", Math.abs(r.deltaYears)) : MISSING,
      label: older ? tr("Years older", "Anos mais velho") : tr("Years younger", "Anos mais novo"),
      tone: r ? (older ? "warning" : "optimal") : undefined,
    },
    right: { value: r ? `${formatValue("decimal1", r.pace)}x` : MISSING, label: tr("Pace of aging", "Ritmo de envelhecimento") },
  } as const

  return (
    <DetailShell
      title="Healthspan"
      subtitle={n > 0 ? tr(`Next update in ${n} ${n === 1 ? "day" : "days"}`, `Próxima atualização em ${n} ${n === 1 ? "dia" : "dias"}`) : undefined}
      dateSwitcher={{ mode: "week" }}
      info={info()}
      ground="healthspan"
      hero={<Orb vm={vm} />}
      stats={stats}
      collapse
      summary={
        <SectionShell variant="card" title={tr("Pace of Aging", "Ritmo de envelhecimento")}>
          <TickScale
            variant="marker"
            label={tr("Pace of Aging", "Ritmo de envelhecimento")}
            metric={pace}
            min={-1}
            max={3}
            format="decimal1"
            unit="x"
            describe={r ? (r.pace < 1 ? tr("aging slower than your 6-month average", "envelhecendo mais devagar que sua média de 6 meses") : r.pace > 1 ? tr("aging faster than your 6-month average", "envelhecendo mais rápido que sua média de 6 meses") : tr("aging at the normal rate", "envelhecendo no ritmo normal")) : undefined}
            ends={["−1.0x", "1.0x", "3.0x"]}
            leading={
              <>
                <Turtle aria-hidden strokeWidth={1.75} /> {tr("Slow", "Lento")}
              </>
            }
            trailing={
              <>
                {tr("Fast", "Rápido")} <Rabbit aria-hidden strokeWidth={1.75} />
              </>
            }
          />
          <p className={cn(CAPTION, "mt-3")}>
            {r?.paceProvisional
              ? tr("Pace of Aging uses a 6-month window. It firms up as history builds.", "O Ritmo de envelhecimento usa uma janela de 6 meses. Ele se firma conforme o histórico cresce.")
              : tr(`Compares your last 30 days with your 6-month ${ageLabel()}.`, `Compara seus últimos 30 dias com a sua ${ageLabel()} de 6 meses.`)}
          </p>
        </SectionShell>
      }
      insight={vm.insight && <InsightCard title={vm.insight.title} body={vm.insight.body} />}
      primary={
        <SectionShell variant="card" title={tr(`${ageLabel()} history`, `Histórico da ${ageLabel()}`)}>
          {hasHistory ? (
            <TrendChart
              label={ageLabel()}
              data={{ value: vm.history.map((p) => ({ date: p.day, value: p.value })), reason: null, provisional: false }}
              format="decimal1"
              colorBy="single"
              fixedRange="6m"
              reference={{ y: vm.age, label: tr("Your age", "Sua idade") }}
            />
          ) : (
            <EmptyState body={tr("History builds one week at a time.", "O histórico se forma uma semana de cada vez.")} />
          )}
        </SectionShell>
      }
      secondary={[
        <ContributorCard key="sleep" title={tr("Sleep", "Sono")} items={group("sleep")} />,
        // Strain (4 inputs) spans two rows; Sleep (2) and Fitness (3) stack beside it on laptop (U18 HS-01), and it
        // stretches to their bottom, its rows spread evenly, so both columns end on one line (SYM6).
        <ContributorCard key="strain" title={tr("Strain", "Esforço")} items={group("strain")} className="xl:row-span-2" />,
        <ContributorCard key="fitness" title={tr("Fitness", "Condicionamento")} items={group("fitness")} />,
      ]}
    />
  )
}
