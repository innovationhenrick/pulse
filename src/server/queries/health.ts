// Health hub and its four detail screens (spec §7.6–7.10).
import { factorCopy } from "@/core/algorithms/healthspanFactor";
import { trendHref } from "@/lib/url";
import type { TrendViewKey } from "./trendView";
import type { HealthspanContribution } from "@/core/algorithms/healthspan";
import { minChronic } from "@/core/scoring/readiness";
import { standardConfig } from "@/core/scoring/trainingLoad";
import { acwrTone } from "@/lib/bands";
import { dayLabel, formatDay } from "@/lib/format";
import { weekOf } from "@/lib/url";
import { and, desc, eq, isNotNull, lte, max } from "drizzle-orm";
import { dailyMetrics, dailyScores, dailyValues, healthRecords } from "../db/schema";
import { minuteMeanHr } from "@/core/algorithms/stress";
import { readHr, sampleRange } from "../samples";
import { addDays, daysBetween, fractionalYears, localMidnight, wall } from "../time";
import { zoneBounds, zoneNote, zoneRows } from "./strain";
import { illnessRaised, VITAL_LABEL } from "./home";
import {
  type DayRow,
  dayStartOf,
  finite,
  loadDays,
  loadSeries,
  meanSd,
  minutePoints,
  ms,
  nightReason,
  none,
  ok,
  type QueryCtx,
  stressNow,
  todayOf,
  vitalReason,
  trendPoints,
  stressChartOf,
  exercisesBetween,
} from "./common";
import type {
  ChipTone,
  EcgReading,
  FitnessVM,
  HeartRhythm,
  Measurement,
  HealthHubVM,
  HealthspanContributor,
  HealthspanVM,
  HeartRateLive,
  HeartRateVM,
  Metric,
  MonitorVM,
  StressVM,
  Vital,
  VitalKey,
} from "./types";
import { tr } from "@/lib/locale-context"

const lastStored = async (ctx: QueryCtx, today: string) => {
  const [r] = await ctx.db
    .select({ d: max(dailyScores.day) })
    .from(dailyScores)
    .where(and(eq(dailyScores.userId, ctx.userId), lte(dailyScores.day, today)));
  return r?.d ?? today;
};

// ── Hub ─────────────────────────────────────────────────────────────────────

/** Health hub `/health`: today's values (spec §7.6). */
export async function getHealthHub(ctx: QueryCtx): Promise<HealthHubVM> {
  const today = todayOf(ctx);
  const rows = await loadDays(ctx, addDays(today, -35), today);
  const row = rows.get(today);
  const [hsVm, monitor, fit, stressSeries, heartRate] = await Promise.all([
    getHealthspan(today, ctx),
    getMonitor(today, ctx, rows),
    getFitness(ctx),
    loadSeries(ctx, today, "stress"),
    latestHr(ctx),
  ]);
  const hs = hsVm.result;
  // Healthspan updates weekly: compare the shown week's pace with the stored week before it.
  const prevDay = addDays(hsVm.asOf, -7);
  const prevHs = (await loadDays(ctx, prevDay, prevDay)).get(prevDay)?.healthspan;
  const prevPace = prevHs && prevHs.reason === null ? prevHs.paceOfAging : null;
  const st = row?.stress;
  const sameDays = [7, 14, 21, 28].map((k) => rows.get(addDays(today, -k))?.stress?.highMin).filter(finite);
  const tl = fit.trainingLoad.value;
  return {
    day: today,
    healthspan: hs.value ? ok({ pulseAge: hs.value.pulseAge, deltaYears: hs.value.deltaYears, pace: hs.value.pace, paceDelta: prevPace == null ? null : hs.value.pace - prevPace }, hs.provisional) : none(hs.reason ?? "no_data", hs.nightsLeft),
    monitor: monitor.count.value
      ? ok({ vitals: monitor.vitals.map((v) => ({ key: v.key, short: v.short, status: v.status })), inRange: monitor.count.value.inRange, total: 5 })
      : none(monitor.count.reason ?? "no_data"),
    stress:
      st && st.average != null
        ? ok(
            {
              highMin: st.highMin,
              typicalHighMin: sameDays.length ? meanSd(sameDays).mean : null,
              weekday: formatDay(today, { weekday: "short" }),
              spark: minutePoints(stressSeries, dayStartOf(ctx, today), 2),
            },
            st.provisional,
          )
        : none(row?.s1?.hrCount ? "no_data" : "band_not_worn"),
    fitness: fit.vo2.value
      ? ok({ vo2max: fit.vo2.value.value, category: fit.vo2.value.category, percentile: fit.vo2.value.percentile, acwr: tl?.acwr ?? null, acwrTone: tl?.tone ?? null })
      : none("no_data"),
    heartRate,
  };
}

