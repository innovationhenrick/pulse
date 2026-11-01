"use server";
// The coach's Server Actions: consent, the user's provider and key (tested before it is saved), and deleting chats.
// Each checks the session and coach access itself.
import { generateText } from "ai";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requestLocale } from "../locale";
import { z } from "zod";
import { currentUser, SIGNED_OUT } from "../auth";
import { decryptKey, encryptKey } from "../coach/crypto";
import { MAX_NOTES } from "../coach/instructions";
import { LoginError, serializeBundle } from "../coach/login/bundle";
import { pollChatgptLogin, startChatgptLogin, type DevicePending, type DeviceStart } from "../coach/login/chatgpt";
import { providerOf } from "../coach/providers";
import { coachAccess, deleteAllChats, deleteChat, groupChats, listChats, modelFor, removeProvider, saveProvider, setConsent, setPreferences, type ChatCursor, type ChatGroup } from "../coach/store";
import { ctxOf } from "../queries/common";
import { getConfig } from "../config";
import { getDb } from "../db";
import type { ActionResult } from "./journal";
import { tr } from "@/lib/locale-context";

const noAccess = () => ({ ok: false as const, error: tr("Coach isn’t turned on for your account.", "O Coach não está ativado na sua conta.") });
const DONE = { ok: true as const, data: undefined };

async function member(): Promise<number | ActionResult<never>> {
  await requestLocale(); // fills the request's language so the errors below follow it
  const me = await currentUser();
  if (!me) return SIGNED_OUT;
  if (!(await coachAccess(getDb(), me.userId))) return noAccess();
  return me.userId;
}

export async function setConsentAction(on: boolean): Promise<ActionResult> {
  const me = await member();
  if (typeof me !== "number") return me;
  await setConsent(getDb(), me, on === true);
  revalidatePath("/coach");
  revalidatePath("/settings");
  return DONE;
}

const Provider = () =>
  z.object({
    provider: z.string().max(32),
    model: z.string().trim().min(1, tr("Enter a model.", "Informe um modelo.")).max(120).regex(/^[\w.:/@-]+$/, tr("That model id has characters no provider uses.", "Esse id de modelo tem caracteres que nenhum provedor usa.")),
    apiKey: z.string().trim().min(8, tr("That key looks too short.", "Essa chave parece curta demais.")).max(500).nullable(),
  });

/** Saves the provider and key after one tiny test request works, so a bad key is never stored. */
export async function saveProviderAction(input: z.input<ReturnType<typeof Provider>>): Promise<ActionResult> {
  const me = await member();
  if (typeof me !== "number") return me;
  const r = Provider().safeParse(input);
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  const { provider, model } = r.data;
  const cfg = getConfig();
  const keyless = (provider === "local" && !!cfg.coachLocal) || (provider === "mock" && cfg.coachMock);
  // A sign-in provider is connected through its own flow (Google callback, ChatGPT device code), never with a pasted key.
  if (!keyless && providerOf(provider)?.auth !== "key") return { ok: false, error: tr("Pick a provider.", "Escolha um provedor.") };
  const apiKey = keyless ? null : r.data.apiKey;
  if (!keyless && !apiKey) return { ok: false, error: tr("Paste your API key.", "Cole sua chave de API.") };
  if (apiKey && !cfg.authSecret) return { ok: false, error: tr("This server has no BETTER_AUTH_SECRET, so it can’t store keys safely. Ask whoever runs it.", "Este servidor não tem BETTER_AUTH_SECRET, então não consegue guardar chaves com segurança. Fale com quem o administra.") };
  const usedModel = provider === "local" ? cfg.coachLocal!.model : model;
  const m = modelFor(provider, usedModel, apiKey);
  if (!m) return { ok: false, error: tr("Pick a provider.", "Escolha um provedor.") };
  try {
    await generateText({ model: m, prompt: "Reply with OK.", maxOutputTokens: 5, maxRetries: 0, abortSignal: AbortSignal.timeout(20_000) });
  } catch (e) {
    console.warn(`[coach] key test failed for ${provider}: ${e instanceof Error ? e.name : "error"}`);
    return { ok: false, error: tr("That didn’t work: check the key and the model id, and that your account has credit.", "Não funcionou: confira a chave, o id do modelo e se a sua conta tem crédito.") };
  }
  await saveProvider(getDb(), me, provider, usedModel, apiKey);
  revalidatePath("/coach");
  revalidatePath("/settings");
  return DONE;
}

export async function removeProviderAction(): Promise<ActionResult> {
  const me = await currentUser();
  if (!me) return SIGNED_OUT;
  await removeProvider(getDb(), me.userId);
  revalidatePath("/settings");
  return DONE;
}

const Preferences = () =>
  z.object({
    instructions: z.string().max(MAX_NOTES, tr(`Keep it under ${MAX_NOTES} characters.`, `Use no máximo ${MAX_NOTES} caracteres.`)).nullable().optional(),
    briefMinute: z.number().int().min(0).max(1439).nullable().optional(),
  });

/** The user's own notes for the coach and the morning-brief time; only the fields sent change. */
export async function setPreferencesAction(input: z.input<ReturnType<typeof Preferences>>): Promise<ActionResult> {
  const me = await member();
  if (typeof me !== "number") return me;
  const r = Preferences().safeParse(input);
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  const { instructions, briefMinute } = r.data;
  await setPreferences(getDb(), me, {
    ...(instructions !== undefined && { instructions: instructions?.trim() || null }),
    ...(briefMinute !== undefined && { briefMinute }),
  });
  revalidatePath("/settings");
  return DONE;
}

const Cursor = z.object({ updatedAt: z.number().int().nonnegative(), id: z.string().max(64) });

