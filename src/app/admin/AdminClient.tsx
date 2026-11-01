"use client"

import * as React from "react"
import { Ban, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { revokeInviteAction, setCoachAllowedAction, setCoachModeAction, setSignupModeAction } from "@/server/actions/admin"
import type { ActionResult } from "@/server/actions/journal"
import type { SignupMode } from "@/server/admin"
import type { CoachMode } from "@/server/coach/store"
import { cn } from "@/lib/utils"
import { tr } from "@/lib/locale-context"
import { Switch } from "@/components/ui/switch"
import { BTN } from "./ui"

/** Runs an action and toasts its error; a dropped connection is an error too, never a thrown error screen. */
export const run = async <T,>(p: Promise<ActionResult<T>>): Promise<{ data: T } | null> => {
  const r = await p.catch((): ActionResult<T> => ({ ok: false, error: tr("Couldn’t reach Pulse. Try again.", "Não foi possível conectar ao Pulse. Tente de novo.") }))
  if (r.ok) return r
  toast.error(r.error)
  return null
}

const choices = () => ({
  signup: {
    label: tr("Who can create an account", "Quem pode criar uma conta"),
    options: [
      { value: "invite", title: tr("Invite only", "Somente por convite"), body: tr("People need a link from Invites. Recommended.", "É preciso um link de Convites. Recomendado.") },
      { value: "open", title: tr("Open to anyone", "Aberto a todos"), body: tr("Anyone who can reach this server can sign up.", "Quem alcançar este servidor pode se cadastrar.") },
      { value: "closed", title: tr("Closed", "Fechado"), body: tr("No new accounts, not even with a link. Existing people still sign in.", "Sem novas contas, nem com link. Quem já tem conta continua entrando.") },
    ],
    save: (v: string) => setSignupModeAction(v as SignupMode),
    saved: tr("Sign-up updated.", "Cadastro atualizado."),
  },
  coach: {
    label: tr("Who can use the AI coach", "Quem pode usar o coach de IA"),
    options: [
      { value: "off", title: tr("Off", "Desligado"), body: tr("Nobody sees the coach. The round P button opens the check-in.", "Ninguém vê o coach. O botão redondo P abre o check-in.") },
      { value: "everyone", title: tr("Everyone", "Todos"), body: tr("Every account can set it up with its own provider key.", "Toda conta pode configurá-lo com a própria chave de provedor.") },
      { value: "chosen", title: tr("Chosen people", "Pessoas escolhidas"), body: tr("Only people you switch on in People, plus owners.", "Só as pessoas que você ativar em Pessoas, além dos donos.") },
    ],
    save: (v: string) => setCoachModeAction(v as CoachMode),
    saved: tr("Coach access updated.", "Acesso ao coach atualizado."),
  },
})

/** A server-wide setting as a set of described choices; saved as soon as one is picked. */
export function ModeChoice({ kind, value }: { kind: keyof ReturnType<typeof choices>; value: string }) {
  const { label, options, save, saved } = choices()[kind]
  const [current, setCurrent] = React.useState(value)
  const [pending, start] = React.useTransition()
  const pick = (v: string) => {
    if (v === current || pending) return
    setCurrent(v)
    start(async () => {
      if (await run(save(v))) toast.success(saved)
      else setCurrent(value)
    })
  }
  return (
    <div role="radiogroup" aria-label={label} aria-busy={pending || undefined} className="grid gap-2 sm:grid-cols-3">
      {options.map((o) => {
        const on = current === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => pick(o.value)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl p-4 text-left outline-none ring-1 transition-[background-color,box-shadow] duration-150 ease-standard focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.99]",
              on ? "bg-coach/10 ring-coach/60" : "ring-border hover:bg-foreground/[0.03]",
            )}
          >
            <span className="flex w-full items-center justify-between gap-2 text-[14px] leading-5 font-semibold">
              {o.title}
              <span aria-hidden className={cn("grid size-4 place-items-center rounded-full ring-1", on ? "ring-coach" : "ring-muted-foreground/50")}>
                {on && <span className="size-2 rounded-full bg-coach" />}
              </span>
            </span>
            <span className="text-[13px] leading-[18px] text-pretty text-muted-foreground">{o.body}</span>
          </button>
        )
      })}
    </div>
  )
}

/** A person's coach switch (access = chosen people). */
export function CoachSwitch({ id, name, allowed }: { id: number; name: string; allowed: boolean }) {
  const [on, setOn] = React.useState(allowed)
  const [pending, start] = React.useTransition()
  return (
    <Switch
      checked={on}
      disabled={pending}
      aria-label={tr(`Coach for ${name}`, `Coach para ${name}`)}
      onCheckedChange={(v) => {
        setOn(v)
        start(async () => {
          if (!(await run(setCoachAllowedAction(id, v)))) setOn(!v)
        })
      }}
    />
  )
}

/** Revoke a waiting invite (its link stops working), or clear an expired one from the list. */
export function RevokeInvite({ id, label, expired }: { id: number; label: string; expired?: boolean }) {
  const [pending, start] = React.useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`${expired ? tr("Remove", "Remover") : tr("Revoke", "Revogar")} ${label}`}
      onClick={() => start(async () => void ((await run(revokeInviteAction(id))) && toast.success(expired ? tr("Invite removed.", "Convite removido.") : tr("Invite revoked. Its link no longer works.", "Convite revogado. O link não funciona mais."))))}
      // Phones: icon only, a 40 px square at the end of the row (the label stays as the accessible name).
      className={cn(expired ? BTN.outline : BTN.danger, "max-md:size-10 max-md:px-0 max-md:[&_svg]:size-4")}
    >
      {expired ? <Trash2 aria-hidden /> : <Ban aria-hidden />}
      <span className="max-md:sr-only">{pending ? (expired ? tr("Removing…", "Removendo…") : tr("Revoking…", "Revogando…")) : expired ? tr("Remove", "Remover") : tr("Revoke", "Revogar")}</span>
    </button>
  )
}
