import Link from "next/link"
import { connection } from "next/server"
import { cn } from "@/lib/utils"
import { DAY, formatDay, formatValue, rangeLabel } from "@/lib/format"
import { userCtx } from "@/server/queries/common"
import { getReportArchive, type ReportListItem } from "@/server/queries/reports"
import { MiniRing } from "@/components/metrics/MiniRing"
import { DetailShell } from "@/components/shells/DetailShell"
import { EmptyState } from "@/components/shells/EmptyState"
import { LinkList, type LinkListRow, MORE_COLUMN } from "@/components/shells/LinkList"
import { tr } from "@/lib/locale-context"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  return { title: (await getTranslations("meta.reports"))("title") }
}

/** The period's average Recovery as the reference app's 22 px ring and its value. */
function Aside({ r }: { r: ReportListItem }) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      <MiniRing variant="recovery" value={r.recovery} />
      <span className="w-[4ch] text-right font-numeric text-[15px] leading-5 font-bold tabular-nums">
        <span className="sr-only">, {tr("average Recovery", "Recuperação média")} </span>
        {formatValue("int", r.recovery)}
        {r.recovery !== null && "%"}
      </span>
    </span>
  )
}

/** Month groups of weeks shown before "Show earlier weeks": about a quarter. */
const RECENT_MONTHS = 3

type View = "weeks" | "months"
type Group = { title: string; rows: LinkListRow[] }

/** Consecutive items sharing a key become one titled group, keeping the newest-first order. */
function groupRows(items: ReportListItem[], key: (r: ReportListItem) => string, row: (r: ReportListItem) => LinkListRow): Group[] {
  const groups: Group[] = []
  for (const r of items) {
    const title = key(r)
    if (groups.at(-1)?.title !== title) groups.push({ title, rows: [] })
    groups.at(-1)!.rows.push(row(r))
  }
  return groups
}

const weekRow = (r: ReportListItem): LinkListRow => ({ label: rangeLabel(r.start, r.end), href: `/reports/${r.period}`, aside: <Aside r={r} />, description: r.partial ? tr("Partial week", "Semana parcial") : undefined })
const monthRow = (r: ReportListItem): LinkListRow => ({ label: formatDay(r.start, { month: "long" }), href: `/reports/${r.period}`, aside: <Aside r={r} />, description: r.partial ? tr("Partial month", "Mês parcial") : undefined })

/** Weekly / Monthly as links: the view lives in the URL, so Back and a shared link keep it. */
function ViewSwitch({ view }: { view: View }) {
  const item = (v: View, label: string) => (
    <Link
      href={v === "weeks" ? "/reports" : "/reports?view=months"}
      replace
      scroll={false}
      aria-current={view === v ? "page" : undefined}
      className={cn(
        "grid h-10 flex-1 place-items-center rounded-md text-[13px] font-bold tracking-[0.1em] uppercase outline-none transition-[background-color,color] duration-150 ease-standard focus-visible:ring-3 focus-visible:ring-ring/50",
        view === v ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </Link>
  )
  return (
    <nav aria-label={tr("Report period", "Período do relatório")} className="flex gap-0.5 rounded-lg bg-muted p-0.5">
      {item("weeks", tr("Weekly", "Semanal"))}
      {item("months", tr("Monthly", "Mensal"))}
    </nav>
  )
}

/**
 * Reports archive `/reports` (More, U21): one period kind at a time (Weekly / Monthly), newest first. Weeks are
 * grouped by month and only the last few months show until "Show earlier weeks"; months are grouped by year.
 */
export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  await connection()
  const q = await searchParams
  const vm = await getReportArchive(await userCtx())
  const empty = !vm.weeks.length && !vm.months.length
  // A first week can exist before any month has data, and vice versa: fall back to the kind that has rows.
  const view: View = (q.view === "months" && vm.months.length) || !vm.weeks.length ? "months" : "weeks"
  const all = q.all === "1"
  const groups =
    view === "weeks"
      ? groupRows(vm.weeks, (r) => formatDay(r.start, DAY.monthYear), weekRow)
      : groupRows(vm.months, (r) => r.start.slice(0, 4), monthRow)
  const shown = view === "weeks" && !all ? groups.slice(0, RECENT_MONTHS) : groups
  return (
    <DetailShell
      title={tr("Reports", "Relatórios")}
      primary={
        empty ? (
          <EmptyState body={tr("No reports yet. Your first weekly report appears once a week has data.", "Ainda sem relatórios. O primeiro relatório semanal aparece quando uma semana tiver dados.")} />
        ) : (
          // One 640 px column like More and Settings: two columns of uneven month groups left holes.
          <div className={MORE_COLUMN}>
            <ViewSwitch view={view} />
            {shown.map((g) => (
              <LinkList key={g.title} title={g.title} rows={g.rows} />
            ))}
            {shown.length < groups.length && (
              <Link
                href="/reports?all=1"
                replace
                scroll={false}
                className="mx-auto grid h-11 place-items-center rounded-full px-5 text-xs font-bold tracking-[0.1em] text-foreground/85 uppercase outline-none transition-[background-color,color] duration-150 ease-standard hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {tr("Show earlier weeks", "Mostrar semanas anteriores")}
              </Link>
            )}
          </div>
        )
      }
    />
  )
}
