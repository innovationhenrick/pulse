"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Camera, KeyRound, Monitor, Moon, Pencil, Sun } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useTheme } from "@/hooks/use-theme"
import { toast } from "sonner"
import { LOCALE_NAMES, LOCALES, type Locale } from "@/i18n/config"
import { setLocaleAction } from "@/server/actions/locale"
import { uploadAvatar } from "@/server/actions/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ResponsiveSheet } from "@/components/shells/ResponsiveSheet"
import { ProfileForm, SaveButton, type ProfileDefaults } from "@/components/profile/ProfileForm"
import type { Crop } from "@/lib/crop"
import { AuthField } from "@/components/auth/AuthForm"
import { authClient } from "@/lib/auth-client"
import { disconnectGoogle } from "./actions"
import { AvatarCropSheet, decodePhoto, encodeAvatar } from "./AvatarCropSheet"
import { tr } from "@/lib/locale-context"

/** Landing back from Google with `?oauth=connected` or `?oauth=<code>` shows one toast, then drops the param. */
function OAuthToastInner() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const result = params.get("oauth")
  React.useEffect(() => {
    if (!result) return
    // A fixed id: Strict Mode (dev) runs this effect twice before the param is gone, and sonner keeps one toast per id.
    const id = "oauth-result"
    if (result === "connected") toast.success(tr("Google connected", "Google conectado"), { id })
    else if (result === "expired") toast.error(tr("That Google sign-in link expired or was already used. Connect again.", "Esse link de login do Google expirou ou já foi usado. Conecte de novo."), { id })
    else if (result === "access_denied") toast.error(tr("Google access wasn’t granted. Connect again to allow it.", "O acesso ao Google não foi concedido. Conecte de novo para permitir."), { id })
    else toast.error(tr(`Couldn’t connect Google (${result}). Try again.`, `Não foi possível conectar o Google (${result}). Tente de novo.`), { id })
    router.replace(`${pathname}${window.location.hash}`, { scroll: false })
  }, [result, router, pathname])
  return null
}

export function OAuthToast() {
  return (
    <React.Suspense fallback={null}>
      <OAuthToastInner />
    </React.Suspense>
  )
}