/** The newest stored band reading, whenever it was. */
async function latestHr(ctx: QueryCtx) {
  const r = await sampleRange(ctx.db, "hr", ctx.userId);
  return r ? (await hrMinutes(ctx, r.max, r.max + 1)).latest : null;
}

// ── Healthspan ──────────────────────────────────────────────────────────────

const HS_META: Record<string, Omit<HealthspanContributor, "metric" | "recent" | "target" | "years" | "caption" | "key" | "state" | "trendHref">> = {
  sleepHours: {
    group: "sleep",
    get label() { return tr("Hours of sleep", "Horas de sono") },
    unit: "h",
    domain: [4, 10],
    higherIsBetter: true,
    get explanation() { return tr(
      "Both short and long sleep are linked to higher mortality. Seven to eight hours a night carries the lowest risk.",
      "Tanto o sono curto quanto o longo estão ligados a maior mortalidade. Sete a oito horas por noite trazem o menor risco.",
    ) },
    source: "Cappuccio 2010",
  },
  sri: {
    group: "sleep",
    get label() { return tr("Sleep consistency", "Consistência do sono") },
    unit: "%",
    domain: [0, 100],
    higherIsBetter: true,
    get explanation() { return tr(
      "Going to bed and waking at the same times predicts a longer life even more strongly than how long you sleep.",
      "Dormir e acordar nos mesmos horários prevê uma vida mais longa ainda mais do que quanto tempo você dorme.",
    ) },
    source: "Windred 2024",
  },
  zone13: {
    group: "strain",
    get label() { return tr("Heart rate zones 1-3", "Zonas de frequência cardíaca 1-3") },
    unit: "min",
    domain: [0, 300],
    higherIsBetter: true,
    get explanation() { return tr(
      "Moderate activity is linked to steeply lower mortality, with most of the benefit in the first 150 minutes a week.",
      "A atividade moderada está ligada a uma mortalidade bem menor, com a maior parte do benefício nos primeiros 150 minutos por semana.",
    ) },
    source: "Ekelund 2019",
  },
  zone45: {
    group: "strain",
    get label() { return tr("Heart rate zones 4-5", "Zonas de frequência cardíaca 4-5") },
    unit: "min",
    domain: [0, 150],
    higherIsBetter: true,
    get explanation() { return tr(
      "Vigorous activity adds benefit on top of moderate activity. About 75 to 150 minutes a week is where it levels off.",
      "A atividade vigorosa soma benefício além da moderada. Entre 75 e 150 minutos por semana é onde ele se estabiliza.",
    ) },
    source: "Lee 2022",
  },
  strength: {
    group: "strain",
    get label() { return tr("Strength activity time", "Tempo de treino de força") },
    unit: "min",
    domain: [0, 150],
    higherIsBetter: true,
    get explanation() { return tr(
      "Muscle-strengthening work is linked to lower mortality, with the lowest risk around 40 minutes a week.",
      "O fortalecimento muscular está ligado a menor mortalidade, com o menor risco perto de 40 minutos por semana.",
    ) },
    source: "Momma 2022",
  },
  steps: {
    group: "strain",
    get label() { return tr("Daily steps", "Passos diários") },
    unit: "steps",
    domain: [0, 15000],
    higherIsBetter: true,
    get explanation() { return tr(
      "More daily steps go with lower mortality, levelling off around 8,000 to 10,000 steps a day.",
      "Mais passos por dia acompanham menor mortalidade, estabilizando em torno de 8.000 a 10.000 passos por dia.",
    ) },
    source: "Paluch 2022",
  },
  vo2max: {
    group: "fitness",
    get label() { return tr("VO2 max", "VO2 máx.") },
    unit: "ml/kg/min",
    domain: [15, 70],
    higherIsBetter: true,
    get explanation() { return tr(
      "Higher cardiorespiratory fitness is one of the strongest predictors of a longer life. Each extra 1 MET (3.5 ml/kg/min) is linked to about 13% lower all-cause mortality.",
      "Um condicionamento cardiorrespiratório maior é um dos mais fortes preditores de uma vida mais longa. Cada 1 MET extra (3,5 ml/kg/min) está ligado a cerca de 13% menos mortalidade por todas as causas.",
    ) },
    source: "Kodama 2009",
  },
  restingHr: {
    group: "fitness",
    get label() { return tr("Resting heart rate", "Frequência cardíaca de repouso") },
    unit: "bpm",
    domain: [40, 90],
    higherIsBetter: false,
    get explanation() { return tr(
      "Each 10 bpm higher resting heart rate is linked to about 9% higher all-cause mortality.",
      "Cada 10 bpm a mais na frequência cardíaca de repouso está ligado a cerca de 9% mais mortalidade por todas as causas.",
    ) },
    source: "Zhang 2016",
  },
  leanMass: {
    group: "fitness",
    get label() { return tr("Lean body mass", "Massa magra") },
    unit: "kg",
    domain: [40, 80],
    higherIsBetter: true,
    get explanation() { return tr(
      "More fat-free mass for your height is linked to lower mortality, independent of body fat.",
      "Mais massa livre de gordura para a sua altura está ligada a menor mortalidade, independentemente da gordura corporal.",
    ) },
    source: "Sedlmeier 2021",
  },
};
const HS_ORDER = ["sleepHours", "sri", "zone13", "zone45", "strength", "steps", "vo2max", "restingHr", "leanMass"];
/** Each factor's Trend View (health-whoop-age-sleep-factors's VIEW TREND). */
const HS_TREND: Record<string, TrendViewKey> = {
  sleepHours: "hours",
  sri: "consistency",
  zone13: "zones13",
  zone45: "zones45",
  strength: "strength",
  steps: "steps",
  vo2max: "vo2max",
  restingHr: "rhr",
  leanMass: "lean_mass",
};

