import { DetailShell } from "@/components/shells/DetailShell"
import { LinkList } from "@/components/shells/LinkList"
import { SCORE_DOCS } from "./content"
import { tr } from "@/lib/locale-context"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  return { title: (await getTranslations("meta.howItWorks"))("title") }
}

/** How Pulse works `/more/how-it-works` (U21): one row per score, each opening its explainer. */
export default function HowItWorksPage() {
  return (
    <DetailShell
      title={tr("How Pulse works", "Como o Pulse funciona")}
      primary={
        <div className="flex flex-col gap-6">
          <p className="max-w-[65ch] text-[15px] leading-[22px] text-pretty text-foreground-secondary">
            {tr("What goes into each score, how it is weighted, what its bands mean and what it cannot know. Every number comes from Pulse’s own code.", "O que entra em cada score, como ele é ponderado, o que significam suas faixas e o que ele não consegue saber. Todo número vem do código do próprio Pulse.")}
          </p>
          <LinkList title={tr("Scores", "Scores")} columns={2} rows={SCORE_DOCS.map((d) => ({ label: d.name, description: d.summary, href: `/more/how-it-works/${d.slug}` }))} />
        </div>
      }
    />
  )
}
