"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { formatValue } from "@/lib/format"
import { withParam } from "@/lib/url"
import { useSheetParam } from "@/hooks/use-sheet-param"
import type { ImpactMetricKey, JournalInsightsVM } from "@/server/queries/types"
import { DriverList } from "@/components/metrics/DriverList"
import { ResponsiveSheet } from "@/components/shells/ResponsiveSheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { tr } from "@/lib/locale-context"

const METRICS: { key: ImpactMetricKey; label: string; word: string }[] = [
  { key: "recovery", get label() { return tr("Recovery", "Recuperação") }, get word() { return tr("Recovery", "Recuperação") } },
  { key: "hrv", get label() { return tr("HRV", "VFC") }, get word() { return tr("HRV", "VFC") } },
  { key: "sleep", get label() { return tr("Sleep", "Sono") }, get word() { return tr("sleep performance", "desempenho do sono") } },
]
const metricWord = (m: ImpactMetricKey) => METRICS.find((x) => x.key === m)!.word
const footer = () => tr("Effects are differences in averages, not proof of cause. Change one habit at a time to see what it really does.", "Os efeitos são diferenças entre médias, não prova de causa. Mude um hábito por vez para ver o que ele realmente faz.")

/** Recovery / HRV / Sleep, kept in `?m=` with router.replace (spec §7.12). */
export function MetricToggle({ metric }: { metric: ImpactMetricKey }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  return (
    <ToggleGroup
      type="single"
      value={metric}
      onValueChange={(v) => v && router.replace(`${pathname}${withParam(params.toString(), "m", v === "recovery" ? null : v)}`, { scroll: false })}
      spacing={0}
      aria-label={tr("Outcome", "Resultado")}
      className="gap-0.5 rounded-lg bg-muted p-0.5"
    >
      {METRICS.map((m) => (
        <ToggleGroupItem
          key={m.key}
          value={m.key}
          className="h-10 min-w-11 rounded-md! px-3 text-[13px] font-bold tracking-[0.1em] text-muted-foreground uppercase transition-[background-color,color] duration-150 ease-standard hover:bg-transparent hover:text-foreground data-[state=on]:bg-secondary data-[state=on]:text-foreground"
        >
          {m.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** The impact list; a row opens its detail sheet. */
export function ImpactList({ vm }: { vm: JournalInsightsVM }) {
  // `?behaviour=` deep-links the sheet; Back closes it.
  const [open, setOpen] = useSheetParam("behaviour")
  const [last, setLast] = React.useState<JournalInsightsVM["items"][number] | null>(null)
  const current = vm.items.find((i) => i.key === open)
  const item = current ?? last
  const sd = vm.unit === "SD"
  const fx = (v: number, signed = true) => (sd ? `${formatValue(signed ? "signed1" : "decimal1", v)} SD` : `${formatValue(signed ? "signedInt" : "int", v)}%`)
  const avg = (v: number | null) => (v === null ? "--" : sd ? `${formatValue("signed1", v)} SD` : `${formatValue("int", v)}%`)
  const tone = item?.effect === "positive" ? "text-optimal-text" : item?.effect === "negative" ? "text-warning-text" : "text-foreground-secondary"

  return (
    <>
      <DriverList
        variant="impact"
        unit={vm.unit}
        data={{ value: vm.items, reason: null, provisional: false }}
        selectedKey={current?.key}
        onSelect={(k) => {
          setOpen(k)
          setLast(vm.items.find((i) => i.key === k) ?? null)
        }}
        outcome={metricWord(vm.metric)}
      />
      <ResponsiveSheet open={!!current} onOpenChange={(o) => !o && setOpen(null)} title={item?.label ?? tr("Behaviour", "Comportamento")}>
        {item && (
          <div className="space-y-4">
            <div>
              <p className={cn("font-numeric text-4xl leading-10 font-bold tracking-[-0.01em] tabular-nums", tone)}>{fx(item.delta)}</p>
              <p className="text-[15px] leading-[22px] text-foreground-secondary">{tr(`next-day ${metricWord(vm.metric)}`, `${metricWord(vm.metric)} do dia seguinte`)}</p>
            </div>
            <dl className="divide-y divide-border text-[15px] leading-[22px]">
              {[
                [tr("Days with", "Dias com"), String(item.yes ?? "--")],
                [tr("Days without", "Dias sem"), String(item.no ?? "--")],
                [tr("90% confidence", "Confiança de 90%"), item.ci ? `${fx(item.ci[0], false)} ${tr("to", "a")} ${fx(item.ci[1], false)}` : "--"],
                [tr("Average with", "Média com"), avg(item.avgWith)],
                [tr("Average without", "Média sem"), avg(item.avgWithout)],
              ].map(([k, v]) => (
                <div key={k} className="flex min-h-11 items-center justify-between gap-3">
                  <dt className="text-foreground-secondary">{k}</dt>
                  <dd className="font-numeric font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs leading-4 font-medium text-pretty text-muted-foreground">{footer()}</p>
          </div>
        )}
      </ResponsiveSheet>
    </>
  )
}