/** Healthspan `/health/healthspan` for the ISO week containing `day` (spec §7.7). Updated weekly. */
export async function getHealthspan(day: string, ctx: QueryCtx): Promise<HealthspanVM> {
  const today = todayOf(ctx);
  const [weekStart, weekEnd] = weekOf(day);
  const [last, rows] = await Promise.all([lastStored(ctx, today), loadDays(ctx, addDays(weekEnd, -182), weekEnd)]);
  // A finished week shows its Sunday; the current week shows last Sunday until this one ends.
  const lastSunday = addDays(weekStart, -1);
  const shown = weekEnd <= last ? weekEnd : rows.get(lastSunday)?.healthspan ? lastSunday : last;
  const hs = rows.get(shown)?.healthspan;
  const h2 = ctx.profile.heightCm ? (ctx.profile.heightCm / 100) ** 2 : null;

  let result: HealthspanVM["result"];
  if (!hs) result = none("no_data");
  else if (hs.reason !== null) result = none("calibrating", Math.max(1, 20 - hs.dataDays));
  else result = ok({ pulseAge: hs.pulseAge, deltaYears: hs.deltaYears, pace: hs.paceOfAging, paceProvisional: hs.paceProvisional, vo2maxSource: hs.vo2maxSource }, hs.provisional);

  const contributions = hs && hs.reason === null ? hs.contributions : [];
  const contributors: HealthspanContributor[] = HS_ORDER.map((key) => {
    const meta = HS_META[key];
    const c = contributions.find((x) => x.key === key);
    const display = (v: number) => (key === "sri" ? Math.max(0, v) : key === "leanMass" && h2 ? v * h2 : v);
    const target = c ? display(c.reference) : 0;
    const caption =
      key === "vo2max" && hs?.reason === null && hs.vo2maxSource
        ? hs.vo2maxSource === "run"
          ? tr("From runs", "De corridas")
          : tr("Estimated: counts half", "Estimado: conta pela metade")
        : key === "leanMass" && !c
          ? tr("No lean body mass: add weight and body fat in Fitbit. Left out of Pulse Age.", "Sem massa magra: adicione peso e gordura corporal no Fitbit. Fora da Idade Pulse.")
          : undefined;
    const domain: [number, number] = key === "leanMass" && c ? [target * 0.75, target * 1.25] : meta.domain;
    return {
      key,
      ...meta,
      domain,
      metric: c ? ok(display(c.value), result.provisional) : none("no_data"),
      recent: c?.recent != null ? display(c.recent) : null,
      target,
      years: c ? c.years : null,
      state: c ? factorCopy(meta.label, c.years) : null,
      trendHref: trendHref(HS_TREND[key]),
      ...(caption && { caption }),
    };
  });

  const history = [];
  for (let k = 25; k >= 0; k--) {
    const d = addDays(weekEnd, -7 * k);
    const r = rows.get(d)?.healthspan;
    if (d <= last) history.push({ day: d, value: r && r.reason === null ? r.pulseAge : null });
  }

  return {
    day,
    weekStart,
    weekEnd,
    asOf: shown,
    nextUpdateInDays: weekEnd > last ? Math.max(0, daysBetween(today, weekEnd)) : 0,
    age: hs && hs.reason === null ? hs.age : fractionalYears(ctx.profile.birthDate, shown),
    result,
    insight: hs && hs.reason === null ? healthspanInsight(hs.paceOfAging, contributions) : null,
    history,
    contributors,
  };
}

