"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowUpRight, LoaderCircle } from "lucide-react"
import { pollChatgptLoginAction, saveProviderAction, setConsentAction, startChatgptLoginAction } from "@/server/actions/coach"
import type { DeviceStart } from "@/server/coach/login/chatgpt"
import { AuthField } from "@/components/auth/AuthForm"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import type { ProviderOption } from "@/server/coach/options"
import { tr } from "@/lib/locale-context"

const BODY = "text-[15px] leading-[22px] text-pretty text-foreground-secondary"

/** What the coach sends where, and Allow (spec §7.21 consent). */
export function Consent() {
  const router = useRouter()
  const [pending, start] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  return (
    <div className="space-y-4">
      <h2 className="text-[22px] leading-7 font-bold text-balance">{tr("Before you start", "Antes de começar")}</h2>
      <ul className="list-disc space-y-2 pl-5 text-[15px] leading-[22px] text-foreground-secondary marker:text-muted-foreground">
        <li>{tr("To answer, the coach sends your questions and the Pulse numbers it looks up (scores, vitals, workouts, journal behaviours) to the AI provider you choose next, with your own account or key. Your name and email are never sent.", "Para responder, o coach envia suas perguntas e os números do Pulse que ele consulta (pontuações, sinais vitais, treinos, comportamentos do diário) ao provedor de IA que você escolher a seguir, com a sua própria conta ou chave. Seu nome e e-mail nunca são enviados.")}</li>
        <li>{tr("Your provider’s terms and pricing apply. Pulse adds no cost.", "Valem os termos e preços do seu provedor. O Pulse não cobra nada a mais.")}</li>
        <li>{tr("Chats are saved on this server, visible only to you. Delete them any time.", "As conversas ficam salvas neste servidor, visíveis só para você. Apague quando quiser.")}</li>
        <li>{tr("Answers can be wrong, and they are not medical advice.", "As respostas podem estar erradas e não são aconselhamento médico.")}</li>
      </ul>
      {error && <p role="alert" className="text-[13px] font-medium text-recovery-red-text">{error}</p>}
      <Button
        size="sheet"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await setConsentAction(true).catch(() => ({ ok: false as const, error: tr("Couldn’t reach Pulse. Try again.", "Não foi possível conectar ao Pulse. Tente de novo.") }))
            if (!r.ok) return setError(r.error)
            router.refresh()
          })
        }
      >
        {tr("Allow", "Permitir")}
      </Button>
    </div>
  )
}

/** What the sign-in came back with (`?coach_login=` from the Google redirect), in words. */
export function loginMessage(code: string | null): { ok: boolean; text: string } | null {
  if (!code) return null
  if (code === "connected") return { ok: true, text: tr("Account connected.", "Conta conectada.") }
  const text: Record<string, string> = {
    access_denied: tr("Sign-in cancelled.", "Login cancelado."),
    expired: tr("The sign-in expired. Try again.", "O login expirou. Tente de novo."),
    gemini_unavailable: tr("Signed in, but Gemini didn’t answer. Enable the Generative Language API on the Google Cloud project of this server’s OAuth client.", "Login feito, mas o Gemini não respondeu. Ative a API Generative Language no projeto do Google Cloud do cliente OAuth deste servidor."),
    no_access: tr("Coach isn’t turned on for your account.", "O Coach não está ativado na sua conta."),
    no_secret: tr("This server has no BETTER_AUTH_SECRET, so it can’t store keys safely. Ask whoever runs it.", "Este servidor não tem BETTER_AUTH_SECRET, então não consegue guardar chaves com segurança. Fale com quem o administra."),
  }
  // gemini_<http status>_<Google's error code>: Gemini was reached and refused the request.
  if (/^gemini(_\w+)?$/.test(code) && code !== "gemini_unavailable") return { ok: false, text: tr(`Signed in, but Gemini refused the request (${code.slice(7) || "no status"}).`, `Login feito, mas o Gemini recusou a requisição (${code.slice(7) || "sem status"}).`) }
  return { ok: false, text: text[code] ?? tr("Couldn’t sign in. Try again.", "Não foi possível entrar. Tente de novo.") }
}

