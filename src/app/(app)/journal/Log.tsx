"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarHeart, Droplet, FlaskConical, Plus, Scale, Smile, Thermometer, Utensils, type LucideIcon } from "lucide-react"
import { toast } from "sonner"
import { DAY, dayLabel, formatDay, locale } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  CYCLE_SYMPTOMS,
  FLOWS,
  KIND_LABEL,
  MEALS,
  MOODS,
  OVULATION_RESULTS,
  RECONNECT,
  SYMPTOMS,
  VALENCES,
  WATER_STEPS,
  type LogData,
  type LogKind,
} from "@/lib/log"
import { logEntry, type LogInput } from "@/server/actions/log"
import type { LogVM } from "@/server/queries/log"
import { CAPTION } from "@/components/metrics/primitives"
import { ResponsiveSheet, SHEET_SECTION } from "@/components/shells/ResponsiveSheet"
import { closeSheet, openSheet } from "@/components/shells/SheetTrigger"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CARD_MATERIAL } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { tr } from "@/lib/locale-context"

export const ICON: Record<LogKind, LucideIcon> = {
  water: Droplet,
  food: Utensils,
  weight: Scale,
  mood: Smile,
  symptoms: Thermometer,
  period: CalendarHeart,
  ovulation: FlaskConical,
}
/** A selectable chip, as the check-in's Yes/No toggles: white when on. */
const CHIP =
  "h-11 rounded-full border-border px-4 text-[15px] font-medium transition-[background-color,color,border-color] duration-150 ease-standard data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background"
const FIELD = "h-11 text-base tabular-nums"
const NUM = /^\d+([.,]\d+)?$/

/** The wall clock now in the server's zone, as `YYYY-MM-DDTHH:mm` (what a datetime-local input holds). */
const wallNow = (timeZone: string) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value])
  )
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}
const num = (s: string) => (s.trim() === "" ? null : NUM.test(s.trim()) ? Number(s.trim().replace(",", ".")) : NaN)

type Form = Record<string, string | string[]>
const EMPTY: Record<LogKind, Form> = {
  water: { ml: "" },
  food: { name: "", meal: "", kcal: "", protein: "", carbs: "", fat: "" },
  weight: { kg: "", fat: "" },
  mood: { valence: "", moods: [] },
  symptoms: { symptoms: [] },
  period: { start: "", end: "", flow: "" },
  ovulation: { result: "" },
}

/** The form's values as the action's input, or the first problem to show. */
function toInput(kind: LogKind, f: Form, at: string): LogInput | string {
  const s = (k: string) => f[k] as string
  const a = (k: string) => f[k] as string[]
  switch (kind) {
    case "water": {
      const ml = num(s("ml"))
      return ml && Number.isInteger(ml) ? { kind, ml, at } : tr("Enter the amount in millilitres.", "Digite a quantidade em mililitros.")
    }
    case "food": {
      const [kcal, protein, carbs, fat] = ["kcal", "protein", "carbs", "fat"].map((k) => num(s(k)))
      if (!s("meal")) return tr("Choose a meal.", "Escolha uma refeição.")
      if (kcal == null || Number.isNaN(kcal) || !Number.isInteger(kcal)) return tr("Enter calories as a whole number.", "Digite as calorias como um número inteiro.")
      if ([protein, carbs, fat].some((g) => Number.isNaN(g))) return tr("Macros are grams, as numbers.", "Os macronutrientes são em gramas, como números.")
      return { kind, name: s("name"), meal: s("meal") as never, kcal, protein, carbs, fat, at }
    }
    case "weight": {
      const kg = num(s("kg"))
      const fatPct = num(s("fat"))
      if (kg == null || Number.isNaN(kg)) return tr("Enter your weight in kilograms.", "Digite seu peso em quilogramas.")
      if (Number.isNaN(fatPct)) return tr("Body fat is a percentage, as a number.", "A gordura corporal é uma porcentagem, como número.")
      return { kind, kg, fatPct, at }
    }
    case "mood":
      return a("moods").length ? { kind, moods: a("moods") as never, valence: (s("valence") || null) as never, at } : tr("Choose how you feel.", "Escolha como você se sente.")
    case "symptoms":
      return a("symptoms").length ? { kind, symptoms: a("symptoms") as never, at } : tr("Choose a symptom.", "Escolha um sintoma.")
    case "period":
      if (!s("start") || !s("end")) return tr("Choose the first and last day.", "Escolha o primeiro e o último dia.")
      return { kind, start: s("start"), end: s("end"), flow: (s("flow") || null) as never }
    case "ovulation":
      return s("result") ? { kind, result: s("result") as never, at } : tr("Choose the result.", "Escolha o resultado.")
  }
}

