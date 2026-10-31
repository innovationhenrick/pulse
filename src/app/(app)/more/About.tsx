import { ArrowUpRight } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { SectionShell } from "@/components/shells/SectionShell"
import { Button } from "@/components/ui/button"

export const REPO_URL = "https://github.com/innovationhenrick/pulse"
const BODY = "max-w-[65ch] text-[15px] leading-[22px] text-pretty text-foreground-secondary"
const ROW = "flex min-h-13 items-center justify-between gap-3 py-2"

/**
 * About (moved from Settings, U21): the user's own wording, version, scoring version, the repo and its issues.
 * Licence and full credits stay in LICENSE, NOTICE and the README.
 */
export async function About({ version, scoringVersion }: { version: string; scoringVersion: number }) {
  const t = await getTranslations("about")
  return (
    <SectionShell variant="card" level={2} title={t("title")}>
      <p className={BODY}>{t("body")}</p>
      <dl className="mt-3 divide-y divide-border border-t border-border">
        {[
          [t("version"), version],
          [t("scoringVersion"), String(scoringVersion)],
        ].map(([k, v]) => (
          <div key={k} className={ROW}>
            <dt className="text-[15px] leading-[22px]">{k}</dt>
            <dd className="font-numeric text-[15px] leading-[22px] font-semibold text-foreground-secondary tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button asChild variant="secondary" size="touch" className="w-full">
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            {t("sourceCode")}
            <ArrowUpRight aria-hidden className="size-4" />
            <span className="sr-only">{t("newTab")}</span>
          </a>
        </Button>
        <Button asChild variant="outline" size="touch" className="w-full">
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">
            {t("reportBug")}
            <ArrowUpRight aria-hidden className="size-4" />
            <span className="sr-only">{t("newTab")}</span>
          </a>
        </Button>
      </div>
    </SectionShell>
  )
}