const NETWORK = () => tr("Couldn’t reach Pulse. Try again.", "Não foi possível conectar ao Pulse. Tente de novo.")

/** ChatGPT sign-in: shows the code to type at OpenAI, then checks every few seconds until it is typed. */
function ChatgptSignIn({ model, onDone }: { model: string; onDone: () => void }) {
  const [device, setDevice] = React.useState<DeviceStart | null>(null)
  const [pending, start] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (!device) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    const tick = async (wait: number) => {
      timer = setTimeout(async () => {
        const r = await pollChatgptLoginAction().catch(() => ({ ok: false as const, error: NETWORK() }))
        if (stopped) return
        if (!r.ok) return (setDevice(null), setError(r.error))
        if (r.data.done) return onDone()
        void tick(r.data.interval * 1000)
      }, wait)
    }
    void tick(device.interval * 1000)
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [device, onDone])
  return (
    <div className="space-y-3">
      {device ? (
        <div className="space-y-2 rounded-xl bg-secondary p-4">
          <p className={BODY}>
            {tr("Open", "Abra")}{" "}
            <a href={device.verificationUri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-coach-text underline-offset-4 hover:underline">
              {new URL(device.verificationUri).host}
              <ArrowUpRight aria-hidden className="size-3.5" />
            </a>{" "}
            {tr("and type this code:", "e digite este código:")}
          </p>
          <p className="font-numeric text-[28px] leading-9 font-bold tracking-[0.12em] select-all">{device.userCode}</p>
          <p className="flex items-center gap-2 text-[13px] leading-[18px] text-muted-foreground">
            <LoaderCircle aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" />
            {tr("Waiting for you to confirm…", "Aguardando você confirmar…")}
          </p>
        </div>
      ) : (
        <Button
          type="button"
          size="sheet"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() =>
            start(async () => {
              setError(null)
              const r = await startChatgptLoginAction(model).catch(() => ({ ok: false as const, error: NETWORK() }))
              if (!r.ok) return setError(r.error)
              setDevice(r.data)
            })
          }
        >
          {pending && <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />}
          {tr("Sign in with ChatGPT", "Entrar com o ChatGPT")}
        </Button>
      )}
      {error && (
        <p role="alert" className="px-1 text-[13px] leading-[18px] font-medium text-recovery-red-text">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Pick a provider and a model, then connect: Gemini with a Google sign-in (the default), ChatGPT with a device-code
 * sign-in, or an API key. A key is saved only after a test call works; the sign-ins test the same way on the server.
 */
export function ProviderForm({ providers, current, onSaved, from }: { providers: ProviderOption[]; current: { provider: string | null; model: string | null }; onSaved?: () => void; from?: "settings" }) {
  const router = useRouter()
  const returned = loginMessage(useSearchParams().get("coach_login"))
  const [id, setId] = React.useState(current.provider && providers.some((p) => p.id === current.provider) ? current.provider : providers[0].id)
  const p = providers.find((x) => x.id === id)!
  const [model, setModel] = React.useState(current.provider === id && current.model ? current.model : p.model)
  const [pending, start] = React.useTransition()
  const [error, setError] = React.useState<string | null>(returned && !returned.ok ? returned.text : null)
  const pick = (v: string) => {
    if (!v) return
    setId(v)
    setModel(providers.find((x) => x.id === v)!.model)
    setError(null)
  }
  const done = React.useCallback(() => {
    onSaved?.()
    router.refresh()
  }, [onSaved, router])
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const apiKey = p.needsKey ? String(new FormData(e.currentTarget).get("apiKey") ?? "") : null
    setError(null)
    start(async () => {
      const r = await saveProviderAction({ provider: id, model, apiKey }).catch(() => ({ ok: false as const, error: NETWORK() }))
      if (!r.ok) return setError(r.error)
      done()
    })
  }
  const signIn = p.auth === "google" || p.auth === "chatgpt"
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <p id="provider-label" className="px-1 text-xs leading-4 font-bold tracking-[0.08em] text-foreground-secondary uppercase">
          {tr("Provider", "Provedor")}
        </p>
        <ToggleGroup type="single" value={id} onValueChange={pick} spacing={0} aria-labelledby="provider-label" className="flex flex-wrap gap-1.5">
          {providers.map((x) => (
            <ToggleGroupItem
              key={x.id}
              value={x.id}
              className="h-10 rounded-full! px-4 text-[13px] font-semibold text-foreground-secondary ring-1 ring-border transition-[background-color,color] duration-150 ease-standard hover:bg-foreground/[0.06] hover:text-foreground data-[state=on]:bg-secondary data-[state=on]:text-foreground data-[state=on]:ring-coach/60"
            >
              {x.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {p.needsKey && (
        <AuthField
          key={id}
          label={tr("API key", "Chave de API")}
          name="apiKey"
          type="password"
          autoComplete="off"
          required
          maxLength={500}
          hint={
            <>
              {tr("Encrypted on this server and never shown again.", "Criptografada neste servidor e nunca mostrada de novo.")}{" "}
              {p.keyUrl && (
                <a href={p.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-coach-text underline-offset-4 hover:underline">
                  {tr(`Get a ${p.label} key`, `Obter uma chave ${p.label}`)}
                  <ArrowUpRight aria-hidden className="size-3.5" />
                </a>
              )}
            </>
          }
        />
      )}
      <AuthField label={tr("Model", "Modelo")} name="model" value={model} onChange={(e) => setModel(e.currentTarget.value)} required maxLength={120} autoCapitalize="none" spellCheck={false} hint={p.auth !== "none" ? tr("Any model your account offers.", "Qualquer modelo que a sua conta ofereça.") : tr("Set by whoever runs this server.", "Definido por quem administra este servidor.")} readOnly={p.auth === "none"} />
      {error && !signIn && (
        <p role="alert" className="px-1 text-[13px] leading-[18px] font-medium text-recovery-red-text">
          {error}
        </p>
      )}
      {p.auth === "google" && (
        <div className="space-y-3">
          {error && (
            <p role="alert" className="px-1 text-[13px] leading-[18px] font-medium text-recovery-red-text">
              {error}
            </p>
          )}
          <Button asChild size="sheet">
            <a href={`/api/coach/login/google?model=${encodeURIComponent(model)}${from ? `&from=${from}` : ""}`}>{tr("Sign in with Google", "Entrar com o Google")}</a>
          </Button>
          <p className={BODY}>{tr("Gemini answers on your own Google account. Pulse never sees your password and stores only an encrypted token.", "O Gemini responde na sua própria conta Google. O Pulse nunca vê sua senha e guarda apenas um token criptografado.")}</p>
        </div>
      )}
      {p.auth === "chatgpt" && (
        <div className="space-y-3">
          <ChatgptSignIn key={model} model={model} onDone={done} />
          <p className={BODY}>{tr("Uses your ChatGPT plan, with a code you type at OpenAI. It isn’t an official OpenAI integration for apps and can stop working.", "Usa o seu plano do ChatGPT, com um código que você digita na OpenAI. Não é uma integração oficial da OpenAI para apps e pode parar de funcionar.")}</p>
        </div>
      )}
      {!signIn && (
        <>
          <Button type="submit" size="sheet" disabled={pending} aria-busy={pending || undefined}>
            {pending && <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />}
            {pending ? tr("Testing…", "Testando…") : tr("Test and save", "Testar e salvar")}
          </Button>
          {p.needsKey && <p className={BODY}>{tr("Pulse checks the key with one tiny request before saving it.", "O Pulse confere a chave com uma requisição mínima antes de salvar.")}</p>}
        </>
      )}
    </form>
  )
}
