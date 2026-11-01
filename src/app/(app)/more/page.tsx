import { connection } from "next/server"
import { Archive, BookOpen, CalendarDays, CalendarRange, ChartLine, Database, ListChecks, Palette, Plug, UserRound, BotMessageSquare } from "lucide-react"
import { formatDay, rangeLabel } from "@/lib/format"
import { coachAccess } from "@/server/coach/store"
import { userCtx } from "@/server/queries/common"
import { getMore } from "@/server/queries/settings"
import { LinkList, MORE_COLUMN, type LinkListRow } from "@/components/shells/LinkList"
import { PageShell } from "@/components/shells/PageShell"
import { About } from "./About"
import { SCORE_DOCS } from "./how-it-works/content"
import { tr } from "@/lib/locale-context"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  return { title: (await getTranslations("meta.more"))("title") }
}

/** More `/more` (spec §7.14, U21): everything that isn't configuration. Settings stays Account, Data source, Profile. */
export default async function MorePage() {
  await connection()
  const ctx = await userCtx()
  const [vm, coach] = await Promise.all([getMore(ctx), coachAccess(ctx.db, ctx.userId)])
  // Below 1280 px (where the sidebar lists Settings) each part of Settings is a row here, as the reference app's "Account & settings".
  const settings: LinkListRow[] = [
    { icon: UserRound, label: tr("Account", "Conta"), href: "/settings?s=account" },
    { icon: Plug, label: tr("Data source", "Fonte de dados"), href: "/settings?s=source" },
    { icon: Palette, label: tr("App", "App"), href: "/settings?s=app" },
    ...(coach ? [{ icon: BotMessageSquare, label: "Coach", href: "/settings?s=coach" }] : []),
  ]
  const reports: LinkListRow[] = [
    ...(vm.latestWeek
      ? [{ icon: CalendarRange, label: tr("Weekly report", "Relatório semanal"), aside: rangeLabel(vm.latestWeek.start, vm.latestWeek.end), href: `/reports/${vm.latestWeek.period}` }]
      : []),
    ...(vm.latestMonth
      ? [{ icon: CalendarDays, label: tr("Monthly report", "Relatório mensal"), aside: formatDay(vm.latestMonth.start, { month: "long" }), href: `/reports/${vm.latestMonth.period}` }]
      : []),
    { icon: Archive, label: tr("All reports", "Todos os relatórios"), aside: vm.reportCount ? String(vm.reportCount) : undefined, href: "/reports" },
  ]

  return (
    <PageShell title={tr("More", "Mais")}>
      {/* One 640 px column, as Settings: a list reads top to bottom, and side-by-side columns sharing grid rows
          left holes whenever one section was shorter (no reports yet). */}
      <div className={MORE_COLUMN}>
        <LinkList title={tr("Account & settings", "Conta e ajustes")} rows={settings} className="xl:hidden" />
        <LinkList title={tr("Reports", "Relatórios")} rows={reports} />
        <LinkList title={tr("Trends", "Tendências")} rows={[{ icon: ChartLine, label: tr("Trends", "Tendências"), aside: tr("Up to 1 year", "Até 1 ano"), href: "/trends" }]} />
        <LinkList
          title={tr("Journal", "Diário")}
          rows={[{ icon: ListChecks, label: tr("Behaviours", "Comportamentos"), aside: tr(`${vm.behaviours.shown} of ${vm.behaviours.total} shown`, `${vm.behaviours.shown} de ${vm.behaviours.total} exibidos`), href: "/more/behaviours" }]}
        />
        <LinkList title={tr("Help", "Ajuda")} rows={[{ icon: BookOpen, label: tr("How Pulse works", "Como o Pulse funciona"), aside: tr(`${SCORE_DOCS.length} scores`, `${SCORE_DOCS.length} scores`), href: "/more/how-it-works" }]} />
        <LinkList title={tr("Your data", "Seus dados")} rows={[{ icon: Database, label: tr("Export", "Exportar"), aside: "CSV, JSON", href: "/more/data" }]} />
        <About version={vm.version} scoringVersion={vm.scoringVersion} />
      </div>
    </PageShell>
  )
}
