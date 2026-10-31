import type { ReactNode } from "react"
import { Activity, Droplet, Heart, Thermometer, Wind } from "lucide-react"
import type { FormatKey } from "@/lib/format"
import type { Vital, VitalKey } from "@/server/queries/types"
import { KeyStatRow, KeyStatRowSkeleton } from "@/components/metrics/KeyStatRow"
import { dayHref, metricHref } from "@/lib/url"
import { tr } from "@/lib/locale-context"

const ICON: Record<VitalKey, ReactNode> = {
  resp: <Wind />,
  spo2: <Droplet />,
  restingHr: <Heart />,
  hrv: <Activity />,
  skinTempDev: <Thermometer />,
}
const FORMAT: Record<VitalKey, FormatKey> = { resp: "decimal1", spo2: "int", restingHr: "int", hrv: "int", skinTempDev: "signed1" }
const GRID = "grid grid-cols-2 gap-3 *:last:col-span-2 xl:grid-cols-5 xl:gap-4 xl:*:last:col-span-1"
const note = () => tr("Resting heart rate, HRV and skin temperature use Google’s personal ranges when it has them; otherwise your range is your baseline ± 2 SD over 60 nights.", "A frequência cardíaca de repouso, a VFC e a temperatura da pele usam as faixas pessoais do Google quando elas existem; senão, sua faixa é a sua base ± 2 DP em 60 noites.")

const DETAIL_KEY: Record<VitalKey, string> = { resp: "resp", spo2: "spo2", restingHr: "rhr", hrv: "hrv", skinTempDev: "skin" }

export function VitalTiles({ vitals, day, today }: { vitals: Vital[]; day: string; today: string }) {
  return (
    <>
      <div className={GRID}>
        {vitals.map((x, i) => (
          <KeyStatRow
            key={x.key}
            variant="tile"
            wide={i === vitals.length - 1 && "xl"}
            spark={{ values: x.trend.points.slice(-30).map((p) => p.value), band: x.range, caption: tr("Last 30 nights", "Últimas 30 noites") }}
            icon={ICON[x.key]}
            label={x.key === "restingHr" || x.key === "hrv" ? x.short : x.label}
            metric={x.metric}
            unit={x.unit}
            format={FORMAT[x.key]}
            direction="none"
            chip={x.chip ?? undefined}
            href={dayHref(metricHref(DETAIL_KEY[x.key]), day, today)}
          />
        ))}
      </div>
      <p className="mt-3 text-xs leading-4 font-medium text-pretty text-muted-foreground">{note()}</p>
    </>
  )
}

const skeletonLabels = (): [VitalKey, string][] => [
  ["resp", tr("Respiratory rate", "Frequência respiratória")],
  ["spo2", tr("Blood oxygen", "Oxigênio no sangue")],
  ["restingHr", tr("RHR", "FC rep.")],
  ["hrv", tr("HRV", "VFC")],
  ["skinTempDev", tr("Skin temperature", "Temperatura da pele")],
]

export function VitalTilesSkeleton() {
  return (
    <>
      <div className={GRID}>
        {skeletonLabels().map(([k, l]) => (
          <KeyStatRowSkeleton key={k} variant="tile" label={l} icon={ICON[k]} />
        ))}
      </div>
      <p className="mt-3 text-xs leading-4 font-medium text-pretty text-muted-foreground">{note()}</p>
    </>
  )
}
