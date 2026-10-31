import type { Metadata } from "next"
import Link from "next/link"
import { connection } from "next/server"
import { Mail } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { getConfig } from "@/server/config"
import { AUTH_FOOTNOTE, AUTH_LINK, AuthHero } from "@/components/auth/AuthHero"
import { AuthShell } from "@/components/shells/AuthShell"
import { Button } from "@/components/ui/button"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth.forgot"))("metaTitle") }
}

const GUIDE = "https://github.com/adityaongit/pulse/blob/main/docs/admin.md#reset-a-password"

/** A prefilled request, so the admin gets the one thing they need: which account. */
const mailto = (to: string, subject: string, body: string) =>
  `mailto:${to}?${new URLSearchParams({ subject, body })
    .toString()
    .replaceAll("+", "%20")}`

/**
 * Forgot password `/forgot`. Pulse sends no email, so whoever runs the server sets a temporary password (the command is
 * in docs/setup.md, not on this page). SUPPORT_EMAIL, when set, becomes a prefilled email to them.
 */
export default async function ForgotPage() {
  // Per request: SUPPORT_EMAIL is runtime config, and a prerendered page would freeze the build's (unset) value.
  await connection()
  const support = getConfig().supportEmail
  const t = await getTranslations("auth.forgot")
  const steps = [support ? t("step1Email") : t("step1Ask"), t("step2"), t("step3")]
  return (
    <AuthShell>
      <AuthHero compact title={t("title")} body={t("body")} />
      <div className="mt-8 space-y-5">
        <ol className="space-y-4 rounded-2xl bg-secondary p-4" aria-label={t("stepsLabel")}>
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-background/60 font-numeric text-[13px] leading-none font-bold text-foreground tabular-nums">
                {i + 1}
              </span>
              <span className="min-w-0 pt-0.5 text-[15px] leading-[22px] text-pretty text-foreground-secondary">{step}</span>
            </li>
          ))}
        </ol>
        {support && (
          <div className="space-y-2">
            <Button asChild size="sheet">
              <a href={mailto(support, t("mailSubject"), t("mailBody"))}>
                <Mail aria-hidden strokeWidth={2} />
                {t("emailAdmin")}
              </a>
            </Button>
            <p className="text-center text-[13px] leading-[18px] break-all text-muted-foreground" translate="no">
              {support}
            </p>
          </div>
        )}
        <p className={AUTH_FOOTNOTE}>
          <Link href="/login" className={AUTH_LINK}>
            {t("backToSignIn")}
          </Link>
        </p>
        <p className={AUTH_FOOTNOTE}>
          {t("selfHosted")}{" "}
          <a href={GUIDE} target="_blank" rel="noreferrer" className={AUTH_LINK}>
            {t("resetFromServer")}
            <span className="sr-only"> {t("newTab")}</span>
          </a>
        </p>
      </div>
    </AuthShell>
  )
}