function healthspanInsight(pace: number, cs: HealthspanContribution[]) {
  const title = pace < 0.9 ? tr("Aging slower", "Envelhecendo mais devagar") : pace > 1.1 ? tr("Aging faster", "Envelhecendo mais rápido") : tr("Steady and healthy", "Estável e saudável");
  const best = [...cs].sort((a, b) => a.years - b.years)[0];
  const worst = [...cs].sort((a, b) => b.years - a.years)[0];
  const label = (c: HealthspanContribution) => HS_META[c.key].label.toLowerCase();
  const parts = [tr(`Your Pace of Aging is ${pace.toFixed(1)}x against your 6-month average.`, `Seu Ritmo de envelhecimento é ${pace.toFixed(1).replace(".", ",")}x em relação à sua média de 6 meses.`)];
  if (best && best.years < 0) parts.push(tr(`Your biggest boost is ${label(best)}, worth ${Math.abs(best.years).toFixed(1)} years.`, `Seu maior impulso é ${label(best)}, que vale ${Math.abs(best.years).toFixed(1).replace(".", ",")} anos.`));
  if (worst && worst.years > 0) parts.push(tr(`${HS_META[worst.key].label} adds the most, ${worst.years.toFixed(1)} years.`, `${HS_META[worst.key].label} é o que mais soma, ${worst.years.toFixed(1).replace(".", ",")} anos.`));
  return { title, body: parts.join(" ") };
}

// ── Health Monitor ──────────────────────────────────────────────────────────

const VITALS: { key: VitalKey; short: string; unit: string; signed?: boolean; pick: (r: DayRow) => number | null | undefined }[] = [
  { key: "resp", get short() { return tr("Resp", "Resp") }, unit: "rpm", pick: (r) => r.metrics?.respBpm },
  { key: "spo2", short: "SpO2", unit: "%", pick: (r) => r.metrics?.spo2Pct },
  { key: "restingHr", get short() { return tr("RHR", "FC rep.") }, unit: "bpm", pick: (r) => r.metrics?.rhrBpm ?? r.sessionRhr },
  { key: "hrv", get short() { return tr("HRV", "VFC") }, unit: "ms", pick: (r) => r.metrics?.hrvMs },
  { key: "skinTempDev", get short() { return tr("Temp", "Temp.") }, unit: "°C", signed: true, pick: (r) => r.recovery?.inputs.skinTempDev },
];

const num = (v: number, dp: number, signed = false) => {
  const s = Math.abs(v).toFixed(dp);
  return signed ? `${v >= 0 ? "+" : "−"}${s}` : v < 0 ? `−${s}` : s;
};

