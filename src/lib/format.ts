import type { DeltaDir, Tone } from "./bands";
import { formatLocale, isPt, tr } from "./locale-context";

// Number, date and spoken-label formatting (spec §3.3, §6). Formatters are referenced by key so a
// server component can hand them to a client component (functions do not cross that boundary).

/** The product name for the Healthspan age. Swap to "Pulse Age" here if preferred (spec §11). */
export const ageLabel = () => tr("Pulse Age", "Idade Pulse");
export const MISSING = "--";
const MINUS = "−";

/**
 * The locale every Intl formatter uses (spec §6): the interface language the person chose in Settings, never the
 * browser's, so server and client render the same strings (no hydration mismatch). See locale-context.ts.
 */
export const locale = formatLocale;
/** Joins a number to its unit or word so the pair never wraps apart: `10${NBSP}MB`. */
export const NBSP = " ";

const groupers = new Map<string, Intl.NumberFormat>();
const grouped = (v: number) => {
  const tag = formatLocale();
  let f = groupers.get(tag);
  if (!f) groupers.set(tag, (f = new Intl.NumberFormat(tag, { maximumFractionDigits: 0 })));
  return f.format(v);
};
const minus = (s: string) => s.replace("-", MINUS);
/** Brazilian Portuguese writes the decimal mark as a comma: "7,5". */
const decimal = (s: string) => (isPt() ? s.replace(".", ",") : s);
// "-0.0" collapses to "0.0"; the hyphen becomes a real minus sign.
const fixed = (v: number, d: number) => {
  const s = v.toFixed(d);
  return decimal(minus(/^-0(\.0+)?$/.test(s) ? s.slice(1) : s));
};
const signed = (v: number, d: number) => (Number(v.toFixed(d)) > 0 ? `+${fixed(v, d)}` : fixed(v, d));
const pad = (n: number) => String(n).padStart(2, "0");

/** Minutes → "7:42". */
export function hmm(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  return `${Math.floor(m / 60)}:${pad(m % 60)}`;
}

export const FORMATS = {
  int: (v: number) => fixed(v, 0),
  grouped: (v: number) => minus(grouped(Math.round(v))),
  decimal1: (v: number) => fixed(v, 1),
  decimal2: (v: number) => fixed(v, 2),
  signed1: (v: number) => signed(v, 1),
  signedInt: (v: number) => signed(v, 0),
  /** Minutes → h:mm. */
  duration: hmm,
  /** Seconds (per km) → m:ss, the pace "5:32". */
  pace: (s: number) => {
    const t = Math.max(0, Math.round(s));
    return `${Math.floor(t / 60)}:${pad(t % 60)}`;
  },
  /** Seconds → h:mm:ss. */
  durationHMS: (s: number) => {
    const t = Math.max(0, Math.round(s));
    return `${Math.floor(t / 3600)}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`;
  },
} satisfies Record<string, (v: number) => string>;
export type FormatKey = keyof typeof FORMATS;

/** Formats a value by key; null, undefined and non-finite numbers render as "--". */
export function formatValue(key: FormatKey, v: number | null | undefined): string {
  return v === null || v === undefined || !Number.isFinite(v) ? MISSING : FORMATS[key](v);
}

/** Symbol units sit tight against the value (`ml-0.5`); word units get a gap (`ml-1`). */
export const isSymbolUnit = (unit: string) => unit === "%" || unit === "x";

// --- Words ---
// The few words this file speaks itself ("Today", "12 minutes ago", aria sentences). Everything else is a message in
// messages/<locale>.json; these live here because the functions are plain code with no access to React.

type Words = {
  today: string;
  yesterday: string;
  justNow: string;
  now: string;
  minute: [string, string];
  hour: [string, string];
  day: [string, string];
  ago: (span: string) => string;
  minus: string;
  unavailable: string;
  noData: string;
  provisional: string;
  of21: string;
  soFar: string;
  target: (a: string, b: string) => string;
  above: string;
  below: string;
  inLine: string;
  average: string;
  of: string;
  good: string;
  worse: string;
  units: Record<string, string>;
};

const EN: Words = {
  today: "Today",
  yesterday: "Yesterday",
  justNow: "just now",
  now: "Now",
  minute: ["minute", "minutes"],
  hour: ["hour", "hours"],
  day: ["day", "days"],
  ago: (span) => `${span} ago`,
  minus: "minus ",
  unavailable: "unavailable",
  noData: "no data",
  provisional: "provisional",
  of21: "of 21",
  soFar: "so far",
  target: (a, b) => `target ${a} to ${b}`,
  above: "above your",
  below: "below your",
  inLine: "in line with your",
  average: "30-day average",
  of: "of",
  good: "good",
  worse: "worse than usual",
  units: {
    "%": "percent",
    ms: "milliseconds",
    bpm: "beats per minute",
    rpm: "breaths per minute",
    "°C": "degrees",
    kcal: "calories",
    "ml/kg/min": "millilitres per kilo per minute",
    x: "times",
    min: "minutes",
    h: "hours",
    km: "kilometres",
    "/km": "per kilometre",
  },
};