/** "Disconnect" and its confirmation dialog (spec §7.14). */
export function DisconnectButton() {
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState(false)
  const run = async () => {
    setPending(true)
    setError(false)
    const r = await disconnectGoogle().catch(() => ({ ok: false as const, error: "network" }))
    setPending(false)
    if (!r.ok) return setError(true)
    setOpen(false)
    toast.success(tr("Google access removed", "Acesso ao Google removido"))
  }
  return (
    <>
      <Button variant="outline" size="touch" className="w-full text-recovery-red-text" onClick={() => setOpen(true)}>
        {tr("Disconnect", "Desconectar")}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent showCloseButton={false} className="ring-1 ring-border">
          <DialogHeader>
            <DialogTitle>{tr("Disconnect Google?", "Desconectar o Google?")}</DialogTitle>
            <DialogDescription>{tr("Removes every permission Pulse has in your Google account, so you don’t have to do it in Google. Sync stops; your stored data stays on this server.", "Remove todas as permissões que o Pulse tem na sua conta Google, para você não precisar fazer isso no Google. A sincronização para; seus dados armazenados ficam neste servidor.")}</DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-xs leading-4 font-medium text-recovery-red-text">
              {tr("Couldn’t reach Google to remove access. Check your connection and try again.", "Não foi possível acessar o Google para remover o acesso. Verifique sua conexão e tente de novo.")}
            </p>
          )}
          <DialogFooter>
            <Button variant="secondary" size="touch" onClick={() => setOpen(false)} disabled={pending}>
              {tr("Cancel", "Cancelar")}
            </Button>
            <Button variant="outline" size="touch" className="text-recovery-red-text" onClick={run} disabled={pending}>
              {pending ? tr("Disconnecting…", "Desconectando…") : tr("Disconnect", "Desconectar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * "Switch account": connect a different Google account. Its confirmation says what happens to the data the current
 * account synced, because the callback clears it (journal, profile and dashboard stay).
 */
export function SwitchGoogleButton({ current }: { current: string | null }) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button variant="secondary" size="touch" className="w-full" aria-label={tr("Switch Google account", "Trocar de conta Google")} onClick={() => setOpen(true)}>
        {tr("Switch Google account", "Trocar de conta Google")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="ring-1 ring-border">
          <DialogHeader>
            <DialogTitle>{tr("Switch Google account?", "Trocar de conta Google?")}</DialogTitle>
            <DialogDescription>
              {tr(`${current ? `Pulse removes what it synced from ${current}` : "Pulse removes the data synced so far"} and imports the new account’s history. Your journal, profile and dashboard stay.`, `${current ? `O Pulse remove o que sincronizou de ${current}` : "O Pulse remove os dados sincronizados até agora"} e importa o histórico da nova conta. Seu diário, seu perfil e seu painel continuam.`)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" size="touch" onClick={() => setOpen(false)}>
              {tr("Cancel", "Cancelar")}
            </Button>
            <Button asChild size="touch">
              {/* A plain anchor: it leaves the app for Google's account chooser. */}
              <a href="/oauth/start?switch=1">{tr("Choose account", "Escolher conta")}</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** A better-auth client call's failure as one line of copy. */
function authErrorText(e: { status?: number; code?: string }, wrongPassword: string) {
  if (e.status === 429) return tr("Too many tries. Wait a few minutes, then try again.", "Muitas tentativas. Aguarde alguns minutos e tente de novo.")
  if (e.status === 0) return tr("Couldn’t reach Pulse. Try again.", "Não foi possível acessar o Pulse. Tente de novo.")
  if (e.code === "INVALID_PASSWORD") return wrongPassword
  if (e.code === "PASSWORD_TOO_SHORT") return tr("Use at least 10 characters.", "Use pelo menos 10 caracteres.")
  if (e.code === "PASSWORD_TOO_LONG") return tr("Use at most 128 characters.", "Use no máximo 128 caracteres.")
  return tr("Something went wrong. Try again.", "Algo deu errado. Tente de novo.")
}
const offline = () => ({ data: null, error: { status: 0 } })

/** Settings › Account › Change password, in a sheet. Other devices are signed out when it saves. */
export function ChangePasswordButton() {
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setPending(true)
    setError(null)
    const { error: err } = await authClient
      .changePassword({ currentPassword: String(form.get("current")), newPassword: String(form.get("next")), revokeOtherSessions: true })
      .catch(offline)
    setPending(false)
    if (err) return setError(authErrorText(err, tr("Current password is incorrect.", "A senha atual está incorreta.")))
    setOpen(false)
    toast.success(tr("Password changed. Other devices are signed out.", "Senha alterada. Os outros dispositivos foram desconectados."))
  }
  return (
    <>
      <Button variant="secondary" size="touch" className="w-full" aria-label={tr("Change password", "Alterar senha")} onClick={() => setOpen(true)}>
        <KeyRound aria-hidden strokeWidth={2} />
        Password
      </Button>
      <ResponsiveSheet
        open={open}
        onOpenChange={(o) => {
          if (pending) return
          setOpen(o)
          setError(null)
        }}
        title={tr("Change password", "Alterar senha")}
        description={tr("Other devices are signed out.", "Os outros dispositivos serão desconectados.")}
      >
        <form onSubmit={submit} className="flex flex-col gap-5 px-4 pb-[max(env(safe-area-inset-bottom),16px)] md:px-6 md:pb-6">
          <AuthField label={tr("Current password", "Senha atual")} name="current" type="password" autoComplete="current-password" required />
          <AuthField label={tr("New password", "Nova senha")} name="next" type="password" autoComplete="new-password" required minLength={10} maxLength={128} hint={tr("At least 10 characters.", "Pelo menos 10 caracteres.")} />
          {error && (
            <p role="alert" className="px-1 text-[13px] leading-[18px] font-medium text-recovery-red-text">
              {error}
            </p>
          )}
          <SaveButton pending={pending} label={tr("Change password", "Alterar senha")} />
        </form>
      </ResponsiveSheet>
    </>
  )
}

/**
 * Settings › Account › Delete account: asks for the password, then removes the account and everything stored for it
 * (the database cascades every per-user table). Lands on sign-up.
 */
export function DeleteAccountButton() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const password = String(new FormData(e.currentTarget).get("password"))
    setPending(true)
    setError(null)
    const { error: err } = await authClient.deleteUser({ password }).catch(offline)
    if (err) {
      setPending(false)
      return setError(authErrorText(err, tr("Password is incorrect.", "A senha está incorreta.")))
    }
    router.replace("/signup")
    router.refresh()
  }
  return (
    <>
      <Button
        variant="ghost"
        // Outlined in red: easy to find, clearly destructive, still quieter than the everyday buttons above.
        className="h-11 rounded-full px-5 text-[13px] font-bold tracking-[0.06em] text-recovery-red-text uppercase ring-1 ring-recovery-red/45 hover:bg-recovery-red/10 hover:text-recovery-red-text"
        onClick={() => setOpen(true)}
      >
        {tr("Delete account", "Excluir conta")}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (pending) return
          setOpen(o)
          setError(null)
        }}
      >
        <DialogContent showCloseButton={false} className="ring-1 ring-border">
          <form onSubmit={submit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{tr("Delete your account?", "Excluir sua conta?")}</DialogTitle>
              <DialogDescription>
                {tr("Removes your account and everything Pulse stored for it: synced data, scores, journal, profile and the Google connection. This can’t be undone.", "Remove sua conta e tudo o que o Pulse guardou para ela: dados sincronizados, scores, diário, perfil e a conexão com o Google. Isso não pode ser desfeito.")}
              </DialogDescription>
            </DialogHeader>
            <AuthField label={tr("Password", "Senha")} name="password" type="password" autoComplete="current-password" required autoFocus />
            {error && (
              <p role="alert" className="px-1 text-[13px] leading-[18px] font-medium text-recovery-red-text">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="secondary" size="touch" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" variant="outline" size="touch" className="text-recovery-red-text" disabled={pending} aria-busy={pending || undefined}>
                {pending ? tr("Deleting…", "Excluindo…") : tr("Delete account", "Excluir conta")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Settings › Profile's "Edit": the onboarding fields in a sheet (U19). Scoring inputs recompute every day's scores; time format does not. */
export function EditProfileButton({ defaults }: { defaults: ProfileDefaults }) {
  const [open, setOpen] = React.useState(false)
  const saved = React.useCallback(() => {
    setOpen(false)
    toast.success(tr("Profile saved. Scores are being recomputed.", "Perfil salvo. Os scores estão sendo recalculados."))
  }, [])
  return (
    <>
      <Button
        variant="ghost"
        aria-label={tr("Edit profile", "Editar perfil")}
        onClick={() => setOpen(true)}
        className="relative -my-2 h-9 gap-1.5 rounded-full px-3 after:absolute after:-inset-y-1 text-[13px] font-semibold text-foreground-secondary hover:bg-foreground/[0.06] hover:text-foreground"
      >
        <Pencil aria-hidden strokeWidth={2} className="size-3.5" />
        {tr("Edit", "Editar")}
      </Button>
      <ResponsiveSheet open={open} onOpenChange={setOpen} title={tr("Profile", "Perfil")} description={tr("Time format only changes how times are shown. Other changes recompute your scores.", "O formato de hora só muda como os horários são exibidos. As outras mudanças recalculam seus scores.")}>
        <div className="px-4 pb-[max(env(safe-area-inset-bottom),16px)] md:px-6 md:pb-6">
          <ProfileForm defaults={defaults} onSaved={saved} footer={(pending) => <SaveButton pending={pending} label={tr("Save profile", "Salvar perfil")} />} />
        </div>
      </ResponsiveSheet>
    </>
  )
}

/** Upload failures as a message, never a throw: a thrown action error would replace Settings with the error screen. */
const uploadFailed = () => tr("Couldn’t upload the photo. Check your connection and try again.", "Não foi possível enviar a foto. Verifique sua conexão e tente de novo.")

/**
 * Settings › Account: change the photo (pick, crop in a sheet, then upload a 512 px WebP) and, for an uploaded one,
 * remove it. The photo is shrunk in the browser so a phone photo never meets the Server Action body limit.
 */
export function AvatarButtons() {
  const router = useRouter()
  const input = React.useRef<HTMLInputElement>(null)
  const [pending, start] = React.useTransition()
  const [photo, setPhoto] = React.useState<ImageBitmap | null>(null)
  const [cropping, setCropping] = React.useState(false)
  const [opening, setOpening] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  React.useEffect(() => () => photo?.close(), [photo])
  const done = (r: { ok: boolean; error?: string }, ok: string) => {
    if (!r.ok) {
      toast.error(r.error ?? tr("Couldn’t update the photo", "Não foi possível atualizar a foto"), { id: "avatar" })
      return
    }
    router.refresh()
    toast.success(ok, { id: "avatar" })
  }
  const pick = async (file: File | undefined) => {
    if (input.current) input.current.value = "" // so picking the same file again still fires change
    if (!file) return
    setOpening(true)
    const bitmap = await decodePhoto(file)
    setOpening(false)
    if (!bitmap) {
      toast.error(tr("Couldn’t open this photo. Choose a JPEG, PNG or WebP.", "Não foi possível abrir esta foto. Escolha um JPEG, PNG ou WebP."), { id: "avatar" })
      return
    }
    setError(null)
    setPhoto(bitmap)
    setCropping(true)
  }
  const use = (crop: Crop) => {
    if (!photo) return
    setError(null)
    start(async () => {
      const r = await encodeAvatar(photo, crop)
        .then((blob) => {
          const form = new FormData()
          form.set("photo", new File([blob], blob.type === "image/webp" ? "avatar.webp" : "avatar.jpg", { type: blob.type }))
          return uploadAvatar(form)
        })
        .catch(() => ({ ok: false as const, error: uploadFailed() }))
      if (!r.ok) return setError(r.error)
      setCropping(false)
      done(r, tr("Photo updated", "Foto atualizada"))
    })
  }
  return (
    <div className="flex">
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <Button variant="secondary" size="touch" className="flex-1" disabled={pending || opening} onClick={() => input.current?.click()}>
        <Camera aria-hidden strokeWidth={2} />
        {opening ? tr("Opening…", "Abrindo…") : pending && !cropping ? tr("Saving…", "Salvando…") : tr("Photo", "Foto")}
      </Button>
      <AvatarCropSheet photo={photo} open={cropping} pending={pending} error={error} onCancel={() => setCropping(false)} onUse={use} />
    </div>
  )
}

const THEMES = [
  { value: "system", get label() { return tr("System", "Sistema") }, Icon: Monitor },
  { value: "light", get label() { return tr("Light", "Claro") }, Icon: Sun },
  { value: "dark", get label() { return tr("Dark", "Escuro") }, Icon: Moon },
] as const

/**
 * Appearance: system, light or dark, as a radio group styled like the profile's segmented control. Kept per device
 * (stored locally), so a phone can follow the system while a laptop stays dark.
 */
export function LanguagePicker() {
  const t = useTranslations("settings.language")
  const current = useLocale()
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [chosen, setChosen] = React.useState(current)
  const choose = (next: Locale) => {
    setChosen(next)
    startTransition(async () => {
      const r = await setLocaleAction(next)
      if (!r.ok) {
        setChosen(current)
        toast.error(t("error"))
        return
      }
      router.refresh()
    })
  }
  return (
    <fieldset disabled={pending}>
      <legend className="sr-only">{t("legend")}</legend>
      <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-field p-1">
        {LOCALES.map((value) => (
          <label key={value} className="relative">
            <input type="radio" name="locale" value={value} checked={chosen === value} onChange={() => choose(value)} className="peer sr-only" />
            <span className="flex h-11 cursor-pointer items-center justify-center rounded-[10px] px-2 text-center text-[15px] font-semibold text-foreground-secondary transition-[background-color,color,scale] duration-150 ease-standard select-none active:scale-[0.96] peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:ring-2 peer-focus-visible:ring-foreground/70">
              {LOCALE_NAMES[value]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function ThemePicker() {
  const { theme, setTheme } = useTheme()
  return (
    <fieldset>
      <legend className="sr-only">{tr("Theme", "Tema")}</legend>
      <div className="grid grid-cols-3 gap-1 rounded-[14px] bg-field p-1">
        {THEMES.map(({ value, label, Icon }) => (
          <label key={value} className="relative">
            <input
              type="radio"
              name="theme"
              value={value}
              checked={theme === value}
              onChange={() => setTheme(value)}
              className="peer sr-only"
            />
            <span className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] text-[15px] font-semibold text-foreground-secondary transition-[background-color,color,scale] duration-150 ease-standard select-none active:scale-[0.96] peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:ring-2 peer-focus-visible:ring-foreground/70">
              <Icon aria-hidden className="size-4" strokeWidth={2} />
              {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
