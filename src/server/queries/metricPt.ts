// Brazilian Portuguese copy for the per-metric screens (metric.ts), keyed by the English sentence it replaces.
import { tr } from "@/lib/locale-context";

const PT: Record<string, string> = {
  "Variation in time between heartbeats during sleep, measured in milliseconds. Compare it with your own usual range.": "Variação do tempo entre os batimentos durante o sono, medida em milissegundos. Compare com a sua faixa habitual.",
  "Your resting heart rate from Google Health, or the sleeping heart rate from your main sleep session when the daily value is missing.": "Sua frequência cardíaca de repouso do Google Health, ou a frequência cardíaca durante o sono da sua sessão principal quando o valor diário está ausente.",
  "Breaths per minute during sleep, measured by your Fitbit.": "Respirações por minuto durante o sono, medidas pelo seu Fitbit.",
  "Estimated blood oxygen saturation during sleep, measured by your Fitbit.": "Saturação de oxigênio no sangue estimada durante o sono, medida pelo seu Fitbit.",
  "Nightly skin temperature above or below your personal baseline, in degrees Celsius. This is a temperature difference, not your body temperature.": "Temperatura da pele durante a noite acima ou abaixo da sua base pessoal, em graus Celsius. É uma diferença de temperatura, não a sua temperatura corporal.",
  "Steps counted through the day.": "Passos contados ao longo do dia.",
  "Everything you burned: your resting burn plus movement. Resting is the total minus active calories, since Google sends no separate resting roll-up.": "Tudo o que você gastou: o gasto em repouso mais o movimento. O repouso é o total menos as calorias ativas, já que o Google não envia um total de repouso separado.",
  "Your weight, from a connected scale, a log in Fitbit or Google Health, or Pulse's Journal.": "Seu peso, de uma balança conectada, de um registro no Fitbit ou no Google Health, ou do Diário do Pulse.",
  "Body fat percentage, from a smart scale or a manual log.": "Percentual de gordura corporal, de uma balança inteligente ou de um registro manual.",
  "Distance covered on foot and in workouts, from your steps and GPS.": "Distância percorrida a pé e em treinos, a partir dos seus passos e do GPS.",
  "Floors climbed, counted from changes in altitude as you walk.": "Andares subidos, contados a partir de mudanças de altitude ao caminhar.",
  "Height gained over the day.": "Altura ganha ao longo do dia.",
  "Minutes of moderate or harder movement, the time that counts toward the 150 minutes a week the WHO recommends.": "Minutos de movimento moderado ou mais intenso, o tempo que conta para os 150 minutos por semana recomendados pela OMS.",
  "Minutes of light movement, such as an easy walk or chores.": "Minutos de movimento leve, como uma caminhada tranquila ou tarefas domésticas.",
  "Active Zone Minutes: a minute in the moderate zone counts once and a minute in the vigorous or peak zones counts twice, toward 150 a week.": "Minutos em Zona Ativa: um minuto na zona moderada conta uma vez e um minuto nas zonas vigorosa ou de pico conta duas vezes, rumo a 150 por semana.",
  "Calories burned by movement above your resting burn.": "Calorias gastas pelo movimento acima do seu gasto em repouso.",
  "Time awake and still. Google sends one daily total, so the hourly view shows your steps instead: the gaps are when you sat.": "Tempo acordado e parado. O Google envia um total diário, então a visão por hora mostra seus passos: as lacunas são os momentos em que você ficou sentado.",
  "Your average heart rate over the whole day, from your Fitbit.": "Sua frequência cardíaca média ao longo do dia inteiro, do seu Fitbit.",
  "Water you logged in Fitbit, Google Health or Pulse's Journal.": "Água que você registrou no Fitbit, no Google Health ou no Diário do Pulse.",
  "Calories from the food you logged.": "Calorias dos alimentos que você registrou.",
  "Protein from the food you logged.": "Proteína dos alimentos que você registrou.",
  "Carbohydrates from the food you logged.": "Carboidratos dos alimentos que você registrou.",
  "Fat from the food you logged.": "Gordura dos alimentos que você registrou.",
  "Blood glucose readings from a connected meter or a manual log.": "Medições de glicose no sangue de um medidor conectado ou de um registro manual.",
  "Core body temperature readings from a connected sensor.": "Medições da temperatura corporal central de um sensor conectado.",
  "Strokes counted during pool swims.": "Braçadas contadas durante natações na piscina.",
  "Google Health's daily roll-up, counted by your Fitbit or your phone and synced through the Google Health API. Pulse shows it as it comes and does not score it.": "O total diário do Google Health, contado pelo seu Fitbit ou pelo celular e sincronizado pela API do Google Health. O Pulse o mostra como chega e não o pontua.",
  "Readings synced from Google Health, plus any you log in Pulse. A day without a reading shows the latest one before it.": "Medições sincronizadas do Google Health, mais as que você registra no Pulse. Um dia sem medição mostra a última anterior.",
  "Google Health's daily total of your logs, synced through the Google Health API, plus entries made in Pulse since the last sync.": "O total diário dos seus registros no Google Health, sincronizado pela API do Google Health, mais os lançamentos feitos no Pulse desde a última sincronização.",
  "Google Health's daily value, from your Fitbit or a connected device. Pulse shades your usual range from the last 90 days.": "O valor diário do Google Health, do seu Fitbit ou de um dispositivo conectado. O Pulse sombreia a sua faixa habitual dos últimos 90 dias.",
};

/** The sentence in the interface language; an English sentence with no entry reads as written. */
export const metricText = (en: string) => tr(en, PT[en] ?? en);
