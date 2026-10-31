import { cn } from "@/lib/utils"
import { clock, dayLabel, durationWords, hmm } from "@/lib/format"
import { getStress } from "@/server/queries/health"
import type { StressVM } from "@/server/queries/types"
import { StressChart } from "@/components/charts/StressChart"
import { TrendChart } from "@/components/charts/TrendChart"
import { InsightCard } from "@/components/metrics/InsightCard"
import { ScoreDial } from "@/components/metrics/ScoreDial"
import { DetailShell } from "@/components/shells/DetailShell"
import { EmptyState } from "@/components/shells/EmptyState"
import { MetricState } from "@/components/shells/MetricState"
import { SectionShell } from "@/components/shells/SectionShell"
import { stressSeries } from "../../_lib/view"
import { Skeleton } from "@/components/ui/skeleton"
import { pageDay, type SearchParams } from "../../_lib/day"
import { tr } from "@/lib/locale-context"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  return { title: (await getTranslations("meta.stress"))("title") }
}

const empty = () => tr("No still minutes to score yet today.", "Ainda sem minutos de repouso para pontuar hoje.")
const levels = () => [
  { swatch: "bg-stress-low", text: tr("Low, 0.0 - 0.9: you might be feeling calm, relaxed or sleepy.", "Baixo, 0,0 - 0,9: você pode estar calmo, relaxado ou com sono.") },
  { swatch: "bg-stress-medium", text: tr("Medium, 1.0 - 1.9: neutral, alert or mildly activated.", "Médio, 1,0 - 1,9: neutro, alerta ou levemente ativado.") },
  { swatch: "bg-stress-high", text: tr("High, 2.0 - 3.0: excited, stressed or highly activated.", "Alto, 2,0 - 3,0: animado, estressado ou muito ativado.") },
]

const info = () => ({
  title: tr("About Stress Monitor", "Sobre o Monitor de estresse"),
  body: (
    <>
      <p>{tr("Stress Monitor scores how activated your body is, from 0 to 3, by comparing your heart rate with your daytime resting baseline.", "O Monitor de estresse pontua o quanto seu corpo está ativado, de 0 a 3, comparando sua frequência cardíaca com a sua base de repouso durante o dia.")}</p>
      <ul className="space-y-2">
        {levels().map((l) => (
          <li key={l.swatch} className="flex items-start gap-3">
            <span aria-hidden className={cn("mt-1.5 size-2.5 shrink-0 rounded-sm", l.swatch)} />
            {l.text}
          </li>
        ))}
      </ul>
      <p>{tr("Pulse only scores still minutes. Movement, workouts and sleep are left out, so a walk never counts as stress.", "O Pulse só pontua minutos de repouso. Movimento, treinos e sono ficam de fora, então uma caminhada nunca conta como estresse.")}</p>
    </>
  ),
})

const LEVEL_KEYS = [
  { key: "lowMin", get word() { return tr("Low", "Baixo") }, bar: "bg-stress-low", text: "text-stress-low-text" },
  { key: "mediumMin", get word() { return tr("Medium", "Médio") }, bar: "bg-stress-medium", text: "text-stress-medium-text" },
  { key: "highMin", get word() { return tr("High", "Alto") }, bar: "bg-stress-high", text: "text-stress-high-text" },
] as const

function LevelBar({ m, className }: { m: { lowMin: number; mediumMin: number; highMin: number }; className: string }) {
  return (
    <div aria-hidden className={cn("flex gap-0.5 overflow-hidden rounded-sm", className)}>
      {LEVEL_KEYS.map((k) => m[k.key] > 0 && <span key={k.key} className={k.bar} style={{ flexGrow: m[k.key] }} />)}
    </div>
  )
}

function TotalDay({ l, day }: { l: NonNullable<StressVM["levels"]["value"]>; day: string }) {
  const total = l.lowMin + l.mediumMin + l.highMin
  if (!total) return <EmptyState body={empty()} />
  return (
    <div className="space-y-4">
      <p className="text-xs leading-4 font-bold tracking-[0.1em] uppercase">
        {tr(`${day} stress`, `Estresse · ${day}`)}{l.typical && <span className="text-muted-foreground"> {tr("vs. typical", "vs. típico de")} {l.weekday}</span>}
      </p>
      <div className="space-y-1.5">
        <LevelBar m={l} className="h-3" />
        {l.typical && <LevelBar m={l.typical} className="h-2 opacity-50" />}
      </div>
      <ul className="grid grid-cols-3 gap-3">
        {LEVEL_KEYS.map((k) => (
          <li key={k.key} aria-label={`${k.word}: ${durationWords(Math.round(l[k.key]))}${l.typical ? `, ${tr("typical", "típico")} ${durationWords(Math.round(l.typical[k.key]))}` : ""}`}>
            <p aria-hidden className={cn("font-numeric text-xl leading-6 font-bold tabular-nums", k.text)}>
              {hmm(l[k.key])}
            </p>
            <p aria-hidden className="mt-1 text-xs leading-4 font-bold tracking-[0.1em] uppercase">
              {k.word}
            </p>
            {l.typical && (
              <p aria-hidden className="mt-0.5 font-numeric text-xs leading-4 font-medium text-muted-foreground tabular-nums">
                {hmm(l.typical[k.key])} {tr("typical", "típico")}
              </p>
            )}
          </li>
        ))}
      </ul>
      {typicalLine(l) && <p className="text-xs leading-4 font-medium text-muted-foreground">{typicalLine(l)}</p>}
    </div>
  )
}

