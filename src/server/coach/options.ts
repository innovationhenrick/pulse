// What the coach setup offers the browser: provider ids, labels and default models, never keys or URLs.
import { getConfig } from "../config";
import { tr } from "@/lib/locale-context";
import { PROVIDERS, providerOf } from "./providers";

/** `auth`: an API key to paste, a Google sign-in, a ChatGPT sign-in, or nothing (the owner's local and test models). */
export type ProviderOption = { id: string; label: string; model: string; keyUrl: string | null; needsKey: boolean; auth: "key" | "google" | "chatgpt" | "none" };

const loginLabel = (id: string, fallback: string) => (id === "google-login" ? tr("Gemini · Google sign-in", "Gemini · login com Google") : id === "chatgpt-login" ? tr("ChatGPT · sign-in", "ChatGPT · login") : fallback);

/** The owner's local model first when set, the test model only under COACH_MOCK, then the BYOK providers. */
export function providerOptions(): ProviderOption[] {
  const cfg = getConfig();
  return [
    ...(cfg.coachLocal ? [{ id: "local", label: tr("This server’s model", "Modelo deste servidor"), model: cfg.coachLocal.model, keyUrl: null, needsKey: false, auth: "none" as const }] : []),
    ...(cfg.coachMock ? [{ id: "mock", label: tr("Test model", "Modelo de teste"), model: "mock", keyUrl: null, needsKey: false, auth: "none" as const }] : []),
    // Google sign-in needs the Google OAuth client this server already uses for Google Health.
    ...PROVIDERS.filter((p) => p.auth !== "google" || cfg.google).map((p) => ({ id: p.id, label: loginLabel(p.id, p.label), model: p.model, keyUrl: p.keyUrl || null, needsKey: p.auth === "key", auth: p.auth })),
  ];
}

export const providerLabel = (id: string | null) =>
  id === "local" ? tr("this server’s model", "o modelo deste servidor") : id === "mock" ? tr("the test model", "o modelo de teste") : (providerOf(id ?? "") ? loginLabel(id ?? "", providerOf(id ?? "")!.label) : tr("your provider", "seu provedor"));
