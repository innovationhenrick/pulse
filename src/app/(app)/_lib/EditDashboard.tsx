"use client"

import * as React from "react"
import { ChartNoAxesColumn, Equal, Minus, Pencil, Plus, Search } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { DASHBOARD_GROUPS, DASHBOARD_LABEL, DASHBOARD_METRICS, type DashboardKey } from "@/lib/dashboard"
import { saveDashboard } from "@/server/actions/dashboard"
import { ResponsiveSheet, SHEET_SECTION } from "@/components/shells/ResponsiveSheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { STAT_ICON } from "./view"
import { tr } from "@/lib/locale-context"

export type EditDashboardProps = {
  /** The metrics on Home now, in order. */
  keys: DashboardKey[]
  /** Metrics with no value in the last 30 days: still addable, marked "No data yet". */
  empty?: DashboardKey[]
}

/** dashboard-customize-reorder: each metric a card with its icon and caps name. */
const CARD = "flex min-h-14 items-center gap-3 rounded-xl bg-foreground/[0.07] pl-4"
const NAME = "min-w-0 flex-1 text-[13px] leading-4 font-bold tracking-[0.1em] text-balance uppercase"
const ICON = "grid size-5 shrink-0 place-items-center text-muted-foreground [&_svg]:size-5 [&_svg]:stroke-[1.75]"
const GROUP_LABEL = Object.fromEntries(DASHBOARD_GROUPS.map((g) => [g.key, g.label])) as Record<string, string>
const moveTo = <T,>(items: T[], from: number, to: number) => {
  const next = [...items]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}

/**
 * Home › My Dashboard's CUSTOMIZE (dashboard-customize-*, spec §11 CD1, CD2, R41): the reference app's full-screen editor.
 * "My Dashboard" holds the shown metrics in order, each dragged by its handle (or moved with the arrow keys on it) and
 * removed with its minus; "Add to My Dashboard" holds the rest by group with a search field, and a tap adds one at the
 * end. SAVE stores the list and shows Success.
 */
