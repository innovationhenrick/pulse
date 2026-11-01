// Where the coach's model comes from: the user's own key with one of these providers (BYOK), or the owner's local
// model (COACH_LOCAL_URL). Users never enter a URL: the server makes the request, so a user-chosen URL would let
// any invitee make it call internal addresses. OpenRouter goes through the OpenAI-compatible client with its fixed URL.
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGateway, type LanguageModel } from "ai";
import { parseBundle } from "./login/bundle";
import { chatgptLoginModel } from "./login/chatgpt";
import { googleLoginModel } from "./login/google";

export type ProviderId = "google-login" | "chatgpt-login" | "openai" | "anthropic" | "google" | "gateway" | "openrouter";

/** How the user proves who they are to the provider: an API key, or by signing in to their Google / ChatGPT account. */
export type ProviderAuth = "key" | "google" | "chatgpt";

export type Provider = {
  id: ProviderId;
  auth: ProviderAuth;
  label: string;
  /** Pre-filled model id; the user may type another one their provider offers. */
  model: string;
  /** Where to get a key (shown in Settings). Empty for a sign-in. */
  keyUrl: string;
  /** `secret` is the API key, or for a sign-in the sealed token bundle (login/bundle.ts) already refreshed. */
  create: (secret: string, model: string) => LanguageModel;
};

/** The first entry is the default in the setup screen: Gemini on the user's Google account. */
export const PROVIDERS: Provider[] = [
  {
    id: "google-login",
    auth: "google",
    label: "Gemini (Google sign-in)",
    model: "gemini-3.8-flash",
    keyUrl: "",
    create: (secret, model) => googleLoginModel(parseBundle(secret)!, model),
  },
  {
    id: "chatgpt-login",
    auth: "chatgpt",
    label: "ChatGPT (sign-in)",
    model: "gpt-5.5",
    keyUrl: "",
    create: (secret, model) => chatgptLoginModel(parseBundle(secret)!, model),
  },
  {
    id: "anthropic",
    auth: "key",
    label: "Anthropic",
    model: "claude-sonnet-5-5",
    keyUrl: "https://console.anthropic.com/settings/keys",
    create: (apiKey, model) => createAnthropic({ apiKey })(model),
  },
  {
    id: "openai",
    auth: "key",
    label: "OpenAI",
    model: "gpt-5.4-mini",
    keyUrl: "https://platform.openai.com/api-keys",
    create: (apiKey, model) => createOpenAI({ apiKey })(model),
  },
  {
    id: "google",
    auth: "key",
    label: "Google Gemini",
    model: "gemini-3.8-flash",
    keyUrl: "https://aistudio.google.com/apikey",
    create: (apiKey, model) => createGoogleGenerativeAI({ apiKey })(model),
  },
  {
    id: "gateway",
    auth: "key",
    label: "Vercel AI Gateway",
    model: "anthropic/claude-sonnet-5.5",
    keyUrl: "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai",
    create: (apiKey, model) => createGateway({ apiKey })(model),
  },
  {
    id: "openrouter",
    auth: "key",
    label: "OpenRouter",
    model: "anthropic/claude-sonnet-5.5",
    keyUrl: "https://openrouter.ai/settings/keys",
    create: (apiKey, model) => createOpenAICompatible({ name: "openrouter", baseURL: "https://openrouter.ai/api/v1", apiKey })(model),
  },
];

export const providerOf = (id: string) => PROVIDERS.find((p) => p.id === id) ?? null;

/** The owner's local model from COACH_LOCAL_URL / COACH_LOCAL_MODEL (Ollama, LM Studio, vLLM). */
export const localModel = (url: string, model: string) => createOpenAICompatible({ name: "local", baseURL: url })(model);
