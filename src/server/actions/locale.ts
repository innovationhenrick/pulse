"use server";
// Settings › App › Language. Saved on the account (it follows the person across devices) and in a cookie for
// the signed-out pages on this device.
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { currentUser, SIGNED_OUT } from "../auth";
import { getDb } from "../db";
import { profile } from "../db/schema";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setLocaleAction(locale: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await currentUser();
  if (!user) return SIGNED_OUT;
  if (!isLocale(locale)) return { ok: false, error: "Unsupported language." };
  await getDb().update(profile).set({ locale }).where(eq(profile.userId, user.userId));
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: ONE_YEAR, sameSite: "lax", secure: true });
  revalidatePath("/", "layout");
  return { ok: true };
}