function Chips({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly (readonly [string, string, ...unknown[]])[]
  value: string | string[]
  onChange: (v: string | string[]) => void
}) {
  const items = options.map(([v, l]) => (
    <ToggleGroupItem key={v} value={v} variant="outline" className={CHIP}>
      {l}
    </ToggleGroupItem>
  ))
  return Array.isArray(value) ? (
    <ToggleGroup type="multiple" aria-label={label} spacing={2} value={value} onValueChange={onChange} className="w-full flex-wrap">
      {items}
    </ToggleGroup>
  ) : (
    <ToggleGroup type="single" aria-label={label} spacing={2} value={value} onValueChange={onChange} className="w-full flex-wrap">
      {items}
    </ToggleGroup>
  )
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id} className="text-[15px] leading-[22px] font-medium">
        {label}
        {hint && <span className="font-normal text-muted-foreground"> {hint}</span>}
      </Label>
      {children}
    </div>
  )
}

/** A caps section heading inside a sheet, with the reference app's hairline. */
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-6 flex flex-col gap-3 first:mt-2">
    <h3 className={SHEET_SECTION}>{title}</h3>
    {children}
  </section>
)

export type LogProps = { vm: LogVM }

const n = (v: number) => v.toLocaleString(locale())
const moodLabel = () => Object.fromEntries([...MOODS, ...VALENCES].map(([v, l]) => [v, l]))

/** Each tile's figure for the day shown: a total, the latest reading, or nothing yet. */
function tileValue(k: LogKind, vm: LogVM): { value: string; sub?: string } | null {
  switch (k) {
    case "water":
      return vm.water.total ? { value: `${n(vm.water.total)} ml` } : { value: tr("None", "Nenhum") }
    case "food":
      return vm.food.total ? { value: `${n(vm.food.total.kcal)} kcal` } : { value: "None" }
    case "weight": {
      const w = vm.body.latest
      return w ? { value: `${w.kg} kg`, sub: w.day === vm.day ? undefined : formatDay(w.day, DAY.monthDay) } : null
    }
    case "mood": {
      const m = vm.moods.at(-1)?.data as LogData["moods"] | undefined
      return m ? { value: moodLabel()[m.moods[0] ?? m.valence ?? ""] ?? tr("Logged", "Registrado") } : null
    }
    case "symptoms":
      return { value: vm.symptoms.length ? tr(`${vm.symptoms.length} logged`, `${vm.symptoms.length} registrados`) : tr("None", "Nenhum") }
    default:
      return null
  }
}

