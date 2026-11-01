"use client"

import * as React from "react"
import { Check, Copy, KeyRound, LogOut, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { deleteAccountAction, resetPasswordAction, setRoleAction, signOutEverywhereAction } from "@/server/actions/admin"
import { cn } from "@/lib/utils"
import { tr } from "@/lib/locale-context"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { CoachSwitch, run } from "./AdminClient"
import type { Person } from "./People"
import { BTN, Pill, relative, shortDate } from "./ui"

const role = () => ({ owner: tr("Owner", "Dono"), admin: "Admin", user: tr("Member", "Membro") }) as const

/** A confirmation dialog for one action; the confirm button carries the action's own name. */
function Confirm({ open, onOpenChange, title, body, action, danger, pending, onConfirm, children }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  body: React.ReactNode
  action: string
  danger?: boolean
  pending: boolean
  onConfirm: () => void
  children?: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent showCloseButton={false} className="ring-1 ring-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <button type="button" className={cn(BTN.outline, "h-9 px-4 text-[14px] pointer-coarse:h-10")} onClick={() => onOpenChange(false)} disabled={pending}>
            {tr("Cancel", "Cancelar")}
          </button>
          <button type="button" className={cn(danger ? BTN.danger : BTN.primary, "h-9 px-4 text-[14px] pointer-coarse:h-10")} onClick={onConfirm} disabled={pending} aria-busy={pending || undefined}>
            {pending ? tr("Working…", "Processando…") : action}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** A labelled group in the panel. */
function Group({ title, children, tone }: { title: string; children: React.ReactNode; tone?: "danger" }) {
  return (
    <section aria-label={title} className={cn("rounded-xl p-4 ring-1", tone === "danger" ? "bg-recovery-red/[0.04] ring-recovery-red/25" : "ring-border")}>
      <h3 className={cn("mb-3 text-[13px] font-semibold", tone === "danger" ? "text-recovery-red-text" : "text-foreground-secondary")}>{title}</h3>
      {children}
    </section>
  )
}

/** A setting row: what it is and what it does, then its control. */
function Row({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="min-w-0">
        <p className="text-[14px] leading-5 font-medium">{title}</p>
        <p className="mt-0.5 text-[13px] leading-[18px] text-pretty text-muted-foreground">{body}</p>
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  )
}

/** What a person's row needs from their panel: open it, or ask to delete straight from the row (laptop table). */
export type PanelControls = { open: () => void; askDelete: () => void; admin: boolean }

/**
 * One person's panel: details for everyone (joined, last active, devices, Google, coach), and for people you can
 * manage, admin and coach access, sign out everywhere, reset password (owners only) and delete. Owners (ADMIN_EMAILS)
 * and you get the details only. The row renders through `children`, so a phone row can open the panel and a laptop
 * row can show Manage and Delete buttons, while the panel, its dialogs and their state stay here.
 */
export function PersonPanel({ person: p, now, chosen, canReset, me, children }: {
  person: Person
  now: number
  chosen: boolean
  canReset: boolean
  me: boolean
  children: (c: PanelControls) => React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [pending, start] = React.useTransition()
  const [admin, setAdmin] = React.useState(p.role === "admin")
  const [confirm, setConfirm] = React.useState<null | "delete" | "signout" | "reset">(null)
  const [temp, setTemp] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const manageable = p.role !== "owner" && !me

  const toggleAdmin = (v: boolean) => {
    setAdmin(v)
    start(async () => {
      if (await run(setRoleAction(p.id, v ? "admin" : "user"))) toast.success(v ? tr(`${p.name} is now an admin.`, `${p.name} agora é admin.`) : tr(`${p.name} is no longer an admin.`, `${p.name} não é mais admin.`))
      else setAdmin(!v)
    })
  }
  const act = (fn: () => Promise<void>) => start(fn)
  const signOut = () =>
    act(async () => {
      const r = await run(signOutEverywhereAction(p.id))
      if (!r) return
      setConfirm(null)
      toast.success(
        r.data
          ? tr(`${p.name} is signed out on ${r.data === 1 ? "1 device" : `${r.data} devices`}.`, `${p.name} foi desconectado de ${r.data === 1 ? "1 dispositivo" : `${r.data} dispositivos`}.`)
          : tr(`${p.name} wasn’t signed in anywhere.`, `${p.name} não estava conectado em lugar nenhum.`),
      )
    })
  const reset = () =>
    act(async () => {
      const r = await run(resetPasswordAction(p.id))
      if (r) setTemp(r.data)
    })
  const remove = () =>
    act(async () => {
      if (await run(deleteAccountAction(p.id))) {
        setConfirm(null)
        setOpen(false)
        toast.success(tr(`${p.name}’s account was deleted.`, `A conta de ${p.name} foi excluída.`))
      }
    })
  const copy = async () => {
    if (!temp) return
    try {
      await navigator.clipboard.writeText(temp)
      setCopied(true)
    } catch {
      toast.error(tr("Couldn’t copy. Select the password and copy it.", "Não foi possível copiar. Selecione a senha e copie."))
    }
  }

  return (
    <>
      {children({ open: () => setOpen(true), askDelete: () => setConfirm("delete"), admin })}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" showCloseButton={false} className="gap-0 overflow-y-auto overscroll-none bg-background p-0 pb-[env(safe-area-inset-bottom)] data-[side=right]:w-full data-[side=right]:max-sm:border-l-0 data-[side=right]:sm:max-w-md">
          <SheetHeader className="border-b border-border p-5 pt-[max(var(--inset-top),20px)] pr-14">
            <SheetClose
              aria-label={tr("Close", "Fechar")}
              className="absolute top-[max(var(--inset-top),12px)] right-3 grid size-10 place-items-center rounded-lg text-muted-foreground outline-none transition-[background-color,color] duration-150 ease-standard hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <X aria-hidden className="size-5" strokeWidth={1.75} />
            </SheetClose>
            <div className="flex items-center gap-3">
              <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-foreground/[0.07] text-[17px] font-semibold">
                {p.name.trim()[0]?.toUpperCase()}
              </span>
              <div className="min-w-0">
                <SheetTitle className="truncate text-[17px]">{p.name}</SheetTitle>
                <SheetDescription className="truncate">{p.email}</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="grid gap-4 p-5">
            <Group title={tr("Details", "Detalhes")}>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[14px]">
                <dt className="text-muted-foreground">{tr("Role", "Função")}</dt>
                <dd className="text-right">
                  <Pill tone={admin || p.role === "owner" ? "coach" : "neutral"}>{admin ? "Admin" : role()[p.role]}</Pill>
                </dd>
                <dt className="text-muted-foreground">{tr("Username", "Usuário")}</dt>
                <dd className="min-w-0 truncate text-right">{p.username ? `@${p.username}` : tr("Not set", "Não definido")}</dd>
                <dt className="text-muted-foreground">{tr("Joined", "Entrou")}</dt>
                <dd className="text-right">{shortDate(p.createdAt)}</dd>
                <dt className="text-muted-foreground">{tr("Last active", "Última atividade")}</dt>
                <dd className="text-right">{p.lastSeen ? relative(p.lastSeen, now) : tr("Not signed in", "Sem acesso")}</dd>
                <dt className="text-muted-foreground">{tr("Signed in on", "Conectado em")}</dt>
                <dd className="text-right font-numeric tabular-nums">{p.sessions === 1 ? tr("1 device", "1 dispositivo") : tr(`${p.sessions} devices`, `${p.sessions} dispositivos`)}</dd>
                <dt className="text-muted-foreground">Google</dt>
                <dd className="text-right">{p.google ? <Pill tone="good">{tr("Connected", "Conectado")}</Pill> : <Pill>{tr("Not yet", "Ainda não")}</Pill>}</dd>
                <dt className="text-muted-foreground">{tr("AI coach", "Coach de IA")}</dt>
                <dd className="text-right">{p.coachReady ? <Pill tone="coach">{tr("Set up", "Configurado")}</Pill> : <span className="text-muted-foreground">{tr("Not set up", "Não configurado")}</span>}</dd>
              </dl>
            </Group>

            {!manageable && (
              <p className="rounded-xl bg-foreground/[0.04] p-4 text-[13px] leading-[18px] text-pretty text-muted-foreground">
                {p.role === "owner"
                  ? tr("Owners are set in .env (ADMIN_EMAILS) and are changed there, not here.", "Os donos são definidos no .env (ADMIN_EMAILS) e mudam por lá, não aqui.")
                  : tr("This is you. Change your own account in Settings › Account.", "Este é você. Altere sua própria conta em Ajustes › Conta.")}
              </p>
            )}

            {manageable && (
              <>
                <Group title={tr("Access", "Acesso")}>
                  <div className="grid gap-3">
                    <Row title="Admin" body={tr("Can open this dashboard: people, invites, access and the coach’s wording.", "Pode abrir este painel: pessoas, convites, acesso e os textos do coach.")}>
                      <Switch checked={admin} disabled={pending} onCheckedChange={toggleAdmin} aria-label={`Admin: ${p.name}`} />
                    </Row>
                    <Row title={tr("AI coach", "Coach de IA")} body={chosen ? tr("Can set up the coach with their own key.", "Pode configurar o coach com a própria chave.") : tr("Set for everyone on the Access page.", "Definido para todos na página Acesso.")}>
                      {chosen ? <CoachSwitch id={p.id} name={p.name} allowed={p.coachAllowed} /> : <span className="text-[13px] text-muted-foreground">{tr("Server-wide", "Em todo o servidor")}</span>}
                    </Row>
                  </div>
                </Group>

                <Group title={tr("Sign-in", "Login")}>
                  <div className="grid gap-3">
                    <Row title={tr("Sign out everywhere", "Sair de todos os dispositivos")} body={tr("Ends every session. They sign in again with their password.", "Encerra todas as sessões. A pessoa entra de novo com a senha.")}>
                      <button type="button" disabled={pending || p.sessions === 0} onClick={() => setConfirm("signout")} className={BTN.outline}>
                        <LogOut aria-hidden />
                        {tr("Sign out", "Sair")}
                      </button>
                    </Row>
                    <Row title={tr("Reset password", "Redefinir senha")} body={canReset ? tr("Sets a temporary password you send them, and signs them out everywhere.", "Cria uma senha temporária para você enviar e desconecta a pessoa de todos os dispositivos.") : tr("Only an owner (ADMIN_EMAILS) can reset passwords.", "Só um dono (ADMIN_EMAILS) pode redefinir senhas.")}>
                      <button type="button" disabled={pending || !canReset} onClick={() => (setTemp(null), setCopied(false), setConfirm("reset"))} className={BTN.outline}>
                        <KeyRound aria-hidden />
                        {tr("Reset", "Redefinir")}
                      </button>
                    </Row>
                  </div>
                </Group>

                <Group title={tr("Danger zone", "Zona de perigo")} tone="danger">
                  <Row title={tr("Delete account", "Excluir conta")} body={admin ? tr("Remove admin first.", "Remova o admin primeiro.") : tr("Removes the account and all its data. This can’t be undone.", "Remove a conta e todos os dados. Não dá para desfazer.")}>
                    <button type="button" disabled={pending || admin} onClick={() => setConfirm("delete")} aria-label={tr(`Delete ${p.name}`, `Excluir ${p.name}`)} className={BTN.danger}>
                      <Trash2 aria-hidden />
                      {tr("Delete", "Excluir")}
                    </button>
                  </Row>
                </Group>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Confirm
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={tr(`Delete ${p.name}’s account?`, `Excluir a conta de ${p.name}?`)}
        body={tr("Removes the account and everything Pulse stored for it: synced data, scores, journal, coach chats, profile and the Google connection. This can’t be undone.", "Remove a conta e tudo que o Pulse guardou dela: dados sincronizados, pontuações, diário, conversas do coach, perfil e a conexão com o Google. Não dá para desfazer.")}
        action={tr("Delete account", "Excluir conta")}
        danger
        pending={pending}
        onConfirm={remove}
      />
      <Confirm
        open={confirm === "signout"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={tr(`Sign ${p.name} out everywhere?`, `Desconectar ${p.name} de todos os dispositivos?`)}
        body={tr("Every device they’re signed in on is signed out. Their data stays.", "Todos os dispositivos conectados serão desconectados. Os dados dela continuam.")}
        action={tr("Sign out everywhere", "Sair de todos os dispositivos")}
        pending={pending}
        onConfirm={signOut}
      />
      <Confirm
        open={confirm === "reset"}
        onOpenChange={(o) => !o && (setConfirm(null), setTemp(null))}
        title={temp ? tr("Temporary password", "Senha temporária") : tr(`Reset ${p.name}’s password?`, `Redefinir a senha de ${p.name}?`)}
        body={
          temp
            ? tr("Send it to them privately. It isn’t shown again. They sign in with it, then change it in Settings › Account.", "Envie em particular. Ela não será mostrada de novo. A pessoa entra com ela e depois a troca em Ajustes › Conta.")
            : tr("Their current password stops working and they’re signed out everywhere. You get a temporary password to send them.", "A senha atual deixa de funcionar e a pessoa é desconectada de todos os dispositivos. Você recebe uma senha temporária para enviar.")
        }
        action={temp ? tr("Done", "Concluir") : tr("Reset password", "Redefinir senha")}
        pending={pending}
        onConfirm={temp ? () => (setConfirm(null), setTemp(null)) : reset}
      >
        {temp && (
          <div className="flex items-center gap-2">
            <input readOnly value={temp} aria-label={tr("Temporary password", "Senha temporária")} onFocus={(e) => e.currentTarget.select()} className="h-10 min-w-0 flex-1 rounded-md bg-secondary px-3 font-mono text-[14px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
            <button type="button" onClick={copy} className={cn(BTN.outline, "h-10")}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? tr("Copied", "Copiado") : tr("Copy", "Copiar")}
            </button>
          </div>
        )}
      </Confirm>
    </>
  )
}
