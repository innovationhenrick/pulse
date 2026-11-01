"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import type { ActionResult } from "@/server/actions/journal"
import { deleteAllChatsAction, removeProviderAction, setConsentAction, setPreferencesAction } from "@/server/actions/coach"
import type { ProviderOption } from "@/server/coach/options"
import type { CoachSetup } from "@/server/coach/store"
import { ResponsiveSheet } from "@/components/shells/ResponsiveSheet"
import { SectionShell } from "@/components/shells/SectionShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { loginMessage, ProviderForm } from "./CoachSetup"
import { tr } from "@/lib/locale-context"

/** 7:00 AM: where the time starts when the brief is switched on. */
const DEFAULT_BRIEF = 7 * 60
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
const toMinute = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

const ROW = "flex min-h-13 items-center justify-between gap-3 py-2"

/**
 * Settings › Coach: the provider and model, the key as ••••last4 only, and the controls to change or remove it,
 * turn the coach off (consent) or delete every chat.
 */
export function CoachSettings({ setup, providers, providerLabel, notifications }: { setup: CoachSetup; providers: ProviderOption[]; providerLabel: string; notifications: boolean }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, start] = React.useTransition()
  const [confirm, setConfirm] = React.useState<null | "chats" | "off">(null)
  const [notes, setNotes] = React.useState(setup.instructions ?? "")
  const [brief, setBrief] = React.useState(setup.briefMinute)
  // Back from "Sign in with Google": say how it went once, then drop the flag from the address.
  const returned = useSearchParams().get("coach_login")
  React.useEffect(() => {
    const m = loginMessage(returned)
    if (!m) return
    if (m.ok) toast.success(m.text)
    else toast.error(m.text)
    router.replace("/settings", { scroll: false })
  }, [returned, router])
  // Optimistic: the switch and the time stay put while the save runs; a failed save puts them back.
  const saveBrief = (m: number | null) => {
    setBrief(m)
    void setPreferencesAction({ briefMinute: m })
      .catch((): ActionResult => ({ ok: false, error: tr("Couldn’t reach Pulse. Try again.", "Não foi possível conectar ao Pulse. Tente de novo.") }))
      .then((r) => {
        if (!r.ok) return (setBrief(setup.briefMinute), void toast.error(r.error))
        router.refresh()
      })
  }
  const signedIn = providers.some((p) => p.id === setup.provider && (p.auth === "google" || p.auth === "chatgpt"))
  const act = (p: () => Promise<ActionResult>, ok: string, done?: () => void) =>
    start(async () => {
      const r = await p().catch((): ActionResult => ({ ok: false, error: tr("Couldn’t reach Pulse. Try again.", "Não foi possível conectar ao Pulse. Tente de novo.") }))
      if (!r.ok) return void toast.error(r.error)
      done?.()
      toast.success(ok)
      router.refresh()
    })
  return (
    <SectionShell variant="card" level={2} id="coach" title="Coach">
      {!setup.consent ? (
        <div className={ROW}>
          <span className="text-[15px] leading-[22px] text-foreground-secondary">{tr("Off", "Desligado")}</span>
          <Button asChild variant="secondary" size="touch">
            <Link href="/coach">{tr("Set up", "Configurar")}</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border">
            <div className={ROW}>
              <span className="text-[15px] leading-[22px]">{tr("Provider", "Provedor")}</span>
              <span className="truncate text-right text-[15px] leading-[22px] text-foreground-secondary">{(setup.provider && providers.find((p) => p.id === setup.provider)?.label) ?? (setup.provider ? providerLabel : tr("Not set", "Não definido"))}</span>
            </div>
            {setup.model && (
              <div className={ROW}>
                <span className="text-[15px] leading-[22px]">{tr("Model", "Modelo")}</span>
                <span className="truncate text-right font-numeric text-[15px] leading-[22px] text-foreground-secondary">{setup.model}</span>
              </div>
            )}
            {(setup.last4 || signedIn) && (
              <div className={ROW}>
                <span className="text-[15px] leading-[22px]">{signedIn ? tr("Account", "Conta") : tr("API key", "Chave de API")}</span>
                <span className="flex items-center gap-3">
                  <span className="truncate font-numeric text-[15px] leading-[22px] text-foreground-secondary tabular-nums">{signedIn ? (setup.last4 ?? tr("Connected", "Conectada")) : `••••${setup.last4}`}</span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => act(removeProviderAction, signedIn ? tr("Account disconnected.", "Conta desconectada.") : tr("Key removed.", "Chave removida."))}
                    className="relative rounded-md text-[13px] font-semibold text-recovery-red-text outline-none after:absolute after:-inset-3 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {signedIn ? tr("Disconnect", "Desconectar") : tr("Remove", "Remover")}
                  </button>
                </span>
              </div>
            )}
            {notifications && (
              <div className={ROW}>
                <label htmlFor="coach-brief-on" className="text-[15px] leading-[22px]">
                  {tr("Morning brief", "Resumo da manhã")}
                </label>
                <span className="flex items-center gap-3">
                  {brief !== null && (
                    <Input
                      type="time"
                      aria-label={tr("Morning brief time", "Horário do resumo da manhã")}
                      className="w-28"
                      value={clock(brief)}
                      onChange={(e) => e.target.value && setBrief(toMinute(e.target.value))}
                      onBlur={() => brief !== setup.briefMinute && saveBrief(brief)}
                    />
                  )}
                  <Switch id="coach-brief-on" checked={brief !== null} onCheckedChange={(on) => saveBrief(on ? DEFAULT_BRIEF : null)} />
                </span>
              </div>
            )}
            <div className="py-2">
              <label htmlFor="coach-notes" className="text-[15px] leading-[22px]">{tr("About you", "Sobre você")}</label>
              <textarea
                id="coach-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => notes.trim() !== (setup.instructions ?? "") && act(() => setPreferencesAction({ instructions: notes }), tr("Saved.", "Salvo."))}
                maxLength={500}
                rows={3}
                placeholder={tr("Short and direct. I lift four days a week and I'm training for a half marathon.", "Curto e direto. Treino musculação quatro dias por semana e estou me preparando para uma meia maratona.")}
                className="mt-1 w-full resize-none rounded-lg border border-border bg-transparent px-3 py-2 text-[15px] leading-[22px] outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <p className="text-[13px] leading-[18px] text-muted-foreground">{tr("How you’d like the coach to talk and what it should know. It never changes the coach’s safety rules.", "Como você quer que o coach fale e o que ele deve saber. Isso nunca muda as regras de segurança do coach.")}</p>
            </div>
          </div>
          {/* Change the provider full width; clear the chats or turn the coach off side by side, like the account card. */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" size="touch" className="col-span-2" onClick={() => setOpen(true)} disabled={pending}>
              {setup.provider ? tr("Change provider", "Trocar provedor") : tr("Connect", "Conectar")}
            </Button>
            <Button variant="outline" size="touch" disabled={pending} onClick={() => setConfirm("chats")}>
              {tr("Delete chats", "Apagar conversas")}
            </Button>
            <Button variant="outline" size="touch" disabled={pending} onClick={() => setConfirm("off")}>
              {tr("Turn off", "Desligar")}
            </Button>
          </div>
          <p className="mt-3 text-[13px] leading-[18px] text-muted-foreground">{tr("Your key is encrypted on this server and never shown again. Admins can’t see it or your chats.", "Sua chave é criptografada neste servidor e nunca mostrada de novo. Admins não veem a chave nem suas conversas.")}</p>
        </>
      )}
      <ResponsiveSheet open={open} onOpenChange={setOpen} title={tr("AI provider", "Provedor de IA")}>
        <ProviderForm from="settings" providers={providers} current={setup} onSaved={() => (setOpen(false), toast.success(tr("Provider saved.", "Provedor salvo.")))} />
      </ResponsiveSheet>
      <Dialog open={confirm !== null} onOpenChange={(o) => !o && !pending && setConfirm(null)}>
        <DialogContent showCloseButton={false} className="ring-1 ring-border">
          <DialogHeader>
            <DialogTitle>{confirm === "chats" ? tr("Delete every coach chat?", "Apagar todas as conversas do coach?") : tr("Turn the coach off?", "Desligar o coach?")}</DialogTitle>
            <DialogDescription>
              {confirm === "chats"
                ? tr("All your saved chats are removed from this server. This can’t be undone.", "Todas as suas conversas salvas serão removidas deste servidor. Não dá para desfazer.")
                : tr("The coach stops until you set it up again. Your key and chats stay; delete them here first if you want them gone.", "O coach para até você configurá-lo de novo. Sua chave e suas conversas continuam; apague-as aqui antes se quiser removê-las.")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" size="touch" onClick={() => setConfirm(null)} disabled={pending}>
              {tr("Cancel", "Cancelar")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="touch"
              className={confirm === "chats" ? "text-recovery-red-text" : undefined}
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={() =>
                confirm === "chats"
                  ? act(deleteAllChatsAction, tr("Every chat deleted.", "Todas as conversas apagadas."), () => setConfirm(null))
                  : act(() => setConsentAction(false), tr("Coach turned off.", "Coach desligado."), () => setConfirm(null))
              }
            >
              {confirm === "chats" ? tr("Delete chats", "Apagar conversas") : tr("Turn off", "Desligar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionShell>
  )
}
