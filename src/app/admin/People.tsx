"use client"

import * as React from "react"
import { ChevronRight, Search, Settings2, Trash2 } from "lucide-react"
import type { AccountRow } from "@/server/admin"
import { cn } from "@/lib/utils"
import { tr } from "@/lib/locale-context"
import { CoachSwitch } from "./AdminClient"
import { PersonPanel } from "./PersonPanel"
import { BTN, Pill, relative, TD, TH } from "./ui"

/** Account rows as the browser gets them: dates as epoch ms. */
export type Person = Omit<AccountRow, "createdAt" | "lastSeen"> & { createdAt: number; lastSeen: number | null }

const WEEK = 7 * 86_400_000
const filters = () =>
  [
    { key: "all", label: tr("Everyone", "Todos") },
    { key: "admins", label: "Admins" },
    { key: "active", label: tr("Active this week", "Ativos esta semana") },
    { key: "google", label: tr("No Google yet", "Sem Google ainda") },
    { key: "coach", label: tr("Coach set up", "Coach configurado") },
  ] as const
type Filter = ReturnType<typeof filters>[number]["key"]

const role = () => ({ owner: tr("Owner", "Dono"), admin: "Admin", user: tr("Member", "Membro") }) as const

/**
 * Everyone on the server: search by name, username or email; filter; and per person make or remove admin, pick for
 * the coach (when access is "chosen") or delete. Owners (ADMIN_EMAILS) and you have no menu.
 */
