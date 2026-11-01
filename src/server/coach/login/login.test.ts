import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { isFresh, LoginError, parseBundle, serializeBundle, type LoginBundle } from "./bundle";
import { codexFetch, lastCompleted, pollChatgptLogin, refreshChatgptLogin, startChatgptLogin } from "./chatgpt";
import { exchangeGoogleLogin, googleLoginModel, googleLoginUrl, projectOf, refreshGoogleLogin } from "./google";
import { consumeLoginState, createLoginState } from "./state";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const bundle: LoginBundle = { v: 1, accessToken: "at", refreshToken: "rt", expiresAt: 10_000_000, project: "123" };
const idToken = (claims: Record<string, unknown>) => new SignJWT(claims).setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode("k".repeat(32)));

describe("bundle", () => {
  it("round-trips and rejects anything else", () => {
    expect(parseBundle(serializeBundle(bundle))).toEqual(bundle);
    expect(parseBundle("not json")).toBeNull();
    expect(parseBundle(JSON.stringify({ v: 2 }))).toBeNull();
  });
  it("is fresh until five minutes before expiry", () => {
    expect(isFresh(bundle, 10_000_000 - 6 * 60_000)).toBe(true);
    expect(isFresh(bundle, 10_000_000 - 4 * 60_000)).toBe(false);
  });
});

describe("google sign-in", () => {
  it("asks for offline access with PKCE and the Gemini scopes", () => {
    const u = new URL(googleLoginUrl({ clientId: "c", redirectUri: "https://p/cb", state: "s", challenge: "ch" }));
    expect(u.searchParams.get("access_type")).toBe("offline");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("scope")).toContain("generative-language");
  });
  it("derives the billing project from the client id", () => {
    expect(projectOf("123456789-abc.apps.googleusercontent.com")).toBe("123456789");
  });
  it("exchanges a code for a bundle with the account email", async () => {
    const id_token = await idToken({ email: "me@example.com" });
    const sent: string[] = [];
    const f = (async (_: unknown, init?: RequestInit) => (sent.push(String(init?.body)), json({ access_token: "a", refresh_token: "r", expires_in: 3600, id_token }))) as typeof fetch;
    const b = await exchangeGoogleLogin({ clientId: "123-x.apps.googleusercontent.com", clientSecret: "s", redirectUri: "https://p/cb", code: "c", verifier: "v" }, { fetch: f, now: () => 1000 });
    expect(b).toMatchObject({ accessToken: "a", refreshToken: "r", expiresAt: 1000 + 3_600_000, project: "123", hint: "me@example.com" });
    expect(sent[0]).toContain("code_verifier=v");
  });
  it("refuses a response without a refresh token", async () => {
    const f = (async () => json({ access_token: "a", expires_in: 3600 })) as typeof fetch;
    await expect(exchangeGoogleLogin({ clientId: "c", clientSecret: "s", redirectUri: "r", code: "c", verifier: "v" }, { fetch: f })).rejects.toMatchObject({ code: "no_refresh_token" });
  });
  it("keeps the refresh token when Google does not rotate it, and reports invalid_grant by code only", async () => {
    const ok = (async () => json({ access_token: "new", expires_in: 3600 })) as typeof fetch;
    expect(await refreshGoogleLogin({ clientId: "c", clientSecret: "s", bundle }, { fetch: ok, now: () => 5 })).toMatchObject({ accessToken: "new", refreshToken: "rt", expiresAt: 5 + 3_600_000 });
    const bad = (async () => json({ error: "invalid_grant", error_description: "secret detail" }, 400)) as typeof fetch;
    const err = await refreshGoogleLogin({ clientId: "c", clientSecret: "s", bundle }, { fetch: bad }).catch((e: LoginError) => e);
    expect(err).toMatchObject({ code: "invalid_grant", status: 400 });
    expect((err as Error).message).not.toContain("secret detail");
  });
  it("sends the bearer token and billing project instead of an API key", async () => {
    let seen: Headers | undefined;
    const f = (async (_: unknown, init?: RequestInit) => ((seen = new Headers(init?.headers)), json({ candidates: [] }))) as typeof fetch;
    const m = googleLoginModel(bundle, "gemini-x", f);
    await (m as unknown as { doGenerate: (o: unknown) => PromiseLike<unknown> }).doGenerate({ prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }] }).then(undefined, () => undefined);
    expect(seen?.get("authorization")).toBe("Bearer at");
    expect(seen?.get("x-goog-user-project")).toBe("123");
    expect(seen?.get("x-goog-api-key")).toBeNull();
  });
});