/** Health Monitor `/health/monitor` for `day` (spec §7.8). */
export async function getMonitor(day: string, ctx: QueryCtx, preloaded?: Map<string, DayRow>): Promise<MonitorVM> {
  const today = todayOf(ctx);
  const isToday = day === today;
  const [rows, rhythm, measured] = await Promise.all([
    preloaded?.has(addDays(day, -29)) ? preloaded : loadDays(ctx, addDays(day, -29), day),
    heartRhythm(ctx, day),
    measurements(ctx, day, today),
  ]);
  const row = rows.get(day);
  const hm = row?.healthMonitor;
  const vitals: Vital[] = VITALS.map((v) => {
    const reading = hm && hm.reason === null ? hm.vitals.find((x) => x.key === v.key) : undefined;
    const value = row ? v.pick(row) : null;
    const range = reading?.range ?? null;
    const status = reading?.status ?? "no_data";
    let chip: Vital["chip"] = null;
    if (range && finite(value)) {
      // Ranges always show one decimal, so a whole-number reading never looks equal to its bound.
      const lo = num(range.low, 1, v.signed);
      const hi = num(range.high, 1, v.signed);
      if (v.key === "spo2" && status === "low" && value < 95) chip = { tone: "warning", text: tr("Below 95%", "Abaixo de 95%") };
      else if (status === "in_range") chip = { tone: "optimal", text: v.key === "spo2" ? tr(`Within ${lo} - 100`, `Dentro de ${lo} - 100`) : tr(`Within ${lo} - ${hi}`, `Dentro de ${lo} - ${hi}`) };
      else if (status === "high") chip = { tone: "warning", text: tr(`Elevated, above ${hi}`, `Elevado, acima de ${hi}`) };
      else if (status === "low") chip = { tone: "warning", text: tr(`Low, below ${lo}`, `Baixo, abaixo de ${lo}`) };
    }
    const reason = v.key === "skinTempDev" && row?.metrics?.nightlyTempC != null ? "calibrating" : vitalReason(row, isToday, v.key === "hrv");
    const tags = hm && hm.reason === null && hm.stale.includes(v.key === "restingHr" ? "rhr" : v.key === "skinTempDev" ? "skinTemp" : v.key) ? (["stale_baseline"] as const) : [];
    return {
      key: v.key,
      label: VITAL_LABEL[v.key],
      short: v.short,
      unit: v.unit,
      metric: finite(value) ? ok(value, false, [...tags]) : none(reason),
      range,
      status,
      chip,
      trend: {
        points: trendPoints(rows, day, v.pick, 30),
        baseline: range && v.key !== "spo2" ? { mean: (range.low + range.high) / 2, sd: (range.high - range.low) / 2 } : null,
      },
    };
  });

  let count: MonitorVM["count"];
  if (!hm) count = none(isToday ? "awaiting_sleep_sync" : "band_not_worn");
  else if (hm.reason !== null) count = none(nightReason(hm.reason, isToday));
  else {
    const raised = illnessRaised(hm);
    count = ok({ inRange: hm.inRange, total: 5, outOfRange: hm.flagged, status: raised ? "illness" : hm.flagged ? "out" : "within" });
  }
  return {
    day,
    isToday,
    count,
    illness: hm && hm.reason === null && illnessRaised(hm) ? { level: hm.illness.level, score: hm.illness.score } : null,
    vitals,
    heartRhythm: rhythm,
    measurements: measured,
  };
}

// ── Heart rhythm and measurements (docs/research/heart-rhythm-ui.md) ────────

type EcgCopy = Pick<EcgReading, "label" | "tone" | "explanation">;
/**
 * Google's Electrocardiogram.ResultClassification in the Google Health app's words. Only AFib takes a colour, and
 * a warning one, not red; every inconclusive state stays neutral. Unknown or unspecified codes read as "No result".
 */