/** Journal's Log tiles (spec §11 LG1): one per thing to log, with the day's figure, each opening its sheet. */
export function Log({ vm }: LogProps) {
  const { demo } = vm
  const router = useRouter()
  const params = useSearchParams()
  const [kind, setKind] = React.useState<LogKind | null>(null)
  const [shown, setShown] = React.useState<LogKind>("water")
  const [form, setForm] = React.useState<Form>(EMPTY.water)
  const [at, setAt] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [reconnect, setReconnect] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const open = (k: LogKind) => {
    setShown(k)
    setForm(EMPTY[k])
    // A past day logs at noon of that day by default; today at the time it is.
    setAt(vm.day === vm.today ? wallNow(vm.timeZone) : `${vm.day}T12:00`)
    setError(null)
    setReconnect(vm.access[k] === "reconnect")
    setKind(k)
  }

  // The sheet follows `?log=water`: a tile pushes it, a bookmark arrives with it, and Back closes the sheet without
  // leaving Journal (spec §11 UX2).
  const wanted = params.get("log") as LogKind | null
  const [handled, setHandled] = React.useState<string | null>(null)
  if (wanted !== handled) {
    setHandled(wanted)
    if (wanted && vm.kinds.includes(wanted)) open(wanted)
    else if (!wanted) setKind(null)
  }
  const shut = () => {
    setKind(null)
    closeSheet("log")
  }

  const set = (k: string) => (v: string | string[]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setError(null)
  }

  const send = async (input: LogInput, close = true) => {
    setSaving(true)
    setError(null)
    const r = await logEntry(input).catch(() => ({ ok: false as const, error: tr("Couldn’t save. Check your connection and try again.", "Não foi possível salvar. Verifique sua conexão e tente de novo.") }))
    setSaving(false)
    if (!r.ok) {
      if (r.error === RECONNECT) setReconnect(true)
      else setError(r.error)
      return
    }
    if (close) shut()
    toast.success(r.data.demo ? tr(`${KIND_LABEL[input.kind]} saved in Pulse (demo)`, `${KIND_LABEL[input.kind]}: salvo no Pulse (demonstração)`) : tr(`${KIND_LABEL[input.kind]} saved to Google Health`, `${KIND_LABEL[input.kind]}: salvo no Google Health`))
    router.refresh()
  }

  const save = () => {
    const input = toInput(shown, form, at)
    if (typeof input === "string") return setError(input)
    void send(input)
  }

  const access = vm.access[shown]
  const blocked = reconnect || access === "not_connected"
  const timeField = shown !== "period" && (
    <Field id="log-at" label={tr("Time", "Hora")}>
      <Input id="log-at" type="datetime-local" value={at} max={wallNow(vm.timeZone)} onChange={(e) => setAt(e.target.value)} className={FIELD} />
    </Field>
  )

  return (
    <>
      {/* Phone: one row that scrolls edge to edge, as the day strip above it; from 768 px every tile fits in one row. */}
      <ul aria-label={tr("Log", "Registrar")} className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-flow-col md:auto-cols-fr md:overflow-visible md:px-0">
        {vm.kinds.map((k) => {
          const Icon = ICON[k]
          const t = tileValue(k, vm)
          const label = KIND_LABEL[k] === "Ovulation test" ? "Ovulation" : KIND_LABEL[k] === "Teste de ovulação" ? "Ovulação" : KIND_LABEL[k]
          return (
            <li key={k} className="shrink-0 snap-start">
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => openSheet("log", k)}
                aria-label={t ? tr(`${label}, ${t.value}${t.sub ? ` on ${t.sub}` : ""}. Log ${label.toLowerCase()}`, `${label}, ${t.value}${t.sub ? ` em ${t.sub}` : ""}. Registrar: ${label.toLowerCase()}`) : tr(`Log ${label.toLowerCase()}`, `Registrar: ${label.toLowerCase()}`)}
                className={cn(
                  CARD_MATERIAL,
                  "flex h-24 w-24 flex-col items-start justify-between p-3 text-left md:px-2.5 transition-[scale,--tw-gradient-from] duration-150 ease-standard outline-none hover:from-card-hover focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96] md:w-full"
                )}
              >
                <span className="flex w-full items-start justify-between text-foreground-secondary">
                  <Icon aria-hidden className="size-5" strokeWidth={1.75} />
                  <Plus aria-hidden className="size-4" strokeWidth={2} />
                </span>
                <span className="flex min-w-0 flex-col">
                  {t && (
                    <span className="truncate font-numeric text-[15px] leading-5 font-bold tabular-nums">
                      {t.value}
                      {t.sub && <span className="font-medium text-muted-foreground"> · {t.sub}</span>}
                    </span>
                  )}
                  <span className="text-[13px] leading-[18px] font-semibold">{label}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {demo && <p className={cn(CAPTION, "mt-3")}>{tr("Demo: what you log stays in Pulse and never reaches Google.", "Demonstração: o que você registra fica no Pulse e nunca chega ao Google.")}</p>}

      <ResponsiveSheet
        open={kind !== null}
        onOpenChange={(o) => !o && !saving && shut()}
        title={tr(`Log ${KIND_LABEL[shown].toLowerCase()}`, `Registrar: ${KIND_LABEL[shown].toLowerCase()}`)}
        description={blocked ? undefined : demo ? tr("Demo: saved in Pulse only", "Demonstração: salvo só no Pulse") : tr("Saved to Google Health", "Salvo no Google Health")}
        footer={
          blocked ? null : (
            <>
              {error && (
                <Alert role="alert" className="border-0 bg-recovery-red/15 px-3 py-2">
                  <AlertDescription className="text-recovery-red-text">{error}</AlertDescription>
                </Alert>
              )}
              <Button size="sheet" onClick={save} disabled={saving} aria-live="polite">
                {saving ? tr("Saving…", "Salvando…") : tr("Save", "Salvar")}
              </Button>
            </>
          )
        }
      >
        {blocked ? (
          <div className="flex flex-col gap-4 pt-2">
            <p className="max-w-[65ch] text-[15px] leading-[22px] text-pretty text-foreground-secondary">
              {access === "not_connected"
                ? tr("Connect Google to log to Google Health.", "Conecte o Google para registrar no Google Health.")
                : tr(`Pulse needs new permissions to save ${KIND_LABEL[shown].toLowerCase()} to Google Health. Reconnect Google and allow them; nothing you have synced is lost.`, `O Pulse precisa de novas permissões para salvar ${KIND_LABEL[shown].toLowerCase()} no Google Health. Reconecte o Google e permita; nada do que você já sincronizou se perde.`)}
            </p>
            <Button asChild size="sheet">
              <a href="/oauth/start">
                {access === "not_connected" ? tr("Connect Google", "Conectar Google") : tr("Reconnect Google", "Reconectar Google")}
              </a>
            </Button>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            {shown === "water" && (
              <>
                <Section title={tr("Add", "Adicionar")}>
                  <div className="grid grid-cols-2 gap-2">
                    {WATER_STEPS.map((ml) => (
                      <Button key={ml} type="button" variant="secondary" size="touch" disabled={saving} className="h-14 text-[15px]" onClick={() => void send({ kind: "water", ml, at }, false)}>
                        <Droplet aria-hidden strokeWidth={1.75} />+{ml} ml
                      </Button>
                    ))}
                  </div>
                  <p className={cn(CAPTION, "tabular-nums")} aria-live="polite">
                    {dayLabel(vm.day, vm.today)}: {vm.water.total.toLocaleString(locale())} ml
                  </p>
                </Section>
                <Section title={tr("Other amount", "Outra quantidade")}>
                  <Field id="log-ml" label={tr("Amount", "Quantidade")} hint={tr("(ml)", "(ml)")}>
                    <Input id="log-ml" inputMode="numeric" autoComplete="off" placeholder={tr("e.g. 330", "ex.: 330")} value={form.ml as string} onChange={(e) => set("ml")(e.target.value)} className={FIELD} />
                  </Field>
                  {timeField}
                </Section>
              </>
            )}

            {shown === "food" && (
              <>
                <Section title={tr("Meal", "Refeição")}>
                  <Chips label={tr("Meal", "Refeição")} options={MEALS} value={form.meal as string} onChange={set("meal")} />
                </Section>
                <Section title={tr("What you ate", "O que você comeu")}>
                  <Field id="log-name" label={tr("Name", "Nome")} hint={tr("(optional)", "(opcional)")}>
                    <Input id="log-name" autoComplete="off" maxLength={80} placeholder={tr("e.g. Dal and rice", "ex.: Arroz com feijão")} value={form.name as string} onChange={(e) => set("name")(e.target.value)} className="h-11 text-base" />
                  </Field>
                  <Field id="log-kcal" label={tr("Calories", "Calorias")} hint={tr("(kcal)", "(kcal)")}>
                    <Input id="log-kcal" inputMode="numeric" autoComplete="off" value={form.kcal as string} onChange={(e) => set("kcal")(e.target.value)} className={FIELD} />
                  </Field>
                  <div className="grid grid-cols-3 gap-2">
                    {(["protein", "carbs", "fat"] as const).map((m) => (
                      <Field key={m} id={`log-${m}`} label={tr(m[0].toUpperCase() + m.slice(1), { protein: "Proteína", carbs: "Carboidratos", fat: "Gordura" }[m] ?? m)} hint={tr("(g)", "(g)")}>
                        <Input id={`log-${m}`} inputMode="decimal" autoComplete="off" value={form[m] as string} onChange={(e) => set(m)(e.target.value)} className={FIELD} />
                      </Field>
                    ))}
                  </div>
                  {timeField}
                </Section>
              </>
            )}

            {shown === "weight" && (
              <Section title={tr("Measurement", "Medição")}>
                <div className="grid grid-cols-2 gap-2">
                  <Field id="log-kg" label={tr("Weight", "Peso")} hint={tr("(kg)", "(kg)")}>
                    <Input id="log-kg" inputMode="decimal" autoComplete="off" value={form.kg as string} onChange={(e) => set("kg")(e.target.value)} className={FIELD} />
                  </Field>
                  <Field id="log-fat" label={tr("Body fat", "Gordura corporal")} hint={tr("(%)", "(%)")}>
                    <Input id="log-fat" inputMode="decimal" autoComplete="off" placeholder={tr("Optional", "Opcional")} value={form.fat as string} onChange={(e) => set("fat")(e.target.value)} className={FIELD} />
                  </Field>
                </div>
                {timeField}
              </Section>
            )}

            {shown === "mood" && (
              <>
                <Section title={tr("Overall", "No geral")}>
                  <Chips label={tr("Overall", "No geral")} options={VALENCES} value={form.valence as string} onChange={set("valence")} />
                </Section>
                <Section title={tr("Feelings", "Sentimentos")}>
                  <Chips label={tr("Feelings", "Sentimentos")} options={MOODS} value={form.moods as string[]} onChange={set("moods")} />
                </Section>
                <Section title={tr("When", "Quando")}>{timeField}</Section>
              </>
            )}

            {shown === "symptoms" && (
              <>
                <Section title={tr("Symptoms", "Sintomas")}>
                  <Chips
                    label={tr("Symptoms", "Sintomas")}
                    options={SYMPTOMS.filter((s) => vm.kinds.includes("period") || !CYCLE_SYMPTOMS.has(s[0]))}
                    value={form.symptoms as string[]}
                    onChange={set("symptoms")}
                  />
                </Section>
                <Section title={tr("When", "Quando")}>{timeField}</Section>
              </>
            )}

            {shown === "period" && (
              <>
                <Section title={tr("Days", "Dias")}>
                  <div className="grid grid-cols-2 gap-2">
                    <Field id="log-start" label={tr("First day", "Primeiro dia")}>
                      <Input id="log-start" type="date" max={vm.today} value={form.start as string} onChange={(e) => set("start")(e.target.value)} className={FIELD} />
                    </Field>
                    <Field id="log-end" label={tr("Last day", "Último dia")}>
                      <Input id="log-end" type="date" max={vm.today} min={(form.start as string) || undefined} value={form.end as string} onChange={(e) => set("end")(e.target.value)} className={FIELD} />
                    </Field>
                  </div>
                  <p className={CAPTION}>{tr("Still going? Use today as the last day, and log it again once it ends.", "Ainda não acabou? Use hoje como o último dia e registre de novo quando terminar.")}</p>
                </Section>
                <Section title={tr("Flow", "Fluxo")}>
                  <Chips label={tr("Flow", "Fluxo")} options={FLOWS} value={form.flow as string} onChange={set("flow")} />
                </Section>
              </>
            )}

            {shown === "ovulation" && (
              <>
                <Section title={tr("Result", "Resultado")}>
                  <Chips label={tr("Result", "Resultado")} options={OVULATION_RESULTS} value={form.result as string} onChange={set("result")} />
                </Section>
                <Section title={tr("When", "Quando")}>{timeField}</Section>
              </>
            )}
            {/* Enter in a field submits; the visible Save lives in the sheet footer. */}
            <button type="submit" hidden />
          </form>
        )}
      </ResponsiveSheet>

    </>
  )
}