describe("chatgpt sign-in", () => {
  const start = (async () => json({ device_code: "dc", user_code: "ABCD-1234", verification_uri: "https://auth.openai.com/codex/device", interval: 5, expires_in: 600 })) as typeof fetch;
  it("starts a device flow with a PKCE challenge", async () => {
    const p = await startChatgptLogin("gpt-5.5", { fetch: start, now: () => 0 });
    expect(p).toMatchObject({ userCode: "ABCD-1234", deviceCode: "dc", interval: 5, expiresAt: 600_000, model: "gpt-5.5" });
    expect(p.verifier.length).toBeGreaterThan(20);
  });
  it("keeps waiting on authorization_pending and backs off on slow_down", async () => {
    const p = await startChatgptLogin("m", { fetch: start, now: () => 0 });
    const pending = (async () => json({ error: "authorization_pending" }, 400)) as typeof fetch;
    expect(await pollChatgptLogin(p, { fetch: pending, now: () => 1 })).toEqual({ status: "pending", interval: 5 });
    const slow = (async () => json({ error: "slow_down" }, 400)) as typeof fetch;
    expect(await pollChatgptLogin(p, { fetch: slow, now: () => 1 })).toEqual({ status: "pending", interval: 10 });
  });
  it("finishes with the account id and email from the id token", async () => {
    const p = await startChatgptLogin("m", { fetch: start, now: () => 0 });
    const id_token = await idToken({ email: "me@example.com", "https://api.openai.com/auth": { chatgpt_account_id: "acct-1" } });
    let n = 0;
    const f = (async () => (n++ === 0 ? json({ authorization_code: "code" }) : json({ access_token: "a", refresh_token: "r", expires_in: 100, id_token }))) as typeof fetch;
    const r = await pollChatgptLogin(p, { fetch: f, now: () => 1000 });
    expect(r).toEqual({ status: "done", bundle: { v: 1, accessToken: "a", refreshToken: "r", expiresAt: 1000 + 100_000, accountId: "acct-1", hint: "me@example.com" } });
  });
  it("gives up once the code has expired", async () => {
    const p = await startChatgptLogin("m", { fetch: start, now: () => 0 });
    await expect(pollChatgptLogin(p, { now: () => 700_000 })).rejects.toMatchObject({ code: "expired_token" });
  });
  it("refreshes and keeps the account details", async () => {
    const f = (async () => json({ access_token: "a2", expires_in: 100 })) as typeof fetch;
    const b = await refreshChatgptLogin({ ...bundle, accountId: "acct-1", hint: "me@example.com" }, { fetch: f, now: () => 0 });
    expect(b).toMatchObject({ accessToken: "a2", refreshToken: "rt", accountId: "acct-1", hint: "me@example.com" });
  });
});

describe("codex backend adapter", () => {
  const sse = ['data: {"type":"response.created"}', 'data: {"type":"response.completed","response":{"id":"r1","output":[]}}', ""].join("\n");
  it("moves system text to instructions, forbids storing and drops length knobs", async () => {
    let sent: Record<string, unknown> = {};
    const f = codexFetch((async (_: unknown, init?: RequestInit) => ((sent = JSON.parse(String(init?.body))), new Response(sse))) as typeof fetch);
    await f("https://x", { method: "POST", body: JSON.stringify({ model: "m", stream: true, max_output_tokens: 5, temperature: 1, input: [{ role: "developer", content: "Be brief." }, { role: "user", content: [{ type: "input_text", text: "hi" }] }] }) });
    expect(sent).toMatchObject({ store: false, stream: true, instructions: "Be brief." });
    expect(sent.input).toHaveLength(1);
    expect(sent).not.toHaveProperty("max_output_tokens");
    expect(sent).not.toHaveProperty("temperature");
  });
  it("folds the stream back into one response when the caller did not ask to stream", async () => {
    const f = codexFetch((async () => new Response(sse)) as typeof fetch);
    const res = await f("https://x", { method: "POST", body: JSON.stringify({ model: "m", stream: false, input: [] }) });
    expect(await res.json()).toEqual({ id: "r1", output: [] });
  });
  it("finds the finished response in a stream", () => {
    expect(lastCompleted(sse)).toEqual({ id: "r1", output: [] });
    expect(lastCompleted("data: nonsense")).toBeNull();
  });
});

describe("google sign-in state", () => {
  const s = { verifier: "v", model: "m", returnTo: "/coach" as const };
  it("is single-use and bound to the user who started it", () => {
    const state = createLoginState({ userId: 1, ...s }, 0);
    expect(consumeLoginState(state, 2, 1)).toBeNull();
    expect(consumeLoginState(state, 1, 1)).toBeNull(); // the wrong user's attempt already burned it
    const again = createLoginState({ userId: 1, ...s }, 0);
    expect(consumeLoginState(again, 1, 1)).toMatchObject({ verifier: "v" });
    expect(consumeLoginState(again, 1, 1)).toBeNull();
  });
  it("expires after ten minutes", () => {
    expect(consumeLoginState(createLoginState({ userId: 1, ...s }, 0), 1, 11 * 60_000)).toBeNull();
  });
});
