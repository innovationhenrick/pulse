import { ArrowUpRight } from "lucide-react"
import { SectionShell } from "@/components/shells/SectionShell"
import { Button } from "@/components/ui/button"
import { tr } from "@/lib/locale-context"

export const REPO_URL = "https://github.com/adityaongit/pulse"
const BODY = "max-w-[65ch] text-[15px] leading-[22px] text-pretty text-foreground-secondary"
const ROW = "flex min-h-13 items-center justify-between gap-3 py-2"

/**
 * About (moved from Settings, U21): the user's own wording, version, scoring version, the repo and its issues.
 * Licence and full credits stay in LICENSE, NOTICE and the README.
 */
export function About({ version, scoringVersion }: { version: string; scoringVersion: number }) {
  return (
    <SectionShell variant="card" level={2} title={tr("About", "Sobre")}>
      <p className={BODY}>{tr("Scoring is ported from", "O cálculo dos scores é portado do")} <span translate="no">noop</span>. <span translate="no">Pulse</span> {tr("is for personal use and is not a medical device.", "é para uso pessoal e não é um dispositivo médico.")}</p>
      <dl className="mt-3 divide-y divide-border border-t border-border">
        {[
          [tr("Version", "Versão"), version],
          [tr("Scoring version", "Versão do cálculo"), String(scoringVersion)],
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
            {tr("Source code", "Código-fonte")}
            <ArrowUpRight aria-hidden className="size-4" />
            <span className="sr-only">{tr("(opens in a new tab)", "(abre em uma nova aba)")}</span>
          </a>
        </Button>
        <Button asChild variant="outline" size="touch" className="w-full">
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">
            {tr("Report a bug", "Relatar um problema")}
            <ArrowUpRight aria-hidden className="size-4" />
            <span className="sr-only">{tr("(opens in a new tab)", "(abre em uma nova aba)")}</span>
          </a>
        </Button>
      </div>
    </SectionShell>
  )
}
