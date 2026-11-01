import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { DetailShell } from "@/components/shells/DetailShell"
import { SectionShell } from "@/components/shells/SectionShell"
import { Button } from "@/components/ui/button"
import { SCORE_DOCS, type HowSection } from "../content"
import { tr } from "@/lib/locale-context"
import { getTranslations } from "next-intl/server"

const BODY = "max-w-[65ch] text-[15px] leading-[22px] text-pretty text-foreground-secondary"
/** A detail this short sits beside its term ("HRV  55%"); a sentence goes under it. */
const SHORT = 24

export function generateStaticParams() {
  return SCORE_DOCS.map((d) => ({ score: d.slug }))
}

export async function generateMetadata({ params }: PageProps<"/more/how-it-works/[score]">) {
  const { score } = await params
  const doc = SCORE_DOCS.find((d) => d.slug === score)
  await getTranslations("meta")
  return { title: doc ? tr(`How ${doc.name} works`, `Como funciona: ${doc.name}`) : tr("How Pulse works", "Como o Pulse funciona") }
}

function Section({ s }: { s: HowSection }) {
  return (
    <SectionShell variant="card" level={2} title={s.title}>
      <div className="space-y-3">
        {s.paragraphs?.map((p) => (
          <p key={p} className={BODY}>
            {p}
          </p>
        ))}
        {s.rows && (
          <dl className="divide-y divide-border border-t border-border first:border-t-0">
            {s.rows.map((r) => (
              <div key={r.term} className={cn("py-2.5", r.detail.length <= SHORT ? "flex items-baseline justify-between gap-3" : "space-y-0.5")}>
                <dt className="text-[15px] leading-[22px] font-semibold text-balance">{r.term}</dt>
                <dd className={cn("text-[15px] leading-[22px] text-pretty text-foreground-secondary", r.detail.length <= SHORT && "shrink-0 text-right tabular-nums")}>{r.detail}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </SectionShell>
  )
}

const STEP =
  "flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-xl px-3 transition-[background-color,scale] duration-150 ease-standard outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96]"

/** One score's explainer `/more/how-it-works/[score]` (U21), written from src/core and docs/algorithms. */
export default async function ScoreExplainer({ params }: PageProps<"/more/how-it-works/[score]">) {
  const { score } = await params
  const i = SCORE_DOCS.findIndex((d) => d.slug === score)
  if (i < 0) notFound()
  const doc = SCORE_DOCS[i]
  const prev = SCORE_DOCS[i - 1]
  const next = SCORE_DOCS[i + 1]

  return (
    <DetailShell
      title={doc.name}
      subtitle={tr("How it works", "Como funciona")}
      primary={
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="max-w-[60ch] text-[17px] leading-6 text-pretty">{doc.summary}</p>
          {doc.href && (
            <Button asChild variant="secondary" size="touch" className="shrink-0">
              <Link href={doc.href}>{tr(`Open ${doc.name}`, `Abrir ${doc.name}`)}</Link>
            </Button>
          )}
        </div>
      }
      secondary={doc.sections.map((s) => (
        <Section key={s.title} s={s} />
      ))}
      footer={
        <div className="flex flex-col gap-4">
          <p className="text-xs leading-4 font-medium text-pretty text-muted-foreground">
            {tr("Not a medical device. Pulse’s scores are estimates from a wrist sensor, for personal use, not a diagnosis.", "Não é um dispositivo médico. Os scores do Pulse são estimativas de um sensor de pulso, para uso pessoal, e não um diagnóstico.")}
          </p>
          <nav aria-label={tr("Other scores", "Outros scores")} className="flex gap-2">
            {prev ? (
              <Link href={`/more/how-it-works/${prev.slug}`} replace className={STEP}>
                <ChevronLeft aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <span className="min-w-0">
                  <span className="block text-xs leading-4 font-medium text-muted-foreground">{tr("Previous", "Anterior")}</span>
                  <span className="block text-[15px] leading-[22px] font-semibold text-balance">{prev.name}</span>
                </span>
              </Link>
            ) : (
              <span className="flex-1" />
            )}
            {next && (
              <Link href={`/more/how-it-works/${next.slug}`} replace className={cn(STEP, "justify-end text-right")}>
                <span className="min-w-0">
                  <span className="block text-xs leading-4 font-medium text-muted-foreground">{tr("Next", "Próximo")}</span>
                  <span className="block text-[15px] leading-[22px] font-semibold text-balance">{next.name}</span>
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              </Link>
            )}
          </nav>
        </div>
      }
    />
  )
}