export function EditDashboard({ keys, empty = [] }: EditDashboardProps) {
  const [open, setOpen] = React.useState(false)
  const [shown, setShown] = React.useState(keys)
  const [query, setQuery] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [dragging, setDragging] = React.useState<DashboardKey | null>(null)
  const [status, setStatus] = React.useState("")
  // The control that takes focus after a row leaves its list (its own button is gone), or a handle after a move.
  const focusNext = React.useRef<string | null>(null)
  const search = React.useRef<HTMLInputElement>(null)
  const list = React.useRef<HTMLUListElement>(null)

  React.useEffect(() => {
    if (focusNext.current === null) return
    ;(document.getElementById(focusNext.current) ?? search.current)?.focus()
    focusNext.current = null
  })

  const q = query.trim().toLowerCase()
  const hidden = DASHBOARD_METRICS.filter((m) => !shown.includes(m.key))
  const matches = hidden.filter((m) => !q || m.label.toLowerCase().includes(q) || GROUP_LABEL[m.group].toLowerCase().includes(q))
  const groups = DASHBOARD_GROUPS.map((g) => ({ ...g, items: matches.filter((m) => m.group === g.key) })).filter((g) => g.items.length)
  const noData = new Set(empty)

  const start = () => {
    setShown(keys)
    setQuery("")
    setStatus("")
    setDone(false)
    setOpen(true)
  }
  const move = (from: number, to: number) => {
    if (to < 0 || to >= shown.length || to === from) return
    setShown(moveTo(shown, from, to))
    setStatus(`${DASHBOARD_LABEL[shown[from]]} moved to position ${to + 1} of ${shown.length}`)
  }
  // Pointer drag: the row follows the pointer over the other rows' midpoints.
  const drag = (key: DashboardKey) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(key)
  }
  const dragMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging || !list.current) return
    const rows = [...list.current.children] as HTMLElement[]
    const to = rows.findIndex((r) => e.clientY < r.getBoundingClientRect().top + r.offsetHeight / 2)
    move(shown.indexOf(dragging), to === -1 ? shown.length - 1 : to)
  }
  const remove = (i: number) => {
    const next = shown.filter((_, j) => j !== i)
    setShown(next)
    setStatus(`${DASHBOARD_LABEL[shown[i]]} removed from Home`)
    const after = next[Math.min(i, next.length - 1)]
    focusNext.current = after ? `dashboard-remove-${after}` : "dashboard-search"
  }
  const add = (key: DashboardKey) => {
    const i = matches.findIndex((m) => m.key === key)
    setShown([...shown, key])
    setStatus(`${DASHBOARD_LABEL[key]} added at position ${shown.length + 1}`)
    const after = matches[i + 1] ?? matches[i - 1]
    focusNext.current = after ? `dashboard-add-${after.key}` : "dashboard-search"
  }
  const save = async () => {
    setSaving(true)
    const r = await saveDashboard({ keys: shown }).catch(() => ({ ok: false as const, error: "network" }))
    setSaving(false)
    if (!r.ok) return void toast.error("Couldn’t save your dashboard. Try again.")
    setDone(true)
  }

  return (
    <>
      {/* the reference app's "CUSTOMIZE" with a pencil at the section header's right (home-my-plan-card-scroll-up). */}
      <Button
        variant="ghost"
        aria-label={tr("Customize My Dashboard", "Personalizar Meu painel")}
        onClick={start}
        className="relative -mr-2 h-8 gap-1.5 rounded-full px-2 text-xs leading-4 font-bold tracking-[0.1em] text-foreground uppercase after:absolute after:-inset-y-1.5 hover:bg-foreground/[0.06]"
      >
        {tr("Customize", "Personalizar")}
        <Pencil aria-hidden strokeWidth={1.75} className="size-4" />
      </Button>
      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title={tr("Customize dashboard", "Personalizar painel")}
        size="screen"
        done={done ? { title: tr("Success", "Pronto"), body: tr("Your preferences have been saved.", "Suas preferências foram salvas."), onDone: () => setOpen(false) } : null}
        footer={
          <Button size="sheet" variant="outline-pill" onClick={save} disabled={saving || shown.length === 0} aria-describedby={shown.length === 0 ? "dashboard-none" : undefined}>
            {saving ? tr("Saving…", "Salvando…") : tr("Save", "Salvar")}
          </Button>
        }
      >
        <h3 id="dashboard-shown" className="mt-4 text-[22px] leading-7 font-semibold">
          {tr("My Dashboard", "Meu painel")}
        </h3>
        <p id="dashboard-reorder-help" className="sr-only">
          {tr("Drag the handle, or press the up and down arrows on it, to move a metric.", "Arraste a alça, ou use as setas para cima e para baixo nela, para mover uma métrica.")}
        </p>
        {shown.length === 0 ? (
          <p id="dashboard-none" role="alert" className="py-4 text-[15px] leading-[22px] text-pretty text-foreground-secondary">
            {tr("Add at least one metric to save.", "Adicione pelo menos uma métrica para salvar.")}
          </p>
        ) : (
          <ul ref={list} aria-labelledby="dashboard-shown" className="mt-4 space-y-3">
            {shown.map((key, i) => {
              const label = DASHBOARD_LABEL[key]
              return (
                <li key={key} className={cn(CARD, "transition-[scale,box-shadow] duration-150 ease-standard", dragging === key && "z-10 scale-[1.02] shadow-overlay")}>
                  <span aria-hidden className={ICON}>
                    {STAT_ICON[key]}
                  </span>
                  <span className={NAME}>{label}</span>
                  {/* dashboard-customize-reorder: the chart tile carries a small bar-chart glyph. */}
                  {key === "stress" && <ChartNoAxesColumn aria-hidden strokeWidth={1.5} className="size-5 shrink-0 text-muted-foreground" />}
                  {/* the reference app hides removal behind a swipe that members could not find; Pulse shows it (spec §11 CD2). */}
                  <Button id={`dashboard-remove-${key}`} variant="ghost" size="icon-touch" aria-label={tr(`Remove ${label}`, `Remover ${label}`)} onClick={() => remove(i)} className="text-foreground-secondary hover:text-foreground">
                    <span className="grid size-6 place-items-center rounded-full ring-1 ring-current">
                      <Minus className="size-3.5" strokeWidth={2.25} />
                    </span>
                  </Button>
                  <Button
                    id={`dashboard-move-${key}`}
                    variant="ghost"
                    size="icon-touch"
                    aria-label={tr(`Reorder ${label}, position ${i + 1} of ${shown.length}`, `Reordenar ${label}, posição ${i + 1} de ${shown.length}`)}
                    aria-describedby="dashboard-reorder-help"
                    onPointerDown={drag(key)}
                    onPointerMove={dragMove}
                    onPointerUp={() => setDragging(null)}
                    onPointerCancel={() => setDragging(null)}
                    onKeyDown={(e) => {
                      const by = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0
                      if (!by) return
                      e.preventDefault()
                      move(i, i + by)
                      focusNext.current = `dashboard-move-${key}`
                    }}
                    className="cursor-grab touch-none text-foreground active:cursor-grabbing"
                  >
                    <Equal aria-hidden strokeWidth={2} className="size-6" />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}

        <h3 id="dashboard-add" className={cn(SHEET_SECTION, "mt-8")}>
          {tr("Add to My Dashboard", "Adicionar ao Meu painel")}
        </h3>
        <div className="relative mt-3">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
          <Input
            ref={search}
            id="dashboard-search"
            name="metric-search"
            spellCheck={false}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("Search metrics…", "Buscar métricas…")}
            aria-label={tr("Search metrics", "Buscar métricas")}
            autoComplete="off"
            enterKeyHint="search"
            className="h-12 rounded-xl bg-foreground/[0.06] pl-10 text-base"
          />
        </div>
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`dashboard-group-${g.key}`} className="mt-5">
            <h4 id={`dashboard-group-${g.key}`} className="text-[13px] leading-4 font-semibold text-foreground-secondary">
              {g.label}
            </h4>
            <ul className="mt-2 space-y-3">
              {g.items.map((m) => (
                <li key={m.key}>
                  <button
                    id={`dashboard-add-${m.key}`}
                    type="button"
                    onClick={() => add(m.key)}
                    aria-label={tr(`Add ${m.label}${noData.has(m.key) ? ", no data yet" : ""}`, `Adicionar ${m.label}${noData.has(m.key) ? ", ainda sem dados" : ""}`)}
                    className={cn(CARD, "w-full pr-3 text-left transition-[background-color,scale] duration-150 ease-standard outline-none hover:bg-foreground/10 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98]")}
                  >
                    <span aria-hidden className={ICON}>
                      {STAT_ICON[m.key]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn(NAME, "block")}>{m.label}</span>
                      {noData.has(m.key) && <span className="mt-0.5 block text-xs leading-4 font-medium text-muted-foreground">{tr("No data yet", "Ainda sem dados")}</span>}
                    </span>
                    <Plus aria-hidden className="size-6 shrink-0" strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {groups.length === 0 && (
          <p className="py-6 text-center text-[15px] leading-[22px] text-pretty text-foreground-secondary">
            {hidden.length ? tr(`No metric matches “${query.trim()}”.`, `Nenhuma métrica corresponde a “${query.trim()}”.`) : tr("Every metric is on Home.", "Todas as métricas já estão no Início.")}
          </p>
        )}
        <p role="status" className="sr-only">
          {status}
        </p>
      </ResponsiveSheet>
    </>
  )
}