export function People({ people, me, now, chosen, canReset }: { people: Person[]; me: number; now: number; chosen: boolean; canReset: boolean }) {
  const [q, setQ] = React.useState("")
  const [filter, setFilter] = React.useState<Filter>("all")
  const needle = q.trim().toLowerCase()
  const shown = people.filter((p) => {
    if (needle && ![p.name, p.username ?? "", p.email].some((s) => s.toLowerCase().includes(needle))) return false
    if (filter === "admins") return p.role !== "user"
    if (filter === "active") return p.lastSeen !== null && now - p.lastSeen < WEEK
    if (filter === "google") return !p.google
    if (filter === "coach") return p.coachReady
    return true
  })
  const count = (f: Filter) =>
    f === "all" ? people.length : people.filter((p) => (f === "admins" ? p.role !== "user" : f === "active" ? p.lastSeen !== null && now - p.lastSeen < WEEK : f === "google" ? !p.google : p.coachReady)).length

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-border">
      <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
        <div role="group" aria-label={tr("Show", "Mostrar")} className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] max-md:[mask-image:linear-gradient(to_left,transparent,black_32px)] md:mx-0 md:px-0">
          {filters().map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 pointer-coarse:h-10 text-[13px] font-medium outline-none transition-[background-color,color] duration-150 ease-standard focus-visible:ring-3 focus-visible:ring-ring/50",
                filter === f.key ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
              )}
            >
              {f.label}
              <span className="font-numeric text-[12px] text-muted-foreground tabular-nums">{count(f.key)}</span>
            </button>
          ))}
        </div>
        <label className="relative block md:w-64">
          <span className="sr-only">{tr("Search people", "Buscar pessoas")}</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.currentTarget.value)}
            placeholder={tr("Search people", "Buscar pessoas")}
            className="h-10 w-full rounded-lg bg-secondary pr-3 pl-9 text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="px-5 py-10 text-center text-[14px] text-muted-foreground">{needle ? tr(`No one matches “${q.trim()}”.`, `Ninguém corresponde a “${q.trim()}”.`) : tr("No one here.", "Ninguém aqui.")}</p>
      ) : (
        // Below 1280 px each row is a compact list item that opens the person's panel; the table returns at 1280 px.
        <table role="table" className="block w-full border-collapse xl:table">
          <thead role="rowgroup" className="max-xl:sr-only">
            <tr role="row" className="border-b border-border">
              <th role="columnheader" scope="col" className={TH}>{tr("Person", "Pessoa")}</th>
              <th role="columnheader" scope="col" className={TH}>{tr("Role", "Função")}</th>
              <th role="columnheader" scope="col" className={TH}>{tr("Joined", "Entrou")}</th>
              <th role="columnheader" scope="col" className={TH}>{tr("Last active", "Última atividade")}</th>
              <th role="columnheader" scope="col" className={TH}>Google</th>
              <th role="columnheader" scope="col" className={TH}>Coach</th>
              <th role="columnheader" scope="col" className={cn(TH, "text-right")}>
                {tr("Actions", "Ações")}
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup" className="block divide-y divide-border xl:table-row-group">
            {shown.map((p) => (
              <PersonPanel key={p.id} person={p} now={now} chosen={chosen} canReset={canReset} me={p.id === me}>
                {({ open, askDelete, admin }) => (
                  <tr
                    role="row"
                    className="relative flex min-h-16 items-center gap-3 px-4 py-2.5 transition-[background-color] duration-150 hover:bg-foreground/[0.02] has-[[data-row-open]:active]:bg-foreground/[0.04] xl:table-row xl:min-h-0"
                  >
                    <td role="cell" className={cn(TD, "min-w-0 flex-1 xl:table-cell xl:px-4 xl:py-3")}>
                      {/* Phones: the whole row opens the panel (the button is stretched over it). */}
                      <button
                        type="button"
                        data-row-open
                        onClick={open}
                        aria-label={`${p.role === "owner" || p.id === me ? tr("View", "Ver") : tr("Manage", "Gerenciar")} ${p.name}`}
                        className="absolute inset-0 z-10 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset xl:hidden"
                      />
                      <span className="flex items-center gap-3">
                        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground/[0.07] text-[13px] font-semibold">
                          {p.name.trim()[0]?.toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 items-baseline gap-1.5 xl:max-w-[240px]">
                            <span className="truncate font-medium">{p.name}</span>
                            {p.id === me && <span className="shrink-0 text-[12px] text-muted-foreground">{tr("(you)", "(você)")}</span>}
                          </span>
                          <span className="block truncate text-[13px] leading-[18px] text-muted-foreground xl:max-w-[240px]" title={p.email}>
                            {p.username ? `@${p.username} · ` : ""}
                            {p.email}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td role="cell" className={cn(TD, "flex shrink-0 items-center gap-1 xl:table-cell xl:px-4 xl:py-3")}>
                      <Pill tone={p.role === "user" ? "neutral" : "coach"}>{role()[p.role]}</Pill>
                      <ChevronRight aria-hidden className="-mr-1 size-4 text-muted-foreground xl:hidden" />
                    </td>
                    <td role="cell" className={cn(TD, "hidden whitespace-nowrap text-muted-foreground xl:table-cell xl:px-4 xl:py-3")}>{relative(p.createdAt, now)}</td>
                    <td role="cell" className={cn(TD, "hidden whitespace-nowrap text-muted-foreground xl:table-cell xl:px-4 xl:py-3")}>{p.lastSeen ? relative(p.lastSeen, now) : tr("Signed out", "Sem acesso")}</td>
                    <td role="cell" className={cn(TD, "hidden xl:table-cell xl:px-4 xl:py-3")}>{p.google ? <Pill tone="good">{tr("Connected", "Conectado")}</Pill> : <Pill>{tr("Not yet", "Ainda não")}</Pill>}</td>
                    <td role="cell" className={cn(TD, "hidden xl:table-cell xl:px-4 xl:py-3")}>
                      {chosen && p.role !== "owner" ? (
                        <CoachSwitch id={p.id} name={p.name} allowed={p.coachAllowed} />
                      ) : p.coachReady ? (
                        <Pill tone="coach">{tr("Set up", "Configurado")}</Pill>
                      ) : (
                        <span className="text-[13px] text-muted-foreground">{tr("Not set up", "Não configurado")}</span>
                      )}
                    </td>
                    <td role="cell" className={cn(TD, "hidden xl:table-cell xl:px-4 xl:py-3 xl:text-right")}>
                      {p.role === "owner" ? (
                        <span className="text-[13px] text-muted-foreground">{tr("Set in .env", "Definido no .env")}</span>
                      ) : p.id === me ? (
                        <span className="text-[13px] text-muted-foreground">{tr("You", "Você")}</span>
                      ) : (
                        <span className="flex items-center justify-end gap-2">
                          <button type="button" onClick={open} aria-label={tr(`Manage ${p.name}`, `Gerenciar ${p.name}`)} className={BTN.outline}>
                            <Settings2 aria-hidden />
                            {tr("Manage", "Gerenciar")}
                          </button>
                          <button type="button" disabled={admin} onClick={askDelete} aria-label={tr(`Delete ${p.name}`, `Excluir ${p.name}`)} title={admin ? tr("Remove admin first", "Remova o admin primeiro") : undefined} className={BTN.danger}>
                            <Trash2 aria-hidden />
                            {tr("Delete", "Excluir")}
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                )}
              </PersonPanel>
            ))}
          </tbody>
        </table>
      )}
      <p className="border-t border-border px-4 py-3 text-[13px] text-muted-foreground">
        {tr(`Showing ${shown.length} of ${people.length}`, `Mostrando ${shown.length} de ${people.length}`)}
      </p>
    </div>
  )
}
