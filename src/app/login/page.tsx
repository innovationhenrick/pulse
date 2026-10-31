import type { Metadata } from "next"
import Link from "next/link"
import { connection } from "next/server"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { signupMode, userCount } from "@/server/admin"
import { currentUser } from "@/server/auth"
import { getConfig } from "@/server/config"
import { getDb } from "@/server/db"
import { DemoSignIn } from "@/components/auth/AuthButtons"
import { LoginForm } from "@/components/auth/AuthForm"
import { AUTH_FOOTNOTE, AUTH_LINK, AuthHero } from "@/components/auth/AuthHero"
import { AuthShell } from "@/components/shells/AuthShell"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth.login"))("metaTitle") }
}

/**
 * Sign in `/login`. A real instance signs in with an email or username and a password (Google only feeds the data,
 * connected from inside), and links to sign-up while it is open (or points invitees to their link). A demo instance
 * offers the demo only.
 */
export default async function LoginPage() {
  await connection()
  if (await currentUser()) redirect("/")
  const t = await getTranslations("auth.login")
  const { dataSource } = getConfig()

  if (dataSource !== "google") {
    return (
      <AuthShell
        actions={
          <>
            <DemoSignIn />
            <p className={AUTH_FOOTNOTE}>
              {t.rich("demoNote", { path: (c) => <span translate="no">{c}</span> })}
            </p>
          </>
        }
      >
        <AuthHero title={t("demoTitle")} body={t("demoBody")} />
      </AuthShell>
    )
  }

  const db = getDb()
  // A new server (no accounts) links to sign-up for its owner whatever the mode.
  const [mode, first] = await Promise.all([signupMode(db), userCount(db).then((n) => n === 0)])
  return (
    <AuthShell>
      <AuthHero compact title={t("title")} body={t("body")} />
      <div className="mt-8 space-y-5">
        <LoginForm />
        <p className={AUTH_FOOTNOTE}>
          {mode === "closed" && !first ? (
            t("closed")
          ) : mode === "invite" && !first ? (
            t("invite")
          ) : (
            <>
              {t("newHere")}{" "}
              <Link href="/signup" className={AUTH_LINK}>
                {t("createAccount")}
              </Link>
            </>
          )}
        </p>
      </div>
    </AuthShell>
  )
}