export const ECG_RESULT: Record<string, EcgCopy> = {
  NORMAL_SINUS_RHYTHM: { get label() { return tr("Normal sinus rhythm", "Ritmo sinusal normal") }, tone: "optimal", get explanation() { return tr("Your heart rhythm appears normal and shows no signs of AFib.", "Seu ritmo cardíaco parece normal e não mostra sinais de FA.") } },
  ATRIAL_FIBRILLATION: {
    get label() { return tr("Atrial fibrillation", "Fibrilação atrial") },
    tone: "warning",
    get explanation() { return tr("This reading shows signs of atrial fibrillation (AFib), an irregular heart rhythm. Share it with your doctor.", "Esta leitura mostra sinais de fibrilação atrial (FA), um ritmo cardíaco irregular. Compartilhe com seu médico.") },
  },
  INCONCLUSIVE: { get label() { return tr("Inconclusive", "Inconclusivo") }, tone: "neutral", get explanation() { return tr("This reading couldn’t be classified, often because of movement, a weak signal or another rhythm.", "Esta leitura não pôde ser classificada, muitas vezes por movimento, sinal fraco ou outro ritmo.") } },
  INCONCLUSIVE_HIGH_HEART_RATE: {
    get label() { return tr("Inconclusive: high heart rate", "Inconclusivo: frequência cardíaca alta") },
    tone: "neutral",
    get explanation() { return tr("Your heart rate was over 120 bpm, too high to check your rhythm. Rest for a few minutes and try again.", "Sua frequência cardíaca estava acima de 120 bpm, alta demais para verificar o ritmo. Descanse alguns minutos e tente de novo.") },
  },
  INCONCLUSIVE_LOW_HEART_RATE: { get label() { return tr("Inconclusive: low heart rate", "Inconclusivo: frequência cardíaca baixa") }, tone: "neutral", get explanation() { return tr("Your heart rate was under 50 bpm, too low to check your rhythm.", "Sua frequência cardíaca estava abaixo de 50 bpm, baixa demais para verificar o ritmo.") } },
  UNREADABLE: { get label() { return tr("Poor recording", "Gravação ruim") }, tone: "neutral", get explanation() { return tr("The signal was too noisy to read. Try again sitting still with your arm resting on a table.", "O sinal estava ruidoso demais para ser lido. Tente de novo parado, com o braço apoiado numa mesa.") } },
  NOT_ANALYZED: { get label() { return tr("Not analyzed", "Não analisado") }, tone: "neutral", get explanation() { return tr("This recording was saved but not classified, so it has no rhythm result.", "Esta gravação foi salva, mas não classificada, então não tem resultado de ritmo.") } },
};
const NO_RESULT: EcgCopy = {
  get label() { return tr("No result", "Sem resultado") },
  tone: "neutral",
  get explanation() { return tr("No rhythm result came with this recording.", "Nenhum resultado de ritmo veio com esta gravação.") },
};

async function heartRhythm(ctx: QueryCtx, day: string): Promise<HeartRhythm> {
  const h = healthRecords;
  const all = await ctx.db
    .select({ id: h.id, kind: h.kind, ts: h.ts, day: h.day, data: h.data })
    .from(h)
    .where(and(eq(h.userId, ctx.userId), lte(h.day, day)))
    .orderBy(desc(h.ts));
  const rows = (kind: "ecg" | "irn") => all.filter((r) => r.kind === kind);
  const ecg = rows("ecg").map((r): EcgReading => {
    const d = r.data as { result?: string; avgBpm?: number | null };
    const result = d.result ?? "RESULT_CLASSIFICATION_UNSPECIFIED";
    return { id: r.id, at: ms(r.ts), day: r.day, time: wall(r.ts, ctx.timeZone).time.slice(0, 5), result, ...(ECG_RESULT[result] ?? NO_RESULT), avgBpm: finite(d.avgBpm) ? d.avgBpm : null };
  });
  const irn = rows("irn");
  return { ecg, irn: { count: irn.length, latestAt: irn[0] ? ms(irn[0].ts) : null, latestDay: irn[0]?.day ?? null } };
}

const MEASUREMENTS = [
  { key: "weight", get label() { return tr("Weight", "Peso") }, unit: "kg", format: "decimal1", col: dailyMetrics.weightKg, always: true },
  { key: "body_fat", get label() { return tr("Body fat", "Gordura corporal") }, unit: "%", format: "decimal1", col: dailyMetrics.bodyFatPct, always: true },
  { key: "glucose", get label() { return tr("Blood glucose", "Glicose no sangue") }, unit: "mg/dL", format: "int", col: "glucose", always: false },
  { key: "core_temp", get label() { return tr("Core temperature", "Temperatura corporal") }, unit: "°C", format: "decimal1", col: "core_temp", always: false },
] as const;

