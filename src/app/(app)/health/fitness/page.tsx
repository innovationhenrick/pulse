import { connection } from "next/server"
import { cn } from "@/lib/utils"
import { DAY, formatDay, formatValue } from "@/lib/format"
import { userCtx } from "@/server/queries/common"
import { getFitness } from "@/server/queries/health"
import type { FitnessVM } from "@/server/queries/types"
import { TrendChart } from "@/components/charts/TrendChart"
import { CAPTION, LABEL, MetricTags, StatusChip, ValueUnit } from "@/components/metrics/primitives"
import { ReasonPlaceholder } from "@/components/metrics/ReasonPlaceholder"
import { TickScale } from "@/components/metrics/TickScale"
import { DetailShell } from "@/components/shells/DetailShell"
import { EmptyState } from "@/components/shells/EmptyState"
import { SectionShell } from "@/components/shells/SectionShell"
import { categoryTone, categoryWord, ordinal } from "../format"
import { LoadChart } from "./LoadChart"
import { lazy, tr } from "@/lib/locale-context"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  return { title: (await getTranslations("meta.fitness"))("title") }
}

const BODY = "text-[15px] leading-[22px] text-pretty text-foreground-secondary"
// Both thresholds follow the pipeline: ACWR shows after 14 days of strain (readiness `minChronic`), fitness and fatigue
// after 14 days in a row (training load `minimumDays`).
const noLoad = () => tr("Training load needs 14 days of strain.", "A carga de treino precisa de 14 dias de esforço.")
const noFfs = () => tr("Fitness, fatigue and form need 14 days of strain in a row.", "Condicionamento, fadiga e forma precisam de 14 dias seguidos de esforço.")

const info = () => ({
  title: tr("About Fitness", "Sobre o condicionamento"),
  body: (
    <p>
      {tr(
        "VO2 max is the most oxygen your body can use during hard exercise. Pulse ranks it against people of your age and sex from the FRIEND registry. Training load compares your last 7 days of strain with your last 28 (the acute to chronic ratio); 0.8 to 1.3 is the usual sweet spot.",
        "O VO2 máx. é o máximo de oxigênio que seu corpo consegue usar num exercício intenso. O Pulse o compara com pessoas da sua idade e sexo no registro FRIEND. A carga de treino compara seus últimos 7 dias de esforço com os últimos 28 (a razão aguda/crônica); de 0,8 a 1,3 é a faixa ideal habitual.",
      )}
    </p>
  ),
})

const STATUS: Record<NonNullable<FitnessVM["trainingLoad"]["value"]>["status"], { word: string; body: string }> = lazy(() => ({
  detraining: { word: tr("Detraining", "Destreino"), body: tr("Detraining: your recent load is well below your usual. Fitness slowly drops if this lasts.", "Destreino: sua carga recente está bem abaixo do seu normal. O condicionamento cai aos poucos se isso durar.") },
  optimal: { word: tr("Optimal", "Ideal"), body: tr("Optimal: your recent load matches what you are used to.", "Ideal: sua carga recente combina com o que você está acostumado.") },
  pushing: { word: tr("Pushing", "Forçando"), body: tr("Pushing: load is rising faster than usual. Watch your Recovery.", "Forçando: a carga está subindo mais rápido que o normal. Fique de olho na sua Recuperação.") },
  high_risk: { word: tr("High risk", "Risco alto"), body: tr("High risk: load jumped well above your usual. Injury and illness risk rise.", "Risco alto: a carga saltou bem acima do seu normal. O risco de lesão e doença aumenta.") },
}))
const categories = () => ["poor", "fair", "good", "excellent", "superior"].map(categoryWord)

function Hero({ vo2 }: { vo2: FitnessVM["vo2"] }) {
  const v = vo2.value
  if (!v) return <EmptyState body={tr("No VO2 max yet. Fitbit estimates it from runs and resting heart rate.", "Ainda sem VO2 máx. O Fitbit o estima a partir de corridas e da frequência cardíaca de repouso.")} />
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <ValueUnit value={formatValue("decimal1", v.value)} unit="ml/kg/min" className="font-numeric text-[64px] leading-none font-bold tracking-[-0.01em] md:text-[72px]" />
      <p className="flex items-center gap-3">
        <span className={LABEL}>{tr("VO2 max", "VO2 máx.")}</span>
        <span className={cn(LABEL, categoryTone(v.category))}>{categoryWord(v.category)}</span>
      </p>
      <p className={CAPTION}>{v.source === "run" ? tr(`From a run on ${formatDay(v.sourceDay, DAY.monthDay)}`, `De uma corrida em ${formatDay(v.sourceDay, DAY.monthDay)}`) : tr("Daily estimate from Fitbit", "Estimativa diária do Fitbit")}</p>
      {vo2.provisional && <MetricTags extra={["estimate"]} />}
    </div>
  )
}

