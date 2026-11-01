import { clock, DAY, durationWords, formatDay, formatValue, hmm, type TimeFormat } from "@/lib/format"
import { activityHref } from "@/lib/url"
import type { Metric } from "@/lib/reasons"
import { ColumnChart } from "@/components/charts/ColumnChart"
import { KeyStatRow } from "@/components/metrics/KeyStatRow"
import { EmptyState } from "@/components/shells/EmptyState"
import { MetricState } from "@/components/shells/MetricState"
import { SectionShell } from "@/components/shells/SectionShell"
import type { MetricDetailVM, Section } from "@/server/queries/metric"
import { CAPTION, LABEL, LEGEND, statProps } from "../../_lib/view"
import { tr } from "@/lib/locale-context"

export const METRIC_GRID = "grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:items-start xl:gap-4"

type Ctx = { vm: MetricDetailVM; timeZone: string; timeFormat: TimeFormat; className?: string }

const at = (ms: number, c: Ctx) => clock(ms, c.timeZone, c.timeFormat)

const ok = (v: number): Metric<number> => ({ value: v, reason: null, provisional: false })
const rows = (children: React.ReactNode) => <div className="divide-y divide-border">{children}</div>

export function MetricSection({ s, ...c }: Ctx & { s: Section }) {
  switch (s.kind) {
    case "hourly":
      return <Hourly s={s} {...c} />
    case "goal":
      return (
        <SectionShell variant="card" level={2} title={tr(`${formatValue("grouped", s.target)}-step days`, `Dias com ${formatValue("grouped", s.target)} passos`)} info={{ title: tr("Days reaching the step reference", "Dias que atingiram a referência de passos"), body: tr("Recorded days that reached the displayed step reference. Missing data does not count as a completed day.", "Dias registrados que atingiram a referência de passos exibida. A falta de dados não conta como um dia concluído.") }} className={c.className}>
          {rows(
            <>
              <KeyStatRow variant="row" label={tr("Current streak", "Sequência atual")} metric={ok(s.streak)} unit={s.streak === 1 ? tr("day", "dia") : tr("days", "dias")} format="int" direction="none" />
              <KeyStatRow variant="row" label={tr("Longest streak", "Maior sequência")} caption={tr("In the past year", "No último ano")} metric={ok(s.longest)} unit={s.longest === 1 ? tr("day", "dia") : tr("days", "dias")} format="int" direction="none" />
              <KeyStatRow variant="row" label={tr("Days reached", "Dias atingidos")} caption={tr(`In the last ${s.days} days`, `Nos últimos ${s.days} dias`)} metric={ok(s.met)} unit={tr(`of ${s.days}`, `de ${s.days}`)} format="int" direction="none" />
            </>,
          )}
          <p className={LEGEND}>{tr("About 7,000 steps a day goes with markedly lower health risks in a 2025 review of 57 studies. It is a reference, not a goal you set.", "Cerca de 7.000 passos por dia acompanham riscos à saúde bem menores numa revisão de 2025 de 57 estudos. É uma referência, não uma meta que você define.")}</p>
        </SectionShell>
      )
    case "weekday": {
      const best = Math.max(...s.days.map((d) => d.value ?? -Infinity))
      return (
        <SectionShell variant="card" level={2} title={tr("By weekday", "Por dia da semana")} className={c.className}>
          <ColumnChart
            summary={tr(`Average ${c.vm.label} by weekday over the last ${s.weeks} weeks: ${s.days.map((d) => `${d.label} ${formatValue(c.vm.format, d.value)}`).join(", ")}.`, `${c.vm.label}: média por dia da semana nas últimas ${s.weeks} semanas: ${s.days.map((d) => `${d.label} ${formatValue(c.vm.format, d.value)}`).join(", ")}.`)}
            data={s.days.map((d) => ({ label: d.label, value: d.value, highlight: d.value === best }))}
            format={c.vm.format}
            unit={c.vm.unit}
          />
          <p className={`${CAPTION} mt-2`}>{tr(`Daily average for each weekday over the last ${s.weeks} weeks.`, `Média diária de cada dia da semana nas últimas ${s.weeks} semanas.`)}</p>
        </SectionShell>
      )
    }
    case "weekly":
      return <Weekly s={s} {...c} />
    case "intensity":
      return (
        <SectionShell variant="card" level={2} title={tr("Minutes by intensity", "Minutos por intensidade")} className={c.className}>
          {rows(s.rows.map((k) => <KeyStatRow key={k.key} variant="row" {...statProps(k)} />))}
          <p className={LEGEND}>{tr("This day vs. its prior 30 days", "Este dia vs. os 30 dias anteriores")}</p>
        </SectionShell>
      )
    case "workouts": {
      const burned = s.items.reduce((a, w) => a + (w.calories ?? 0), 0)
      return (
        <SectionShell variant="card" level={2} title={tr("Workouts", "Treinos")} className={c.className}>
          {s.items.length ? (
            <>
              {rows(
                s.items.map((w) => (
                  <KeyStatRow
                    key={w.id}
                    variant="row"
                    label={w.name}
                    caption={`${at(w.start, c)} - ${at(w.end, c)}`}
                    metric={w.calories === null ? { value: null, reason: "no_data", provisional: false } : ok(w.calories)}
                    unit="kcal"
                    format="grouped"
                    direction="none"
                    href={activityHref(w.id)}
                  />
                )),
              )}
              {s.active !== null && burned > 0 && (
                <p className={LEGEND}>
                  {tr(`Workouts burned ${formatValue("grouped", burned)} of the day’s ${formatValue("grouped", s.active)} active kcal.`, `Os treinos queimaram ${formatValue("grouped", burned)} das ${formatValue("grouped", s.active)} kcal ativas do dia.`)}
                </p>
              )}
            </>
          ) : (
            <EmptyState body={tr("No workouts recorded on this day.", "Nenhum treino registrado neste dia.")} className="py-4" />
          )}
        </SectionShell>
      )
    }
    case "entries":
      return (
        <SectionShell variant="card" level={2} title={tr("Logged entries", "Registros")} className={c.className}>
          {s.items.length ? (
            <ul className="divide-y divide-border">
              {s.items.map((e) => (
                <li key={e.id} className="flex min-h-13 items-center gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className={`${LABEL} block truncate`}>{e.title}</span>
                    <span className={`${CAPTION} mt-0.5 block truncate`}>{e.detail}</span>
                  </span>
                  <span className="shrink-0 font-numeric text-[13px] leading-4 font-medium text-muted-foreground tabular-nums">{at(e.ts * 1000, c)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState body={tr("Nothing logged in Pulse on this day. Entries made in other apps count in the total once they sync.", "Nada registrado no Pulse neste dia. Os registros feitos em outros apps entram no total depois de sincronizar.")} className="py-4" />
          )}
        </SectionShell>
      )
    case "balance":
      return (
        <SectionShell variant="card" level={2} title={tr("Eaten vs. burned", "Consumidas vs. gastas")} className={c.className}>
          {rows(s.rows.map((k) => <KeyStatRow key={k.key} variant="row" {...statProps(k, undefined, false)} />))}
        </SectionShell>
      )
    case "macros":
      return (
        <SectionShell variant="card" level={2} title={tr("Macros", "Macronutrientes")} className={c.className}>
          {rows(s.rows.map((k) => <KeyStatRow key={k.key} variant="row" {...statProps(k, undefined, false)} />))}
        </SectionShell>
      )
    case "readings":
      return (
        <SectionShell variant="card" level={2} title={tr("Readings", "Medições")} className={c.className}>
          {rows(
            <>
              {s.changes.map((k) => (
                <KeyStatRow key={k.key} variant="row" {...statProps(k, undefined, false)} />
              ))}
              {s.items.map((r) => (
                <KeyStatRow key={r.day} variant="row" label={formatDay(r.day, DAY.short)} metric={ok(r.value)} unit={c.vm.unit} format={c.vm.format} direction="none" />
              ))}
            </>,
          )}
        </SectionShell>
      )
    case "outliers": {
      const range = `${formatValue(c.vm.format, s.mean - s.sd)} - ${formatValue(c.vm.format, s.mean + s.sd)}${c.vm.unit ? ` ${c.vm.unit}` : ""}`
      return (
        <SectionShell variant="card" level={2} title={tr("Unusual days", "Dias fora do comum")} className={c.className}>
          <p className={`${CAPTION} mb-2`}>{tr(`Your usual range over the last 90 days is ${range}. Days far outside it are listed here.`, `Sua faixa habitual nos últimos 90 dias é ${range}. Os dias muito fora dela aparecem aqui.`)}</p>
          {s.items.length ? (
            rows(
              s.items.map((o) => (
                <KeyStatRow
                  key={o.day}
                  variant="row"
                  label={formatDay(o.day, DAY.short)}
                  caption={o.dir === "high" ? tr("Above your usual range", "Acima da sua faixa habitual") : tr("Below your usual range", "Abaixo da sua faixa habitual")}
                  metric={ok(o.value)}
                  unit={c.vm.unit}
                  format={c.vm.format}
                  direction="none"
                />
              )),
            )
          ) : (
            <EmptyState body={tr("No unusual days in the last 90 days.", "Nenhum dia fora do comum nos últimos 90 dias.")} className="py-4" />
          )}
        </SectionShell>
      )
    }
  }
}

function Hourly({ s, vm, timeZone, timeFormat, className }: Ctx & { s: Extract<Section, { kind: "hourly" }> }) {
  const sedentary = vm.key === "sedentary_minutes"
  return (
    <SectionShell variant="card" level={2} title={sedentary ? tr("Movement by hour", "Movimento por hora") : tr("Steps by hour", "Passos por hora")} className={className}>
      <MetricState
        metric={s.hours}
        skeleton={<ColumnChart.Skeleton />}
        renderReason={() => <EmptyState body={tr("No per-minute steps for this day.", "Sem passos por minuto neste dia.")} className="py-10" />}
      >
        {(hours) => {
          const done = hours.filter((h) => h.value !== null)
          const peak = done.reduce((a, h) => ((h.value ?? 0) > (a?.value ?? 0) ? h : a), done[0])
          return (
            <>
              <ColumnChart
                summary={tr(`Steps by hour${peak?.value ? `, most at ${peak.label} with ${formatValue("grouped", peak.value)}` : ""}.`, `Passos por hora${peak?.value ? `, mais às ${peak.label} com ${formatValue("grouped", peak.value)}` : ""}.`)}
                data={hours.map((h, i) => ({ label: h.label, title: `${h.label} - ${hours[i + 1]?.label ?? clock(h.t + 3_600_000, timeZone, timeFormat)}`, value: h.value }))}
                format="grouped"
                unit={tr("steps", "passos")}
                tickEvery={6}
              />
              {sedentary && s.still && (
                <p className={LEGEND}>
                  {tr("Longest daytime stretch without steps:", "Maior período diurno sem passos:")} {durationWords(s.still.minutes)}, {clock(s.still.from, timeZone, timeFormat)} - {clock(s.still.to, timeZone, timeFormat)}
                </p>
              )}
            </>
          )
        }}
      </MetricState>
    </SectionShell>
  )
}

function Weekly({ s, vm, className }: Ctx & { s: Extract<Section, { kind: "weekly" }> }) {
  const pct = Math.min(100, (s.week.total / s.target) * 100)
  return (
    <SectionShell variant="card" level={2} title={tr("This week", "Esta semana")} className={className}>
      <p className="font-numeric text-[28px] leading-8 font-bold tabular-nums">
        {hmm(s.week.total)}
        <span className="ml-1 text-sm leading-5 font-medium text-foreground-secondary">{tr("of", "de")} {hmm(s.target)}</span>
      </p>
      <div
        role="meter"
        aria-label={tr(`${vm.label} this week`, `${vm.label} nesta semana`)}
        aria-valuemin={0}
        aria-valuemax={s.target}
        aria-valuenow={Math.round(s.week.total)}
        className="mt-2 mb-1 h-2 overflow-hidden rounded-full bg-dial-track"
      >
        <div className="h-full rounded-full bg-optimal" style={{ width: `${pct}%` }} />
      </div>
      <p className={`${CAPTION} mb-4`}>
        {formatDay(s.week.from, DAY.monthDay)} - {formatDay(s.week.to, DAY.monthDay)}, {tr(`toward the ${s.target} minutes a week the WHO recommends`, `rumo aos ${s.target} minutos por semana que a OMS recomenda`)}
      </p>
      <ColumnChart
        summary={tr(`${vm.label} per week, last ${s.weeks.length} weeks. Target met in ${s.met}.`, `${vm.label} por semana, últimas ${s.weeks.length} semanas. Meta atingida em ${s.met}.`)}
        data={s.weeks.map((w) => ({ label: formatDay(w.from, DAY.monthDay), title: tr(`Week of ${formatDay(w.from, DAY.monthDay)}`, `Semana de ${formatDay(w.from, DAY.monthDay)}`), value: w.value, highlight: (w.value ?? 0) >= s.target }))}
        format="duration"
        tickEvery={3}
        reference={{ y: s.target, label: hmm(s.target) }}
      />
      <p className={`${CAPTION} mt-2`}>
        {tr(`Target met in ${s.met} of the last ${s.weeks.length} weeks`, `Meta atingida em ${s.met} das últimas ${s.weeks.length} semanas`)}
      </p>
    </SectionShell>
  )
}