/** Every reading of a measurement for the user, newest first: a daily_metrics column, or a daily_values key. */
async function readings(ctx: QueryCtx, col: (typeof MEASUREMENTS)[number]["col"]): Promise<{ day: string; value: number }[]> {
  if (typeof col === "string") {
    const v = dailyValues;
    return ctx.db
      .select({ day: v.day, value: v.value })
      .from(v)
      .where(and(eq(v.userId, ctx.userId), eq(v.key, col)))
      .orderBy(desc(v.day));
  }
  const m = dailyMetrics;
  const rows = await ctx.db
    .select({ day: m.day, value: col })
    .from(m)
    .where(and(eq(m.userId, ctx.userId), isNotNull(col)))
    .orderBy(desc(m.day));
  return rows as { day: string; value: number }[];
}

async function measurements(ctx: QueryCtx, day: string, today: string): Promise<Measurement[]> {
  const all = await Promise.all(MEASUREMENTS.map((m) => readings(ctx, m.col)));
  const out: Measurement[] = [];
  for (const [i, m] of MEASUREMENTS.entries()) {
    const rs = all[i];
    if (!m.always && !rs.length) continue;
    const latest = rs.find((r) => r.day <= day);
    const prior = latest ? rs.filter((r) => r.day >= addDays(latest.day, -30) && r.day < latest.day).map((r) => r.value) : [];
    const { mean, sd } = meanSd(prior);
    out.push({
      key: m.key,
      label: m.label,
      unit: m.unit,
      format: m.format,
      metric: latest ? ok(latest.value) : none("no_data"),
      average: mean,
      sd,
      direction: "neutral",
      caption: latest ? dayLabel(latest.day, today) : undefined,
    });
  }
  return out;
}

// ── Stress Monitor ──────────────────────────────────────────────────────────

/** Stress Monitor `/health/stress` for `day` (spec §7.9). */
export async function getStress(day: string, ctx: QueryCtx): Promise<StressVM> {
  const today = todayOf(ctx);
  const isToday = day === today;
  const [rows, series, exs] = await Promise.all([loadDays(ctx, addDays(day, -29), day), loadSeries(ctx, day, "stress"), exercisesBetween(ctx, day, day)]);
  const row = rows.get(day);
  const st = row?.stress;
  const gauge = stressNow(row, isToday);
  const sameStress = [7, 14, 21, 28].map((k) => rows.get(addDays(day, -k))?.stress).filter((x) => !!x && x.average != null);
  const typicalOf = (pick: (x: NonNullable<DayRow["stress"]>) => number) => meanSd(sameStress.map((x) => pick(x!))).mean ?? 0;
  const typical = sameStress.length ? typicalOf((x) => x.highMin) : null;

  const scored = st && st.average != null;
  const chart = stressChartOf(ctx, row, day, isToday, series, exs);

  return {
    day,
    isToday,
    gauge,
    insight: scored ? stressInsight(st, ctx.timeZone) : null,
    chart,
    levels: scored
      ? ok(
          {
            lowMin: st.lowMin,
            mediumMin: st.mediumMin,
            highMin: st.highMin,
            typicalDeltaMin: typical == null ? null : st.highMin - typical,
            weekday: formatDay(day, { weekday: "long" }),
            typical: sameStress.length ? { lowMin: typicalOf((x) => x.lowMin), mediumMin: typicalOf((x) => x.mediumMin), highMin: typical! } : null,
          },
          st.provisional,
        )
      : none(chart.reason ?? "no_data"),
    trend: {
      points: trendPoints(rows, day, (r) => r.stress?.average, 30),
    },
  };
}

function stressInsight(st: NonNullable<DayRow["stress"]>, tz: string) {
  const total = st.lowMin + st.mediumMin + st.highMin;
  const top = st.lowMin >= st.mediumMin && st.lowMin >= st.highMin ? "low" : st.mediumMin >= st.highMin ? "medium" : "high";
  const lead = tr(`Most of your time was in ${top} stress.`, `Na maior parte do tempo seu estresse foi ${{ low: "baixo", medium: "médio", high: "alto" }[top]}.`);
  if (!total) return null;
  if (st.longestHigh && st.longestHigh.minutes >= 10) {
    const at = wall(st.longestHigh.start, tz).time.slice(0, 5);
    return tr(`${lead} Your longest high-stress stretch started at ${at} and lasted ${st.longestHigh.minutes} minutes.`, `${lead} Seu período mais longo de estresse alto começou às ${at} e durou ${st.longestHigh.minutes} minutos.`);
  }
  return tr(`${lead} You had no long stretch of high stress.`, `${lead} Você não teve nenhum período longo de estresse alto.`);
}