function typicalLine(l: NonNullable<StressVM["levels"]["value"]>) {
  if (l.typicalDeltaMin === null) return null
  const m = Math.round(l.typicalDeltaMin)
  const delta = Math.abs(m) < 1 ? tr("about the same high stress", "praticamente o mesmo estresse alto") : tr(`${durationWords(Math.abs(m))} ${m > 0 ? "more" : "less"} high stress`, `${durationWords(Math.abs(m))} ${m > 0 ? "a mais" : "a menos"} de estresse alto`)
  return tr(`vs. your typical ${l.weekday}: ${delta}`, `vs. o seu típico de ${l.weekday}: ${delta}`)
}

export default async function StressPage({ searchParams }: PageProps<"/health/stress">) {
  const { d, today, timeZone, timeFormat, ctx } = await pageDay(searchParams as SearchParams, "/health/stress")
  const vm = await getStress(d, ctx)
  const g = vm.gauge

  return (
    <DetailShell
      title={tr("Stress Monitor", "Monitor de estresse")}
      dateSwitcher={{ mode: "day" }}
      info={info()}
      hero={
        <div className="flex flex-col items-center gap-2">
        <ScoreDial
          variant="gauge"
          size="lg"
          value={g.value?.value ?? null}
          reason={g.reason}
          provisional={g.provisional}
          caption={g.value ? (g.value.dayAverage || !vm.isToday ? tr("Day average", "Média do dia") : g.value.at ? tr(`Last updated ${clock(g.value.at, timeZone, timeFormat)}`, `Atualizado às ${clock(g.value.at, timeZone, timeFormat)}`) : undefined) : undefined}
        />
        {g.reason === "no_data" && <p className="max-w-[36ch] text-center text-xs leading-4 font-medium text-muted-foreground">{empty()}</p>}
        </div>
      }
      insight={vm.insight && <InsightCard body={vm.insight} />}
      primary={
        <SectionShell variant="card" title={vm.isToday ? tr("Today", "Hoje") : dayLabel(d, today)} info={{ title: tr("Stress throughout the day", "Estresse ao longo do dia"), body: tr("Body activation during still minutes, from 0 to 3. Movement, workouts and sleep appear as excluded periods rather than stress scores.", "Ativação do corpo durante minutos de repouso, de 0 a 3. Movimento, treinos e sono aparecem como períodos excluídos, e não como pontuações de estresse.") }}>
          <StressChart variant="full" data={stressSeries(vm.chart)} />
        </SectionShell>
      }
      secondary={[
        <SectionShell key="levels" variant="card" title={tr("Total day", "Total do dia")} info={{ title: tr("Time at each stress level", "Tempo em cada nível de estresse"), body: tr("Scored still minutes split into low, medium and high activation. When available, the faded bar compares the same weekday in your recent history.", "Minutos de repouso pontuados, divididos em ativação baixa, média e alta. Quando disponível, a barra clara compara o mesmo dia da semana no seu histórico recente.") }}>
          <MetricState metric={vm.levels} skeleton={<Skeleton className="h-24 w-full" />} renderReason={() => <EmptyState body={empty()} />}>
            {(l) => <TotalDay l={l} day={vm.isToday ? tr("Today", "Hoje") : dayLabel(d, today)} />}
          </MetricState>
        </SectionShell>,
        <SectionShell key="trend" variant="card" title={tr("30-day trend", "Tendência de 30 dias")} info={{ title: tr("Daily stress trend", "Tendência diária de estresse"), body: tr("Average activation across each day's scored still minutes over the last 30 days. Days without enough data remain gaps.", "Ativação média nos minutos de repouso pontuados de cada dia, nos últimos 30 dias. Dias sem dados suficientes ficam como lacunas.") }}>
          <TrendChart
            label={tr("Stress", "Estresse")}
            data={{ value: vm.trend.points.map((p) => ({ date: p.day, value: p.value })), reason: null, provisional: false }}
            format="decimal1"
            colorBy="stress"
            direction="down"
            fixedRange="m"
          />
        </SectionShell>,
      ]}
    />
  )
}
