"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { saveProfileAction, type ProfileFormState } from "@/server/actions/profile"
import { Button } from "@/components/ui/button"
import { BirthDatePicker } from "./BirthDatePicker"
import { canonicalZone, describeZone, TimeZoneCombobox } from "./TimeZoneCombobox"
import { tr } from "@/lib/locale-context"

export type ProfileDefaults = { birthDate: string; sex: "male" | "female" | null; maxHr: number | null; heightCm: number | null; timeZone: string | null; timeFormat?: "24" | "12" | null }

const noSubscribe = () => () => {}

const FIELD =
  "h-13 w-full min-w-0 rounded-xl bg-field px-4 text-[17px] leading-6 text-foreground tabular-nums outline-none transition-[box-shadow] duration-150 ease-standard placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-foreground/70 aria-invalid:ring-2 aria-invalid:ring-recovery-red-text"
const LABEL = "text-xs leading-4 font-bold tracking-[0.1em] text-foreground-secondary uppercase"
const HINT = "text-[13px] leading-[18px] text-muted-foreground text-pretty"
const ERROR = "text-[13px] leading-[18px] font-medium text-recovery-red-text"

function Field({ id, label, hint, error, optional, children }: { id: string; label: string; hint: string; error?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={LABEL}>
        {label}
        {optional && <span className="ml-2 font-medium tracking-normal normal-case text-muted-foreground">{tr("Optional", "Opcional")}</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className={ERROR}>
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className={HINT}>
          {hint}
        </p>
      )}
    </div>
  )
}

/**
 * The profile fields (U19), shared by onboarding and Settings › Profile: a year-first birth date picker, and
 * the sex choice as a radio pair styled as a segmented control.
 * `footer` renders the submit, so each host places it (onboarding pins it to the bottom, the sheet to its foot).
 */