const PT: Words = {
  today: "Hoje",
  yesterday: "Ontem",
  justNow: "agora mesmo",
  now: "Agora",
  minute: ["minuto", "minutos"],
  hour: ["hora", "horas"],
  day: ["dia", "dias"],
  ago: (span) => `há ${span}`,
  minus: "menos ",
  unavailable: "indisponível",
  noData: "sem dados",
  provisional: "provisório",
  of21: "de 21",
  soFar: "até agora",
  target: (a, b) => `meta de ${a} a ${b}`,
  above: "acima da sua",
  below: "abaixo da sua",
  inLine: "em linha com a sua",
  average: "média de 30 dias",
  of: "de",
  good: "bom",
  worse: "pior que o habitual",
  units: {
    "%": "por cento",
    ms: "milissegundos",
    bpm: "batimentos por minuto",
    rpm: "respirações por minuto",
    "°C": "graus",
    kcal: "calorias",
    "ml/kg/min": "mililitros por quilo por minuto",
    x: "vezes",
    min: "minutos",
    h: "horas",
    km: "quilômetros",
    "/km": "por quilômetro",
  },
};

const words = (): Words => (isPt() ? PT : EN);
/** "1 hour", "2 hours": a number and its unit, kept together. */
const counted = (n: number, w: [string, string]) => `${n}${NBSP}${w[n === 1 ? 0 : 1]}`;

// --- Dates and clock times ---

const dates = new Map<string, Intl.DateTimeFormat>();
/**
 * A calendar day ("2026-09-28", or a month "2026-09") through Intl.DateTimeFormat in the interface language: formatDay(day, DAY.short)
 * → "Mon, Sep 28". Read and formatted in UTC, so the runtime's zone never shifts the day.
 */
export function formatDay(day: string, opts: Intl.DateTimeFormatOptions) {
  const tag = formatLocale();
  const key = `${tag}\0${JSON.stringify(opts)}`;
  let f = dates.get(key);
  if (!f) dates.set(key, (f = new Intl.DateTimeFormat(tag, { ...opts, timeZone: "UTC" })));
  return f.format(new Date(`${day.length === 7 ? `${day}-01` : day}T00:00:00Z`));
}