// ── Fitness ─────────────────────────────────────────────────────────────────

const ACWR_STATUS = { neutral: "detraining", optimal: "optimal", warning: "pushing", alert: "high_risk" } as const satisfies Record<ChipTone, string>;
export const acwrStatus = (acwr: number) => {
  const tone = acwrTone(acwr);
  return { status: ACWR_STATUS[tone], tone };
};

/** Fitness `/health/fitness`: latest values (spec §7.10). */
export async function getFitness(ctx: QueryCtx): Promise<FitnessVM> {
  const today = todayOf(ctx);
  const last = await lastStored(ctx, today);
  const rows = await loadDays(ctx, addDays(last, -181), last);
  const row = rows.get(last);
  const f = row?.fitness;
  const decade = (age: number) => {
    const lo = Math.min(70, Math.max(20, Math.floor(age / 10) * 10));
    return `${lo}-${lo + 9}`;
  };
  const vo2: FitnessVM["vo2"] =
    f && f.reason === null
      ? ok({ value: f.vo2max, source: f.source, sourceDay: f.sourceDay, percentile: f.percentile, category: f.category, ageBand: decade(f.age), sex: ctx.profile.sex }, f.source === "daily")
      : none("no_data");
  const tl = row?.trainingLoad;
  const effortDays = [...rows.values()].filter((r) => r.s1?.effort != null).length;
  const trainingLoad: Metric<NonNullable<FitnessVM["trainingLoad"]["value"]>> =
    tl?.acwr != null ? ok({ acwr: tl.acwr, ...acwrStatus(tl.acwr) }) : none("calibrating", Math.max(1, minChronic - effortDays));
  const load = Array.from({ length: 90 }, (_, k) => {
    const d = addDays(last, k - 89);
    const t = rows.get(d)?.trainingLoad;
    return { day: d, ctl: t?.ctl ?? null, atl: t?.atl ?? null, tsb: t?.tsb ?? null };
  });
  return {
    vo2,
    trend: {
      points: trendPoints(rows, last, (r) => r.metrics?.vo2maxRun ?? r.metrics?.vo2maxDaily),
    },
    trainingLoad,
    load,
    loadReason: load.some((p) => p.ctl != null) ? null : { reason: "calibrating", nightsLeft: Math.max(1, standardConfig.minimumDays - (tl?.contiguousDays ?? 0)) },
  };
}

// ── Heart rate ──────────────────────────────────────────────────────────────

/**
 * The band's heart rate over [from, to) unix seconds (minute-aligned) as minute means, a null for a minute without a
 * sample so the chart leaves a gap, plus the newest raw sample in the range.
 */
export async function hrMinutes(ctx: QueryCtx, from: number, to: number): Promise<HeartRateLive> {
  const hr = await readHr(ctx.db, ctx.userId, from, to);
  const last = hr.at(-1);
  return {
    points: minuteMeanHr(hr, from, to).map((v, m) => ({ t: ms(from + m * 60), v: v === null ? null : Math.round(v) })),
    latest: last ? { t: ms(last.ts), bpm: last.bpm } : null,
  };
}

/** Heart rate `/health/heart-rate?d=`: the day's minutes (today up to now), resting heart rate and time in zones. */
export async function getHeartRate(day: string, ctx: QueryCtx): Promise<HeartRateVM> {
  const isToday = day === todayOf(ctx);
  const start = localMidnight(day, ctx.timeZone);
  const end = localMidnight(addDays(day, 1), ctx.timeZone);
  const to = isToday ? Math.min(end, Math.floor(ctx.now / 60) * 60 + 60) : end;
  const [hr, rows] = await Promise.all([hrMinutes(ctx, start, to), loadDays(ctx, day, day)]);
  const row = rows.get(day);
  return {
    day,
    isToday,
    end: ms(end),
    ...hr,
    restingHr: row?.metrics?.rhrBpm ?? null,
    zoneBands: row?.s1 ? zoneBounds(row.s1.zoneLower) : [],
    maxHr: row?.s1?.maxHr ?? ctx.profile.maxHr,
    zones: zoneRows(row),
    zoneNote: zoneNote(row, ctx),
  };
}