export function ProfileForm({
  defaults,
  onboarding = false,
  onSaved,
  footer,
}: {
  defaults: ProfileDefaults
  /** First run: only what nothing else can supply (birth date, sex). Height and max HR wait for Settings. */
  onboarding?: boolean
  onSaved?: () => void
  footer: (pending: boolean) => React.ReactNode
}) {
  const [state, action, pending] = React.useActionState<ProfileFormState, FormData>(saveProfileAction, null)
  const f = state?.ok === false ? state.fields : undefined
  React.useEffect(() => {
    if (state?.ok) onSaved?.()
  }, [state, onSaved])
  // No saved zone (onboarding): the browser's own. Empty on the server, so the first client render still matches it.
  const browserZone = React.useSyncExternalStore(noSubscribe, () => canonicalZone(Intl.DateTimeFormat().resolvedOptions().timeZone), () => "")
  const [edited, setTimeZone] = React.useState<string | null>(null)
  // Onboarding shows the detected zone as one line; Change opens the picker. An error opens it too.
  const [zoneOpen, setZoneOpen] = React.useState(!onboarding)
  const timeZone = edited ?? defaults.timeZone ?? browserZone
  const described = (id: keyof NonNullable<typeof f>) => ({ "aria-invalid": !!f?.[id] || undefined, "aria-describedby": `${id}-${f?.[id] ? "error" : "hint"}` })

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      {onboarding && <input type="hidden" name="onboarding" value="1" />}
      <Field id="birthDate" label={tr("Birth date", "Data de nascimento")} hint={tr("For heart rate zones, sleep need and Pulse Age.", "Para as zonas de frequência cardíaca, a necessidade de sono e a Idade Pulse.")} error={f?.birthDate}>
        <BirthDatePicker id="birthDate" name="birthDate" defaultValue={defaults.birthDate} invalid={!!f?.birthDate} describedBy={described("birthDate")["aria-describedby"]} />
      </Field>

      <fieldset className="flex flex-col gap-2" aria-describedby={f?.sex ? "sex-error" : "sex-hint"}>
        <legend className={cn(LABEL, "mb-2")}>{tr("Sex", "Sexo")}</legend>
        <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-field p-1">
          {(["male", "female"] as const).map((v) => (
            <label key={v} className="relative">
              <input type="radio" name="sex" value={v} defaultChecked={defaults.sex === v} required className="peer sr-only" />
              <span
                className={cn(
                  "flex h-11 cursor-pointer items-center justify-center rounded-[10px] text-[15px] font-semibold text-foreground-secondary transition-[background-color,color,scale] duration-150 ease-standard select-none active:scale-[0.96]",
                  "peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:ring-2 peer-focus-visible:ring-foreground/70",
                )}
              >
                {v === "male" ? tr("Male", "Masculino") : tr("Female", "Feminino")}
              </span>
            </label>
          ))}
        </div>
        {f?.sex ? (
          <p id="sex-error" className={ERROR}>
            {tr("Choose one", "Escolha uma opção")}
          </p>
        ) : (
          <p id="sex-hint" className={HINT}>
            {tr("Sex at birth. Reference ranges differ by sex.", "Sexo ao nascer. As faixas de referência diferem por sexo.")}
          </p>
        )}
      </fieldset>

      {zoneOpen || !timeZone || f?.timeZone ? (
        <Field id="timeZone" label={tr("Time zone", "Fuso horário")} hint={tr("Where you live. Your days start at midnight here.", "Onde você mora. Seus dias começam à meia-noite aqui.")} error={f?.timeZone}>
          <TimeZoneCombobox id="timeZone" name="timeZone" value={timeZone} onChange={setTimeZone} className={FIELD} {...described("timeZone")} />
        </Field>
      ) : (
        <div className="flex items-center gap-3 rounded-xl bg-field py-2 pr-2 pl-4">
          <input type="hidden" name="timeZone" value={timeZone} />
          <p className="min-w-0 flex-1">
            <span className={cn(LABEL, "block")}>{tr("Time zone", "Fuso horário")}</span>
            <span className="block truncate text-[15px] leading-5 text-foreground">{describeZone(timeZone)}</span>
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => {
              setZoneOpen(true)
              // Focus opens the list, so Change is one tap.
              requestAnimationFrame(() => document.getElementById("timeZone")?.focus())
            }}
            aria-label={tr("Change time zone", "Mudar o fuso horário")}>
            {tr("Change", "Mudar")}
          </Button>
        </div>
      )}

      {!onboarding && (
        <fieldset className="flex flex-col gap-2" aria-describedby={f?.timeFormat ? "timeFormat-error" : "timeFormat-hint"}>
          <legend className={cn(LABEL, "mb-2")}>{tr("Time format", "Formato de hora")}</legend>
          <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-field p-1">
            {(["24", "12"] as const).map((v) => (
              <label key={v} className="relative">
                <input type="radio" name="timeFormat" value={v} defaultChecked={(defaults.timeFormat ?? "24") === v} className="peer sr-only" />
                <span
                  className={cn(
                    "flex h-11 cursor-pointer items-center justify-center rounded-[10px] text-[15px] font-semibold text-foreground-secondary transition-[background-color,color,scale] duration-150 ease-standard select-none active:scale-[0.96]",
                    "peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:ring-2 peer-focus-visible:ring-foreground/70",
                  )}
                >
                  {v === "24" ? tr("24-hour", "24 horas") : tr("12-hour", "12 horas")}
                </span>
              </label>
            ))}
          </div>
          {f?.timeFormat ? (
            <p id="timeFormat-error" className={ERROR}>
              {f.timeFormat}
            </p>
          ) : (
            <p id="timeFormat-hint" className={HINT}>
              {tr("22:30, or 10:30 PM. This only changes how times are shown.", "22:30 ou 10:30 PM. Isto só muda como os horários são exibidos.")}
            </p>
          )}
        </fieldset>
      )}

      {!onboarding && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
          <Field id="heightCm" label={tr("Height", "Altura")} hint={tr("In cm. Adds lean body mass to Pulse Age.", "Em cm. Inclui a massa magra na Idade Pulse.")} error={f?.heightCm} optional>
            <input id="heightCm" name="heightCm" type="number" inputMode="decimal" min={100} max={250} step="0.1" placeholder="cm" defaultValue={defaults.heightCm ?? ""} className={FIELD} {...described("heightCm")} />
          </Field>
          <Field id="maxHr" label={tr("Max heart rate", "Frequência cardíaca máxima")} hint={tr("Leave blank to estimate it from your age.", "Deixe em branco para estimar pela sua idade.")} error={f?.maxHr} optional>
            <input id="maxHr" name="maxHr" type="number" inputMode="numeric" min={100} max={240} step="1" placeholder="bpm" defaultValue={defaults.maxHr ?? ""} className={FIELD} {...described("maxHr")} />
          </Field>
        </div>
      )}

      {state?.ok === false && state.error && (
        <p role="alert" className={ERROR}>
          {state.error}
        </p>
      )}
      {footer(pending)}
    </form>
  )
}

export function SaveButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <Button type="submit" size="sheet" disabled={pending} aria-busy={pending || undefined}>
      {pending ? tr("Saving…", "Salvando…") : label}
    </Button>
  )
}