/** The app's date shapes (spec §6) as Intl options for formatDay. */
export const DAY = {
  /** "Mon, Sep 28" */
  short: { weekday: "short", month: "short", day: "numeric" },
  /** "Monday, September 28", for spoken labels */
  long: { weekday: "long", month: "long", day: "numeric" },
  /** "Sep 28" */
  monthDay: { month: "short", day: "numeric" },
  /** "Sep 28, 1990" */
  full: { month: "short", day: "numeric", year: "numeric" },
  /** "September 2026" */
  monthYear: { month: "long", year: "numeric" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

/** "Today", "Yesterday", else "Mon, Sep 28". Dates are YYYY-MM-DD in the user's zone. */
export function dayLabel(date: string, today: string) {
  if (date === today) return words().today;
  const y = new Date(`${today}T00:00:00Z`);
  y.setUTCDate(y.getUTCDate() - 1);
  if (date === y.toISOString().slice(0, 10)) return words().yesterday;
  return formatDay(date, DAY.short);
}

/** The date pill's label: "Today", "Yesterday", else "Mon., Sep. 28", abbreviations marked with a period as the
 * reference app prints them ("TUE., APR. 14", home-past-day-activities-top); a month short enough to need none stays bare ("May 4"). */
export function pillLabel(date: string, today: string) {
  const label = dayLabel(date, today);
  if (label === words().today || label === words().yesterday) return label;
  // Portuguese abbreviations already carry their period ("seg.", "set."): "seg., 28 de set."
  if (isPt()) return formatDay(date, DAY.short);
  const month = formatDay(date, { month: "short" });
  const dot = month === formatDay(date, { month: "long" }) ? "" : ".";
  return `${formatDay(date, { weekday: "short" })}., ${month}${dot} ${formatDay(date, { day: "numeric" })}`;
}

/** "Sep 22 - Sep 28". */
export const rangeLabel = (from: string, to: string) => `${formatDay(from, DAY.monthDay)} - ${formatDay(to, DAY.monthDay)}`;

/** 24-hour "22:30", or 12-hour "10:30 PM". Display only. */
export type TimeFormat = "24" | "12";

const clocks = new Map<string, Intl.DateTimeFormat>();
/** Epoch ms → "HH:mm" or "h:mm AM/PM" in `timeZone` (default: the runtime zone). `format` defaults to 24-hour. */
export function clock(ms: number, timeZone?: string, format: TimeFormat = "24") {
  const tag = formatLocale();
  const key = `${tag}\0${timeZone ?? ""}\0${format}`;
  let f = clocks.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(tag, {
      hour: format === "12" ? "numeric" : "2-digit",
      minute: "2-digit",
      hourCycle: format === "12" ? "h12" : "h23",
      timeZone,
    });
    clocks.set(key, f);
  }
  return f.format(ms);
}

/** "38 minutes", "1 hour 12 minutes". */
export function durationWords(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  const w = words();
  if (!h) return counted(r, w.minute);
  return r ? `${counted(h, w.hour)} ${counted(r, w.minute)}` : counted(h, w.hour);
}

/** Relative age of a timestamp: "12 minutes ago", "3 hours ago". */
export function ago(ms: number, now: number) {
  const min = Math.max(0, Math.round((now - ms) / 60000));
  const w = words();
  if (min < 1) return w.justNow;
  if (min < 60) return w.ago(counted(min, w.minute));
  const h = Math.round(min / 60);
  if (h < 48) return w.ago(counted(h, w.hour));
  return w.ago(counted(Math.round(h / 24), w.day));
}

/** Header sync age, the reference app's battery slot (spec §4.3.2): "Now", "12m", "3h", "2d". */
export function agoShort(ms: number, now: number) {
  const min = Math.max(0, Math.floor((now - ms) / 60000));
  if (min < 1) return words().now;
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return h < 48 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

// --- Spoken labels (aria) ---

/** "124 milliseconds", "−0.4 degrees" → reads the minus sign as "minus". */
export function spoken(value: string, unit?: string) {
  const w = words();
  const v = value.replace(MINUS, w.minus);
  if (!unit) return v;
  return `${v} ${w.units[unit] ?? unit}`;
}

export type DialAria = {
  variant: "recovery" | "strain" | "sleep" | "stat" | "gauge";
  label: string;
  value?: number | null;
  valueText?: string;
  unit?: string;
  provisional?: boolean;
  reason?: string | null;
  reasonText?: string;
  bandWord?: string;
  target?: readonly [number, number] | null;
  soFar?: boolean;
};

/** "Recovery 72 percent, green", "Strain 9.4 of 21 so far, target 12.0 to 15.0", "Recovery unavailable: calibrating, 4 nights left". */
export function dialAriaLabel(a: DialAria) {
  const w = words();
  if (a.value === null || a.value === undefined) {
    const why = (a.reasonText ?? w.noData).replace(/^(\w)/, (c) => c.toLowerCase()).replace(": ", ", ");
    return `${a.label} ${w.unavailable}: ${why}`;
  }
  const v = spoken(a.valueText ?? String(a.value), a.unit);
  const prov = a.provisional ? ` ${w.provisional},` : "";
  if (a.variant === "strain") {
    const t = a.target ? `, ${w.target(decimal(a.target[0].toFixed(1)), decimal(a.target[1].toFixed(1)))}` : "";
    return `${a.label}${prov} ${v} ${w.of21}${a.soFar ? ` ${w.soFar}` : ""}${t}`;
  }
  const word = a.bandWord ? `, ${a.bandWord.toLowerCase()}` : "";
  return `${a.label}${prov} ${v}${word}`;
}

const toneWord = (tone: Tone) => (tone === "good" ? `, ${words().good}` : tone === "bad" ? `, ${words().worse}` : "");

/** "Heart rate variability 124 milliseconds, above your 30-day average of 98, good". */
export function statSentence(o: {
  label: string;
  valueText: string;
  unit?: string;
  averageText?: string;
  averageLabel?: string;
  dir?: DeltaDir;
  tone?: Tone;
}) {
  let s = `${o.label} ${spoken(o.valueText, o.unit)}`;
  if (o.averageText && o.averageText !== MISSING) {
    const w = words();
    const rel = o.dir === "up" ? w.above : o.dir === "down" ? w.below : w.inLine;
    s += `, ${rel} ${o.averageLabel ?? w.average} ${w.of} ${o.averageText}`;
    if (o.tone) s += toneWord(o.tone);
  }
  return s;
}