/** Fitness `/health/fitness` (spec §7.10): latest values, no date switcher. */
export default async function FitnessPage() {
  await connection()
  const vm = await getFitness(await userCtx())
  const v = vm.vo2.value
  const tl = vm.trainingLoad.value

  return (
    <DetailShell
      title={tr("Fitness", "Condicionamento")}
      info={info()}
      hero={<Hero vo2={vm.vo2} />}
      summary={
        v && (
          <SectionShell variant="card" title={tr("Percentile", "Percentil")}>
            <TickScale
              variant="marker"
              label={tr("VO2 max percentile", "Percentil do VO2 máx.")}
              metric={{ value: v.percentile, reason: null, provisional: false }}
              min={0}
              max={100}
              format="int"
              describe={tr(`${categoryWord(v.category)} for ${v.sex === "male" ? "men" : "women"} ${v.ageBand}`, `${categoryWord(v.category)} para ${v.sex === "male" ? "homens" : "mulheres"} de ${v.ageBand}`)}
              bands={[
                { from: 0, to: 39.9, tone: "warning" },
                { from: 60, to: 100, tone: "optimal" },
              ]}
              ends={["0", "50", "100"]}
            />
            <div aria-hidden className={cn(CAPTION, "mt-2 grid grid-cols-5 text-center")}>
              {categories().map((c) => (
                <span key={c} className={cn("truncate", c === categoryWord(v.category) && "font-bold text-foreground")}>
                  {c}
                </span>
              ))}
            </div>
            <p className={cn(CAPTION, "mt-3")}>
              {tr(`${ordinal(v.percentile)} percentile for ${v.sex === "male" ? "men" : "women"} ${v.ageBand} (FRIEND registry).`, `${ordinal(v.percentile)} percentil para ${v.sex === "male" ? "homens" : "mulheres"} de ${v.ageBand} (registro FRIEND).`)}
            </p>
          </SectionShell>
        )
      }
      primary={
        <SectionShell variant="card" title={tr("VO2 max trend", "Tendência do VO2 máx.")}>
          <TrendChart
            label={tr("VO2 max", "VO2 máx.")}
            data={{ value: vm.trend.points.map((p) => ({ date: p.day, value: p.value })), reason: null, provisional: false }}
            unit="ml/kg/min"
            format="decimal1"
            colorBy="single"
            direction="up"
            defaultRange="6m"
          />
        </SectionShell>
      }
      secondary={[
        <SectionShell key="load" variant="card" title={tr("Training load", "Carga de treino")}>
          {tl ? (
            <div className="space-y-4">
              <p className="flex items-center gap-3">
                <span className="font-numeric text-4xl leading-10 font-bold tracking-[-0.01em] tabular-nums">{formatValue("decimal2", tl.acwr)}</span>
                <StatusChip tone={tl.tone}>{STATUS[tl.status].word}</StatusChip>
              </p>
              <TickScale
                variant="marker"
                label={tr("Training load", "Carga de treino")}
                metric={vm.trainingLoad.value ? { value: tl.acwr, reason: null, provisional: false } : null}
                min={0.5}
                max={2}
                format="decimal2"
                bands={[
                  { from: 0.8, to: 1.3, tone: "optimal" },
                  { from: 1.5, to: 2, tone: "warning" },
                ]}
                ends={["0.5", "1.0", "1.5", "2.0"]}
              />
              <p className={BODY}>{STATUS[tl.status].body}</p>
            </div>
          ) : (
            <ReasonPlaceholder reason="calibrating" size="md" copy={noLoad()} />
          )}
        </SectionShell>,
        <SectionShell key="ffs" variant="card" title={tr("Fitness, fatigue and form", "Condicionamento, fadiga e forma")}>
          {vm.loadReason ? (
            <ReasonPlaceholder reason={vm.loadReason.reason} size="md" copy={noFfs()} />
          ) : (
            <>
              <LoadChart load={vm.load} />
              <p className={cn(CAPTION, "mt-2")}>{tr("Fitness is your 42-day load, fatigue your 7-day load, form the difference.", "Condicionamento é a sua carga de 42 dias, fadiga a de 7 dias e forma a diferença.")}</p>
            </>
          )}
        </SectionShell>,
      ]}
    />
  )
}
