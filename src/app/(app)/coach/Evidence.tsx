"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowUpRight } from "lucide-react"
import type { CoachOutputs } from "@/server/coach/tools"
import { KeyStatRow } from "@/components/metrics/KeyStatRow"
import { Sparkline } from "@/components/metrics/Sparkline"
import { ZoneBars } from "@/components/charts/ZoneBars"
import { MetricState } from "@/components/shells/MetricState"
import { CARD_MATERIAL } from "@/components/ui/card"
import type { Metric } from "@/lib/reasons"
import { normalizeReason } from "@/lib/reasons"
import { cn } from "@/lib/utils"
import { tr } from "@/lib/locale-context"
import { useClock } from "@/components/shells/ShellStatus"

function metric(m: { value: number | null; reason?: string | null; provisional?: boolean }): Metric<number> {
  return { ...m, reason: m.value === null ? normalizeReason(m.reason) : null, provisional: m.provisional ?? false }
}

function BasedOn({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-1.5 text-[12px] leading-4 text-coach-text hover:underline underline-offset-4">{tr("Based on", "Com base em")} {children}<ArrowUpRight aria-hidden className="size-3.5" /></Link>
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <div className={cn(CARD_MATERIAL, "min-w-0 px-4 py-3")}><p className="mb-1 text-[12px] font-semibold text-foreground-secondary">{title}</p>{children}</div>
}

export function Evidence({ name, output }: { name: string; output: unknown }) {
  const formatClock = useClock()
  if (!output || typeof output !== "object") return null
  if (name === "get_day") {
    const d = output as CoachOutputs["get_day"]
    return <BasedOn href={`/recovery?d=${d.day}`}>{tr("Recovery, Sleep and Strain", "Recuperação, Sono e Esforço")} · {d.day}</BasedOn>
  }
  if (name === "get_trend") {
    const d = output as CoachOutputs["get_trend"]
    if (!d.points || !d.previous) return <BasedOn href="/trends">{tr("Trends", "Tendências")}</BasedOn>
    return <div className="space-y-2"><Card title={tr(`${d.metric} · ${d.start} to ${d.end}`, `${d.metric} · ${d.start} a ${d.end}`)}>
      <KeyStatRow variant="row" label={tr("Period average", "Média do período")} metric={metric(d.average)} unit={d.unit ?? undefined} format="decimal1" direction="none" average={d.previous.average.value} averageLabel={tr("Previous period", "Período anterior")} caption={tr(`${d.observedDays} of ${d.calendarDays} days measured`, `${d.observedDays} de ${d.calendarDays} dias medidos`)} />
      <Sparkline values={d.points.map((p) => p.value)} className="mt-2 h-14" />
    </Card><BasedOn href={`/trends?metric=${encodeURIComponent(d.key)}`}>{tr(`${d.metric} · ${d.start} to ${d.end}`, `${d.metric} · ${d.start} a ${d.end}`)}</BasedOn></div>
  }
  if (name === "get_sleep") {
    const d = output as CoachOutputs["get_sleep"]
    const debt = d.details.find((v) => v.key === "debt")
    const time = (ms: number) => formatClock(ms, d.timeZone)
    return <div className="space-y-2"><Card title={tr(`Sleep · ${d.day}`, `Sono · ${d.day}`)}>
      <KeyStatRow variant="row" label={tr("Time asleep", "Tempo dormindo")} metric={metric(d.asleepMinutes)} unit="min" format="int" direction="none" />
      {d.summary.filter((v) => v.key === "efficiency" || v.key === "consistency").map((v) => <KeyStatRow key={v.key} variant="row" label={v.label} metric={metric(v)} unit={v.unit ?? undefined} format="int" average={v.baseline} direction="up" />)}
      {debt && <KeyStatRow variant="row" label={tr("Sleep debt", "Dívida de sono")} metric={metric(debt)} unit="min" format="int" direction="down" />}
      <MetricState metric={d.planner} skeleton={null} reasonSize="sm">
        {(p) => <p className="mt-2 text-[13px] leading-5 text-foreground-secondary">{tr(`For ${time(p.wakeAt)} wake-up, ${p.plans.map((v) => `${v.label.toLowerCase()}: ${time(v.bedtimeAt)}`).join("; ")}. These are planned bedtimes.`, `Para acordar às ${time(p.wakeAt)}, ${p.plans.map((v) => `${v.label.toLowerCase()}: ${time(v.bedtimeAt)}`).join("; ")}. São horários planejados para dormir.`)}</p>}
      </MetricState>
    </Card><BasedOn href={`/sleep?d=${d.day}`}>{tr("Sleep and bedtime planner", "Sono e planejador de horário de dormir")} · {d.day}</BasedOn></div>
  }
  if (name === "get_activities") {
    const d = output as CoachOutputs["get_activities"]
    if (!d.workouts) return <BasedOn href="/activities">{tr("Workouts", "Treinos")}</BasedOn>
    return <div className="space-y-2"><Card title={tr(`Workouts · ${d.start} to ${d.end}`, `Treinos · ${d.start} a ${d.end}`)}>
      {d.workouts.length ? d.workouts.slice(0, 5).map((v) => <KeyStatRow key={v.id} variant="row" label={v.name} metric={metric(v.strain)} format="decimal1" direction="none" caption={tr(`${v.day} · ${v.minutes} min · Strain`, `${v.day} · ${v.minutes} min · Esforço`)} href={`/activity/${encodeURIComponent(v.id)}`} />) : <p className="text-[13px] text-muted-foreground">{tr("No workouts recorded in this period.", "Nenhum treino registrado neste período.")}</p>}
      {d.total > 5 && <p className="mt-2 text-[12px] text-muted-foreground">{tr(`Showing 5 of ${d.total} recorded workouts.`, `Mostrando 5 de ${d.total} treinos registrados.`)}</p>}
    </Card><BasedOn href="/activities">{tr(`Recorded workouts · ${d.start} to ${d.end}`, `Treinos registrados · ${d.start} a ${d.end}`)}</BasedOn></div>
  }
  if (name === "get_activity") {
    const d = output as CoachOutputs["get_activity"]
    const a = d.workout
    if (!a) return <p className="text-[13px] text-muted-foreground">{tr("That workout is unavailable.", "Esse treino não está disponível.")}</p>
    return <div className="space-y-2"><Card title={`${a.name} · ${a.day}`}>
      <KeyStatRow variant="row" label={tr("Activity strain", "Esforço da atividade")} metric={metric(a.strain)} format="decimal1" direction="none" />
      {a.stats.slice(0, 3).map((v) => <KeyStatRow key={v.label} variant="row" label={v.label} metric={metric(v)} unit={v.unit ?? undefined} format="decimal1" average={v.baseline} direction="none" />)}
      <ZoneBars variant="rows" data={a.zones} note={a.zoneNote} />
    </Card><BasedOn href={`/activity/${encodeURIComponent(a.id)}`}>{a.name} · {a.day}</BasedOn></div>
  }
  if (name === "get_journal_impacts") {
    const d = output as CoachOutputs["get_journal_impacts"]
    return <div className="space-y-2"><Card title={tr(`Habit associations · ${d.outcome}`, `Associações de hábitos · ${d.outcome}`)}>
      <p className="text-[12px] leading-4 text-muted-foreground">{tr("Differences in next-day averages, not proof of cause.", "Diferenças nas médias do dia seguinte, não prova de causa.")}</p>
      {d.effects.slice(0, 3).map((v) => <div key={v.behaviour}>
        <KeyStatRow variant="row" label={v.behaviour} metric={metric({ value: v.delta })} unit={d.unit} format="signed1" direction="none" caption={tr(`${v.yesDays} days with, ${v.noDays} without`, `${v.yesDays} dias com, ${v.noDays} sem`)} />
        {v.confidenceInterval && <p className="pb-2 text-[12px] leading-4 text-muted-foreground">{tr(`90% interval: ${v.confidenceInterval.map((n) => n.toFixed(1)).join(" to ")} ${d.unit}${v.effect === "none" ? ". No clear association." : "."}`, `Intervalo de 90%: ${v.confidenceInterval.map((n) => n.toFixed(1)).join(" a ")} ${d.unit}${v.effect === "none" ? ". Sem associação clara." : "."}`)}</p>}
      </div>)}
      {!d.effects.length && <p className="mt-2 text-[13px] text-muted-foreground">{tr("Not enough check-ins to compare habits yet.", "Ainda não há check-ins suficientes para comparar hábitos.")}</p>}
    </Card><BasedOn href="/journal/insights">{tr("Behaviour insights", "Insights de comportamento")}</BasedOn></div>
  }
  if (name === "get_health") {
    const d = output as CoachOutputs["get_health"]
    return <div className="space-y-2"><Card title={tr(`Health Monitor · ${d.day}`, `Monitor de Saúde · ${d.day}`)}>
      {d.vitals.map((v) => <KeyStatRow key={v.vital} variant="row" label={v.vital} metric={metric(v)} unit={v.unit} format="decimal1" direction="none" caption={v.status.replaceAll("_", " ")} />)}
    </Card><BasedOn href={`/health/monitor?d=${d.day}`}>{tr(`Health Monitor · ${d.day}`, `Monitor de Saúde · ${d.day}`)}</BasedOn></div>
  }
  if (name === "get_report") {
    const d = output as CoachOutputs["get_report"]
    if (!("scores" in d) || !d.scores) return <p className="text-[13px] text-muted-foreground">{tr("No report available yet.", "Nenhum relatório disponível ainda.")}</p>
    return <div className="space-y-2"><Card title={tr(`Report · ${d.start} to ${d.end}${d.partial ? " · Partial" : ""}`, `Relatório · ${d.start} a ${d.end}${d.partial ? " · Parcial" : ""}`)}>
      {d.scores.map((v) => <KeyStatRow key={v.score} variant="row" label={v.score} metric={metric(v)} format="decimal1" direction="none" />)}
    </Card><BasedOn href={d.period ? `/reports/${encodeURIComponent(d.period)}` : "/reports"}>{tr(`Report · ${d.start} to ${d.end}`, `Relatório · ${d.start} a ${d.end}`)}</BasedOn></div>
  }
  if (name === "get_profile") return <BasedOn href="/settings?s=account">{tr("Your profile", "Seu perfil")}</BasedOn>
  return null
}
