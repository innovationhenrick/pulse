import { Activity, HeartPulse, Hourglass, RefreshCw, Watch, type LucideIcon } from "lucide-react";
import { lazy, tr } from "./locale-context";

// The single source of reason copy (spec §5.14) and the metric shape every view model uses (§4.8).

export const REASON_CODES = [
  "calibrating",
  "no_hrv_last_night",
  "awaiting_sleep_sync",
  "insufficient_hr_data",
  "band_not_worn",
  "no_data",
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export type MetricTag = "stale_baseline" | "updated";

/** One nullable metric in a view model. `undefined` (the whole metric) means still loading. */
export type Metric<T> = {
  value: T | null;
  reason: ReasonCode | null;
  provisional: boolean;
  tags?: MetricTag[];
  /** For `calibrating`. */
  nightsLeft?: number;
};

type ReasonEntry = { icon: LucideIcon | null; short: string; long: (nightsLeft?: number) => string };

export const REASONS: Record<ReasonCode, ReasonEntry> = lazy(() => ({
  calibrating: {
    icon: Hourglass,
    short: tr("Calibrating", "Calibrando"),
    long: (n?: number) =>
      n === undefined
        ? tr("Calibrating", "Calibrando")
        : tr(`Calibrating: ${n} ${n === 1 ? "night" : "nights"} left`, `Calibrando: ${n === 1 ? "falta 1 noite" : `faltam ${n} noites`}`),
  },
  no_hrv_last_night: {
    icon: HeartPulse,
    short: tr("No HRV last night", "Sem VFC na noite passada"),
    long: () => tr("No HRV last night (needs about 3 h of sleep)", "Sem VFC na noite passada (precisa de cerca de 3 h de sono)"),
  },
  awaiting_sleep_sync: {
    icon: RefreshCw,
    short: tr("Waiting for sleep", "Aguardando o sono"),
    long: () => tr("Waiting for last night’s sleep to sync", "Aguardando a sincronização do sono de ontem à noite"),
  },
  insufficient_hr_data: {
    icon: Activity,
    short: tr("Not enough data", "Dados insuficientes"),
    long: () => tr("Not enough heart-rate data", "Dados de frequência cardíaca insuficientes"),
  },
  band_not_worn: { icon: Watch, short: tr("Not worn", "Não usada"), long: () => tr("No data: band not worn", "Sem dados: pulseira não usada") },
  no_data: { icon: null, short: "--", long: () => tr("No data", "Sem dados") },
}));

/** Any unknown or missing code falls back to `no_data`. */
export function normalizeReason(code: string | null | undefined): ReasonCode {
  return (REASON_CODES as readonly string[]).includes(code ?? "") ? (code as ReasonCode) : "no_data";
}

export function reasonCopy(code: string | null | undefined, nightsLeft?: number) {
  const key = normalizeReason(code);
  const r = REASONS[key];
  return { code: key, icon: r.icon, short: r.short, long: r.long(nightsLeft) };
}

/** Tags shown next to a number, with the explanation used in tooltips and info sheets. */
export const TAG_COPY = lazy(() => ({
  provisional: {
    label: tr("Provisional", "Provisório"),
    explain: tr("Based on fewer than 14 nights. It firms up as your baseline fills in.", "Baseado em menos de 14 noites. Fica mais firme conforme sua linha de base se completa."),
  },
  stale_baseline: {
    label: tr("Baseline stale", "Base desatualizada"),
    explain: tr("Your baseline has 14 nights or more missing. Scores firm up as new nights arrive.", "Faltam 14 noites ou mais na sua linha de base. Os scores se firmam conforme chegam novas noites."),
  },
  updated: { label: tr("Updated", "Atualizado"), explain: tr("Updated after a late sync added data.", "Atualizado depois que uma sincronização tardia trouxe dados.") },
}));
