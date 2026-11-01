import { connection } from "next/server"
import { DAY, formatDay, locale } from "@/lib/format"
import { Download } from "lucide-react"
import { listChats } from "@/server/coach/store"
import { userCtx } from "@/server/queries/common"
import { getYourData } from "@/server/queries/settings"
import { CAPTION } from "@/components/metrics/primitives"
import { DetailShell } from "@/components/shells/DetailShell"
import { SectionShell } from "@/components/shells/SectionShell"
import { Button } from "@/components/ui/button"
import { tr } from "@/lib/locale-context"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  return { title: (await getTranslations("meta.yourData"))("title") }
}

const BODY = "max-w-[65ch] text-[15px] leading-[22px] text-pretty text-foreground-secondary"
const grouped = { format: (v: number) => v.toLocaleString(locale()) }

/** A plain download link styled as a button: the route answers with an attachment. */
function DownloadLink({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="secondary" size="touch" className="w-full">
      <a href={href} download>
        <Download aria-hidden />
        {label}
      </a>
    </Button>
  )
}

/** Your data `/more/data` (U21): your daily scores and journal answers as CSV or JSON. */
export default async function YourDataPage() {
  await connection()
  const ctx = await userCtx()
  const [vm, coach] = await Promise.all([getYourData(ctx), listChats(ctx.db, ctx.userId).then((r) => r.chats.length > 0)])
  const since = vm.first ? tr(` since ${formatDay(vm.first, DAY.full)}`, ` desde ${formatDay(vm.first, DAY.full)}`) : ""

  return (
    <DetailShell
      title={tr("Your data", "Seus dados")}
      primary={
        <div className="mx-auto flex w-full max-w-[640px] flex-col gap-3 md:gap-4">
          <SectionShell variant="card" level={2} title={tr("Daily scores", "Scores diários")} aside={<span className={`${CAPTION} tabular-nums`}>{grouped.format(vm.days)}&nbsp;{tr("days", "dias")}</span>}>
            <p className={BODY}>
              {tr(`One row per day${since}: Recovery, Strain, sleep performance, hours and consistency, heart rate variability, resting heart rate, respiratory rate, stress and steps.`, `Uma linha por dia${since}: Recuperação, Esforço, desempenho do sono, horas e consistência, variabilidade da frequência cardíaca, frequência cardíaca de repouso, frequência respiratória, estresse e passos.`)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <DownloadLink href="/export/daily?format=csv" label="CSV" />
              <DownloadLink href="/export/daily?format=json" label="JSON" />
            </div>
          </SectionShell>

          <SectionShell variant="card" level={2} title={tr("Journal", "Diário")} aside={<span className={`${CAPTION} tabular-nums`}>{grouped.format(vm.answers)}&nbsp;{tr("answers", "respostas")}</span>}>
            <p className={BODY}>{tr("Every check-in answer, hidden behaviours included. The JSON also lists your behaviours.", "Todas as respostas do check-in, inclusive de comportamentos ocultos. O JSON também lista seus comportamentos.")}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <DownloadLink href="/export/journal?format=csv" label="CSV" />
              <DownloadLink href="/export/journal?format=json" label="JSON" />
            </div>
          </SectionShell>

          {coach && (
            <SectionShell variant="card" level={2} title="Coach">
              <p className={BODY}>{tr("Every saved coach chat, with the data cards it showed.", "Todas as conversas salvas do coach, com os cartões de dados que ele mostrou.")}</p>
              <div className="mt-4">
                <DownloadLink href="/export/coach" label="JSON" />
              </div>
            </SectionShell>
          )}

          <p className={CAPTION}>{tr("No export includes your Google access tokens or your AI provider key.", "Nenhuma exportação inclui seus tokens de acesso do Google nem a chave do seu provedor de IA.")}</p>
        </div>
      }
    />
  )
}