/** The next page of chats after `cursor`, grouped by recency in the user's time zone. */
export async function moreChatsAction(cursor: z.input<typeof Cursor>): Promise<ActionResult<{ groups: ChatGroup[]; next: ChatCursor | null }>> {
  await requestLocale();
  const me = await currentUser();
  if (!me) return SIGNED_OUT;
  const c = Cursor.safeParse(cursor);
  if (!c.success) return { ok: false, error: tr("Couldn’t load older chats.", "Não foi possível carregar conversas antigas.") };
  const db = getDb();
  const ctx = await ctxOf(db, me.userId).catch(() => null);
  if (!ctx) return { ok: false, error: tr("Couldn’t load older chats.", "Não foi possível carregar conversas antigas.") };
  const { chats, next } = await listChats(db, me.userId, c.data);
  return { ok: true, data: { groups: groupChats(chats, ctx.now, ctx.timeZone), next } };
}

export async function deleteChatAction(id: string): Promise<ActionResult> {
  const me = await currentUser();
  if (!me) return SIGNED_OUT;
  await deleteChat(getDb(), me.userId, String(id));
  revalidatePath("/coach");
  return DONE;
}

export async function deleteAllChatsAction(): Promise<ActionResult> {
  const me = await currentUser();
  if (!me) return SIGNED_OUT;
  await deleteAllChats(getDb(), me.userId);
  revalidatePath("/coach");
  return DONE;
}

// ── Sign in with ChatGPT (device code) ───────────────────────────────────────

const DEVICE_COOKIE = "pulse_coach_chatgpt";

/** The pending sign-in, sealed under the server secret in a cookie so it survives between polls without server state. */
async function savePending(userId: number, p: DevicePending): Promise<boolean> {
  const secret = getConfig().authSecret;
  if (!secret) return false;
  const value = encryptKey(JSON.stringify({ userId, ...p }), secret).toString("base64url");
  (await cookies()).set(DEVICE_COOKIE, value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 15 * 60 });
  return true;
}

async function readPending(userId: number): Promise<DevicePending | null> {
  const secret = getConfig().authSecret;
  const raw = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!secret || !raw) return null;
  const text = decryptKey(Buffer.from(raw, "base64url"), secret);
  if (!text) return null;
  try {
    const p = JSON.parse(text) as DevicePending & { userId: number };
    return p.userId === userId ? p : null;
  } catch {
    return null;
  }
}

const loginFailed = () => ({ ok: false as const, error: tr("The ChatGPT sign-in didn’t work. Try again.", "O login com o ChatGPT não funcionou. Tente de novo.") });

/** Asks OpenAI for a code; the browser shows it and the link where it is typed, then polls. */
export async function startChatgptLoginAction(model: string): Promise<ActionResult<DeviceStart>> {
  const me = await member();
  if (typeof me !== "number") return me;
  const id = z.string().trim().min(1).max(120).regex(/^[\w.:/@-]+$/).safeParse(model);
  if (!id.success) return { ok: false, error: tr("Enter a model.", "Informe um modelo.") };
  if (!getConfig().authSecret) return { ok: false, error: tr("This server has no BETTER_AUTH_SECRET, so it can’t store keys safely. Ask whoever runs it.", "Este servidor não tem BETTER_AUTH_SECRET, então não consegue guardar chaves com segurança. Fale com quem o administra.") };
  try {
    const pending = await startChatgptLogin(id.data);
    if (!(await savePending(me, pending))) return loginFailed();
    return { ok: true, data: { userCode: pending.userCode, verificationUri: pending.verificationUri, interval: pending.interval, expiresAt: pending.expiresAt } };
  } catch (e) {
    console.warn(`[coach] chatgpt sign-in start failed: ${e instanceof LoginError ? e.message : (e as Error)?.name}`);
    return loginFailed();
  }
}

export type ChatgptPoll = { done: boolean; interval: number };

/** One check whether the user has typed the code. `done` once the account is connected and the coach answers. */
export async function pollChatgptLoginAction(): Promise<ActionResult<ChatgptPoll>> {
  const me = await member();
  if (typeof me !== "number") return me;
  const pending = await readPending(me);
  if (!pending) return { ok: false, error: tr("The sign-in expired. Start again.", "O login expirou. Comece de novo.") };
  try {
    const r = await pollChatgptLogin(pending);
    if (r.status === "pending") {
      if (r.interval !== pending.interval) await savePending(me, { ...pending, interval: r.interval });
      return { ok: true, data: { done: false, interval: r.interval } };
    }
    const m = modelFor("chatgpt-login", pending.model, serializeBundle(r.bundle));
    if (!m) return loginFailed();
    await generateText({ model: m, prompt: "Reply with OK.", maxOutputTokens: 5, maxRetries: 0, abortSignal: AbortSignal.timeout(30_000) });
    await saveProvider(getDb(), me, "chatgpt-login", pending.model, serializeBundle(r.bundle), r.bundle.hint ?? null);
    (await cookies()).delete(DEVICE_COOKIE);
    revalidatePath("/coach");
    revalidatePath("/settings");
    return { ok: true, data: { done: true, interval: pending.interval } };
  } catch (e) {
    console.warn(`[coach] chatgpt sign-in failed: ${e instanceof LoginError ? e.message : (e as Error)?.name}`);
    (await cookies()).delete(DEVICE_COOKIE);
    return e instanceof LoginError && e.code === "expired_token" ? { ok: false, error: tr("The sign-in expired. Start again.", "O login expirou. Comece de novo.") } : { ok: false, error: tr("The ChatGPT sign-in worked but the plan didn’t answer. Check that your ChatGPT plan includes Codex access, and the model id.", "O login com o ChatGPT funcionou, mas o plano não respondeu. Confira se o seu plano do ChatGPT inclui acesso ao Codex e o id do modelo.") };
  }
}
