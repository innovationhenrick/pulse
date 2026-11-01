"use client"

import Link from "next/link"
import { CalendarDays, Ellipsis, HeartPulse } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, MENU_ITEM, MENU_PANEL } from "@/components/ui/dropdown-menu"
import { tr } from "@/lib/locale-context"

/** The activity's "..." (activity-weightlifting-detail-top): the day's Strain and the heart-rate settings its zones come from. Pulse can't edit an imported workout. */
export function ActivityMenu({ strainHref, settingsHref }: { strainHref: string; settingsHref: string }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-touch" aria-label={tr("More for this activity", "Mais sobre esta atividade")} className="text-foreground hover:bg-foreground/8">
          <Ellipsis aria-hidden strokeWidth={2} className="size-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className={cn(MENU_PANEL, "w-auto min-w-64")}>
        <DropdownMenuItem asChild className={MENU_ITEM}>
          <Link href={strainHref}>
            <CalendarDays aria-hidden strokeWidth={1.75} className="size-5 text-foreground-secondary" />
            {tr("Strain for this day", "Esforço deste dia")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={MENU_ITEM}>
          <Link href={settingsHref}>
            <HeartPulse aria-hidden strokeWidth={1.75} className="size-5 text-foreground-secondary" />
            {tr("Heart-rate settings", "Ajustes de frequência cardíaca")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
