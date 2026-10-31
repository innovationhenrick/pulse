import { dayLabel } from "@/lib/format"
import { getHeartRate } from "@/server/queries/health"
import { ZoneBars } from "@/components/charts/ZoneBars"
import { DetailShell } from "@/components/shells/DetailShell"
import { SectionShell } from "@/components/shells/SectionShell"
import { pageDay, type SearchParams } from "../../_lib/day"
import { HeartRateChart, HeartRateHero, LiveHeartRate } from "./LiveHeartRate"
import { tr } from "@/lib/locale-context"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("meta.heartRate")
  return { title: t("title"), description: t("description") }
}

const info = () => ({
  title: tr("About heart rate", "Sobre a frequência cardíaca"),
  body: (
    <>
      <p>{tr("Your band records heart rate through the day. Fitbit uploads it to Google Health, and Pulse reads it from there.", "Sua pulseira registra a frequência cardíaca ao longo do dia. O Fitbit a envia ao Google Health, e o Pulse a lê de lá.")}</p>
      <p>{tr("While this screen is open on today, Pulse checks for new readings every minute. A reading usually arrives one to three minutes after your band takes it, so the newest one is never quite now.", "Enquanto esta tela está aberta em hoje, o Pulse busca novas medições a cada minuto. Uma medição costuma chegar de um a três minutos depois que a pulseira a faz, então a mais recente nunca é exatamente agora.")}</p>
      <p>{tr("The chart shows each minute’s average. Minutes without a reading, when the band was off or not syncing, stay blank.", "O gráfico mostra a média de cada minuto. Minutos sem medição, quando a pulseira estava desligada ou sem sincronizar, ficam em branco.")}</p>
    </>
  ),
})

export default async function HeartRatePage({ searchParams }: PageProps<"/health/heart-rate">) {
  const { d, today, ctx } = await pageDay(searchParams as SearchParams, "/health/heart-rate")
  const vm = await getHeartRate(d, ctx)
  return (
    // Remount on date changes because the live view seeds its state only once.
    <LiveHeartRate key={d} vm={vm}>
      <DetailShell
        title={tr("Heart rate", "Frequência cardíaca")}
        dateSwitcher={{ mode: "day" }}
        info={info()}
        hero={<HeartRateHero />}
        primary={
          <SectionShell variant="card" level={2} title={vm.isToday ? tr("Today", "Hoje") : dayLabel(d, today)} info={{ title: tr("Daily heart rate", "Frequência cardíaca do dia"), body: tr("Heartbeats per minute across the selected day. Gaps mean no heart rate reading was available.", "Batimentos por minuto ao longo do dia selecionado. Lacunas significam que não havia medição de frequência cardíaca.") }}>
            <HeartRateChart />
          </SectionShell>
        }
        secondary={[
          <SectionShell key="zones" variant="card" level={2} title={tr("Time in zones", "Tempo nas zonas")} className="xl:col-span-2">
            <ZoneBars variant="rows" data={vm.zones} note={vm.zoneNote} emptyCopy={vm.isToday ? tr("No heart-rate zones yet today.", "Ainda sem zonas de frequência cardíaca hoje.") : tr("No heart-rate zones on this day.", "Sem zonas de frequência cardíaca neste dia.")} />
          </SectionShell>,
        ]}
      />
    </LiveHeartRate>
  )
}
