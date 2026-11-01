import { cn } from "@/lib/utils"
import { CARD_MATERIAL } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { userCtx } from "@/server/queries/common"
import { getJournalInsights } from "@/server/queries/journal"
import type { ImpactMetricKey, JournalInsightsVM } from "@/server/queries/types"
import { DetailShell } from "@/components/shells/DetailShell"
import { ImpactList, MetricToggle } from "./Impacts"
import { lazy, tr } from "@/lib/locale-context"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  return { title: (await getTranslations("meta.behaviourInsights"))("title") }
}

const WORD: Record<ImpactMetricKey, string> = lazy(() => ({ recovery: tr("Recovery", "Recuperação"), hrv: tr("HRV", "VFC"), sleep: tr("sleep performance", "desempenho do sono") }))
const TITLE: Record<ImpactMetricKey, string> = lazy(() => ({ recovery: tr("Recovery", "Recuperação"), hrv: tr("HRV", "VFC"), sleep: tr("Sleep", "Sono") }))
const parseMetric = (raw: string | string[] | undefined): ImpactMetricKey => {
  const v = Array.isArray(raw) ? raw[0] : raw
  return v === "hrv" || v === "sleep" ? v : "recovery"
}

/** Journal Insights `/journal/insights?m=` (spec §7.12, journey 7). */
export default async function JournalInsightsPage({ searchParams }: PageProps<"/journal/insights">) {
  const metric = parseMetric((await searchParams).m)
  const vm = await getJournalInsights(metric, await userCtx())

  return (
    <DetailShell
      title={tr("Behaviour insights", "Insights de comportamento")}
      hero={
        // Top-aligned beside the list on laptop (spec §7.12 wireframe), and no wider than the hero column.
        <div data-hero-align="start" className="w-full space-y-4 xl:w-[360px]">
          <div className="space-y-2">
            <h2 className="text-[22px] leading-7 font-semibold tracking-[-0.01em] text-balance xl:text-2xl">{tr(`${TITLE[metric]} impact analysis`, `Análise de impacto: ${TITLE[metric]}`)}</h2>
            <p className="max-w-[65ch] text-[15px] leading-[22px] text-pretty text-foreground-secondary">
              {tr(`How each behaviour changed your next-day ${WORD[metric]} over the last 90 days. Tap a behaviour for details.`, `Como cada comportamento mudou seu(sua) ${WORD[metric]} do dia seguinte nos últimos 90 dias. Toque num comportamento para ver os detalhes.`)}
            </p>
            <p className="text-xs leading-4 font-medium text-muted-foreground">{tr("Updated daily", "Atualizado diariamente")}</p>
          </div>
          <MetricToggle metric={metric} />
          {/* Laptop: "Keep logging to unlock" fills the hero column under the toggle instead of sitting alone in a half
              row under the list (SYM10). Phone keeps it after the list (the footer copy), so the order there is unchanged. */}
          {vm.needsMore.length > 0 && <Unlock id="unlock-xl" needsMore={vm.needsMore} word={WORD[metric]} className="hidden pt-4 xl:block" />}
        </div>
      }
      summary={<ImpactList vm={vm} />}
      footer={
        <>
          {/* Phone and tablet: after the list, as before. Laptop shows it in the hero column instead. */}
          {vm.needsMore.length > 0 && <Unlock id="unlock" needsMore={vm.needsMore} word={WORD[metric]} className="xl:hidden" />}
          <p className="text-xs leading-4 font-medium text-pretty text-muted-foreground">
            {tr("Effects are differences in averages, not proof of cause. Change one habit at a time to see what it really does.", "Os efeitos são diferenças entre médias, não prova de causa. Mude um hábito por vez para ver o que ele realmente faz.")}
          </p>
        </>
      }
    />
  )
}

/** the reference app's "Keep logging to unlock" group [latest-journal-insights-1]: one card row per behaviour. */
function Unlock({ id, needsMore, word, className }: { id: string; needsMore: JournalInsightsVM["needsMore"]; word: string; className?: string }) {
  return (
    <section aria-labelledby={`${id}-title`} className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <h2 id={`${id}-title`} className="text-xs leading-4 font-bold tracking-[0.1em] uppercase">
          {tr("Keep logging to unlock", "Continue registrando para liberar")}
        </h2>
        <p className="max-w-[65ch] text-[15px] leading-[22px] text-pretty text-muted-foreground">
          {tr(`Log a behaviour as Yes on at least 5 days and No on at least 5 to see how it changes your next-day ${word}.`, `Registre um comportamento como Sim em pelo menos 5 dias e Não em pelo menos 5 para ver como ele muda seu(sua) ${word} do dia seguinte.`)}
        </p>
      </div>
      <ul className="space-y-2">
        {needsMore.map((n) => {
          const have = Math.min(5, n.yes) + Math.min(5, n.no)
          return (
            <li key={n.key} className={cn(CARD_MATERIAL, "space-y-2.5 p-4")}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-xs leading-4 font-bold tracking-[0.1em] uppercase">{n.label}</p>
                <p className="shrink-0 font-numeric text-[13px] leading-4 font-semibold text-foreground-secondary tabular-nums">{have}/10</p>
              </div>
              <Progress value={(have / 10) * 100} aria-label={tr(`${n.label}: ${have} of 10 days logged`, `${n.label}: ${have} de 10 dias registrados`)} className="h-1.5 bg-muted" />
              <p className="text-xs leading-4 font-medium text-muted-foreground tabular-nums">
                {tr(`${Math.min(5, n.yes)} of 5 days with, ${Math.min(5, n.no)} of 5 without`, `${Math.min(5, n.yes)} de 5 dias com, ${Math.min(5, n.no)} de 5 sem`)}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
