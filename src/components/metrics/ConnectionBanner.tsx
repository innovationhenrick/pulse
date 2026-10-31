"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { CloudDownload, Plug, TriangleAlert, Unplug, UserX, Watch, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { ago } from "@/lib/format"
import { useNow } from "@/hooks/use-now"
import { useOnline } from "@/hooks/use-online"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CARD_MATERIAL } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useClock, useShellStatus } from "@/components/shells/ShellStatus"
import { tr } from "@/lib/locale-context"

/**
 * The one place the app talks about its data connection (spec §5.13). Reads ShellStatus; hidden when
 * connected and in demo mode, except offline, which it always says: the screen may be this device's last copy
 * (public/sw.js). Its action row breaks at 768 px (a shell element).
 */
export function ConnectionBanner({ className }: { className?: string }) {
  const s = useShellStatus()
  const formatClock = useClock()
  const router = useRouter()
  const now = useNow()
  const pathname = usePathname()
  const state = useOnline() ? s.connection : "offline"
  if (state === "connected" || (s.mode === "demo" && state !== "offline")) return null
  // Settings' Data source card already explains it, with the fix next to it.
  if ((state === "not_linked" || state === "no_device") && pathname === "/settings") return null

  const total = s.importProgress?.total ?? 180
  const done = s.importProgress?.done ?? 0
  const connect = (label: string) => (
    <Button asChild size="touch" variant="default">
      <a href="/oauth/start">{label}</a>
    </Button>
  )

  const view = {
    not_connected: {
      icon: <Plug className="text-foreground" />,
      title: tr("Connect Google to start", "Conecte o Google para começar"),
      body: tr("Pulse reads your Fitbit data from Google Health. Nothing syncs until you connect.", "O Pulse lê os dados do seu Fitbit pelo Google Health. Nada sincroniza até você conectar."),
      action: connect(tr("Connect Google", "Conectar Google")),
      role: "status",
    },
    not_linked: {
      icon: <UserX className="text-warning-text" />,
      title: tr("No Google Health on this account", "Esta conta não tem Google Health"),
      body: tr("This Google account has no Google Health profile, so there is nothing to sync. Settings has the fix.", "Esta conta Google não tem perfil no Google Health, então não há o que sincronizar. Os Ajustes têm a solução."),
      action: (
        <Button asChild size="touch" variant="secondary">
          <Link href="/settings?s=source">{tr("Open Settings", "Abrir Ajustes")}</Link>
        </Button>
      ),
      role: "alert",
    },
    no_device: {
      icon: <Watch className="text-warning-text" />,
      title: tr("No Fitbit device on this account", "Esta conta não tem dispositivo Fitbit"),
      body: tr("This Google account has Google Health but no Fitbit device. Pair your Fitbit Air in the Google Health app, or sign in with the account it uses.", "Esta conta Google tem Google Health, mas nenhum dispositivo Fitbit. Pareie seu Fitbit Air no app Google Health ou entre com a conta que ele usa."),
      action: (
        <Button asChild size="touch" variant="secondary">
          <Link href="/settings?s=source">{tr("Open Settings", "Abrir Ajustes")}</Link>
        </Button>
      ),
      role: "alert",
    },
    importing: {
      icon: <CloudDownload className="text-coach-text" />,
      title: tr("Importing history…", "Importando o histórico…"),
      body: tr(`${done} of ${total}\u00a0days. Scores fill in as days arrive.`, `${done} de ${total}\u00a0dias. Os scores se completam conforme os dias chegam.`),
      action: null,
      role: "status",
    },
    auth_revoked: {
      icon: <Unplug className="text-recovery-red-text" />,
      title: tr("Reconnect Google", "Reconecte o Google"),
      body: tr("Google access was revoked or expired. Sync is paused until you reconnect.", "O acesso ao Google foi revogado ou expirou. A sincronização fica pausada até você reconectar."),
      action: connect(tr("Reconnect Google", "Reconectar Google")),
      role: "alert",
    },
    stale: {
      icon: <TriangleAlert className="text-warning-text" />,
      title: tr("Sync is behind", "Sincronização atrasada"),
      body: !s.sync.lastSuccessAt
        ? tr("Sync is behind. Data may be out of date.", "A sincronização está atrasada. Os dados podem estar desatualizados.")
        : now
          ? tr(`Last successful sync ${ago(s.sync.lastSuccessAt, now)}. Data may be out of date.`, `Última sincronização bem-sucedida ${ago(s.sync.lastSuccessAt, now)}. Os dados podem estar desatualizados.`)
          : tr(`Last successful sync at ${formatClock(s.sync.lastSuccessAt, s.timeZone)}. Data may be out of date.`, `Última sincronização bem-sucedida às ${formatClock(s.sync.lastSuccessAt, s.timeZone)}. Os dados podem estar desatualizados.`),
      action: (
        <Button size="touch" variant="secondary" onClick={() => router.refresh()}>
          {tr("Retry", "Tentar de novo")}
        </Button>
      ),
      role: "status",
    },
    offline: {
      icon: <WifiOff className="text-foreground-secondary" />,
      title: tr("You’re offline", "Você está sem conexão"),
      body: tr(
        `${s.sync.lastSuccessAt ? `Last synced ${now ? ago(s.sync.lastSuccessAt, now) : `at ${formatClock(s.sync.lastSuccessAt, s.timeZone)}`}. ` : ""}This is what the device last loaded. Check-in answers are kept and sent when you’re back.`,
        `${s.sync.lastSuccessAt ? `Última sincronização ${now ? ago(s.sync.lastSuccessAt, now) : `às ${formatClock(s.sync.lastSuccessAt, s.timeZone)}`}. ` : ""}Isto é o que o dispositivo carregou por último. As respostas do check-in são guardadas e enviadas quando você voltar.`,
      ),
      action: null,
      role: "status",
    },
  }[state]

  return (
    <Alert
      role={view.role}
      aria-live={view.role === "status" ? "polite" : undefined}
      className={cn(
        CARD_MATERIAL,
        "grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 border-0 px-4 py-3 *:[svg]:size-5! *:[svg]:translate-y-px *:[svg]:stroke-[1.75] md:grid-cols-[auto_minmax(0,1fr)_auto]",
        className
      )}
    >
      {view.icon}
      <AlertTitle className="text-base leading-[22px] font-semibold">{view.title}</AlertTitle>
      <AlertDescription className="col-start-2 text-[15px] leading-[22px] text-pretty text-foreground-secondary md:text-pretty">
        {view.body}
        {s.connection === "importing" && (
          <Progress value={(done / total) * 100} aria-label={tr("Import progress", "Progresso da importação")} className="mt-2 h-1.5 bg-muted" />
        )}
      </AlertDescription>
      {view.action && (
        <div className="col-span-2 mt-3 grid *:w-full md:col-span-1 md:col-start-3 md:row-span-2 md:row-start-1 md:mt-0 md:self-center md:*:w-auto">
          {view.action}
        </div>
      )}
    </Alert>
  )
}
