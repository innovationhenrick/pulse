// What Pulse can log to Google Health (spec §11 LG1): the Google data types, the write scope each needs, and the
// choices the log sheets offer. Shared by the sheets, the log actions and the Google writer.
import { formatLocale, lazy, tr } from "./locale-context"

/** Google data types Pulse writes. Moods, symptoms, periods and ovulation tests are write-only at Google. */
export const LOG_TYPES = ["hydration-log", "nutrition-log", "weight", "body-fat", "moods", "symptoms", "menstrual-period", "ovulation-test"] as const
export type LogType = (typeof LOG_TYPES)[number]

/** The `googlehealth.<x>.writeonly` scope each type needs. Grants made before 2026-10 have only nutrition's. */
export const WRITE_SCOPE: Record<LogType, string> = {
  "hydration-log": "nutrition",
  "nutrition-log": "nutrition",
  weight: "health_metrics_and_measurements",
  "body-fat": "health_metrics_and_measurements",
  moods: "mindfulness",
  symptoms: "logged_symptoms",
  "menstrual-period": "reproductive_health",
  "ovulation-test": "reproductive_health",
}

/** The action error a log sheet turns into its Reconnect Google call to action. */
export const RECONNECT = "reconnect"

export const scopeUrl = (type: LogType) => `https://www.googleapis.com/auth/googlehealth.${WRITE_SCOPE[type]}.writeonly`

/** Types Google lets Pulse read back: the sync brings them home, so totals come from the sync, not this log. */
export const READABLE: ReadonlySet<LogType> = new Set(["hydration-log", "nutrition-log", "weight", "body-fat"])

/** Google's `dataSource.platform` values as people know them; anything else is shown title-cased. */
const APPS = (): Record<string, string> => ({ FITBIT: "Fitbit", HEALTH_CONNECT: "Health Connect", GOOGLE_WEB_API: tr("Another app", "Outro app") })

/** Where an entry was logged: Pulse, or the app Google names for it. */
export function appLabel(source: string, app: string | null): string {
  if (source === "pulse") return "Pulse"
  if (!app) return tr("Another app", "Outro app")
  return APPS()[app] ?? app.charAt(0) + app.slice(1).toLowerCase().replaceAll("_", " ")
}

/** The sync brings other apps' entries home for this many local days (Journal lists them for those days only). */
export const LOG_DAYS = 14

/** Cycle tracking: never offered, shown or accepted on a male profile. */
export const CYCLE: ReadonlySet<LogType> = new Set(["menstrual-period", "ovulation-test"])

/** One sheet per kind; Weight writes weight and, when given, body fat. */
export const LOG_KINDS = ["water", "food", "weight", "mood", "symptoms", "period", "ovulation"] as const
export type LogKind = (typeof LOG_KINDS)[number]
export const KIND_TYPES: Record<LogKind, LogType[]> = {
  water: ["hydration-log"],
  food: ["nutrition-log"],
  weight: ["weight", "body-fat"],
  mood: ["moods"],
  symptoms: ["symptoms"],
  period: ["menstrual-period"],
  ovulation: ["ovulation-test"],
}
export const KIND_LABEL: Record<LogKind, string> = lazy(() => ({
  water: tr("Water", "Água"),
  food: tr("Food", "Comida"),
  weight: tr("Weight", "Peso"),
  mood: tr("Mood", "Humor"),
  symptoms: tr("Symptoms", "Sintomas"),
  period: tr("Period", "Menstruação"),
  ovulation: tr("Ovulation test", "Teste de ovulação"),
}))
export const isCycleKind = (k: LogKind) => k === "period" || k === "ovulation"

/** The coach's log tools (src/server/coach/logTools.ts), one per kind; each waits for the user's approval. */
export const LOG_TOOLS = ["log_water", "log_food", "log_weight", "log_mood", "log_symptoms", "log_period", "log_ovulation"] as const
export type LogToolName = (typeof LOG_TOOLS)[number]
export const isLogTool = (name: string): name is LogToolName => (LOG_TOOLS as readonly string[]).includes(name)

export const WATER_STEPS = [250, 500] as const

export const MEALS = lazy(() => [
  ["BREAKFAST", tr("Breakfast", "Café da manhã")],
  ["LUNCH", tr("Lunch", "Almoço")],
  ["DINNER", tr("Dinner", "Jantar")],
  ["SNACK", tr("Snack", "Lanche")],
] as const)
export type Meal = (typeof MEALS)[number][0]

/** Google's valence enum, in the order the sheet shows it. */
export const VALENCES = lazy(() => [
  ["UNPLEASANT", tr("Unpleasant", "Desagradável")],
  ["BASELINE", tr("Neutral", "Neutro")],
  ["PLEASANT", tr("Pleasant", "Agradável")],
] as const)
export type Valence = (typeof VALENCES)[number][0]

/** A short list from Google's 70-odd moods: the ones a daily log reaches for. No NEUTRAL: the valence row has it. */
export const MOODS = lazy(() => [
  ["HAPPY", tr("Happy", "Feliz")],
  ["CALM", tr("Calm", "Calmo")],
  ["ENERGIZED", tr("Energized", "Com energia")],
  ["CONTENT", tr("Content", "Contente")],
  ["GRATEFUL", tr("Grateful", "Grato")],
  ["EXCITED", tr("Excited", "Animado")],
  ["FATIGUED", tr("Tired", "Cansado")],
  ["STRESSED", tr("Stressed", "Estressado")],
  ["ANXIOUS", tr("Anxious", "Ansioso")],
  ["IRRITATED", tr("Irritated", "Irritado")],
  ["SAD", tr("Sad", "Triste")],
  ["OVERWHELMED", tr("Overwhelmed", "Sobrecarregado")],
  ["LONELY", tr("Lonely", "Solitário")],
] as const)
export type Mood = (typeof MOODS)[number][0]

/** A short list from Google's symptom enum. `cycle` ones show on female profiles only. */
export const SYMPTOMS = lazy(() => [
  ["HEADACHE", tr("Headache", "Dor de cabeça"), false],
  ["FATIGUE", tr("Fatigue", "Fadiga"), false],
  ["SICK", tr("Feeling sick", "Mal-estar"), false],
  ["FEVER", tr("Fever", "Febre"), false],
  ["COUGH", tr("Cough", "Tosse"), false],
  ["NAUSEA", tr("Nausea", "Náusea"), false],
  ["DIZZINESS", tr("Dizziness", "Tontura"), false],
  ["BRAIN_FOG", tr("Brain fog", "Névoa mental"), false],
  ["BACK_PAIN", tr("Back pain", "Dor nas costas"), false],
  ["JOINT_PAIN", tr("Joint pain", "Dor nas articulações"), false],
  ["INSOMNIA", tr("Insomnia", "Insônia"), false],
  ["HEARTBURN", tr("Heartburn", "Azia"), false],
  ["BLOATED", tr("Bloating", "Inchaço"), false],
  ["DIARRHEA", tr("Diarrhea", "Diarreia"), false],
  ["CONSTIPATION", tr("Constipation", "Prisão de ventre"), false],
  ["CRAMPS", tr("Cramps", "Cólicas"), true],
  ["TENDER_BREASTS", tr("Tender breasts", "Seios sensíveis"), true],
  ["PMS", tr("PMS", "TPM"), true],
  ["ACNE", tr("Acne", "Acne"), true],
  ["HOT_FLASHES", tr("Hot flashes", "Ondas de calor"), true],
] as const)
export type Symptom = (typeof SYMPTOMS)[number][0]
export const CYCLE_SYMPTOMS: ReadonlySet<string> = new Set(SYMPTOMS.filter((s) => s[2]).map((s) => s[0]))

/** Google records period flow nowhere but free-text notes, so Pulse keeps it locally and writes it into `notes`. */
export const FLOWS = lazy(() => [
  ["SPOTTING", tr("Spotting", "Escape")],
  ["LIGHT", tr("Light", "Leve")],
  ["MEDIUM", tr("Medium", "Médio")],
  ["HEAVY", tr("Heavy", "Intenso")],
] as const)
export type Flow = (typeof FLOWS)[number][0]

export const OVULATION_RESULTS = lazy(() => [
  ["NEGATIVE", tr("Negative", "Negativo")],
  ["POSITIVE", tr("Positive", "Positivo")],
  ["LUTEINIZING_HORMONE_SURGE", tr("LH surge", "Pico de LH")],
  ["ESTROGEN_SURGE", tr("Estrogen surge", "Pico de estrogênio")],
  ["INDETERMINATE", tr("Unclear", "Indefinido")],
] as const)
export type OvulationResult = (typeof OVULATION_RESULTS)[number][0]

const labelOf = (list: readonly (readonly [string, string, ...unknown[]])[], v: string) => list.find((x) => x[0] === v)?.[1] ?? v

/** What a logged entry's `data` holds, per type. Moods and symptoms keep Google's enum values, for Behaviour Insights later. */
export type LogData = {
  "hydration-log": { ml: number }
  "nutrition-log": { name: string | null; meal: Meal; kcal: number; protein: number | null; carbs: number | null; fat: number | null }
  weight: { kg: number }
  "body-fat": { pct: number }
  moods: { moods: Mood[]; valence: Valence | null }
  symptoms: { symptoms: Symptom[] }
  "menstrual-period": { start: string; end: string; flow: Flow | null }
  "ovulation-test": { result: OvulationResult }
}

/** One line for the recent-log list. */
export function describeEntry(type: LogType, data: unknown): { title: string; detail: string } {
  const n = (v: number) => v.toLocaleString(formatLocale())
  switch (type) {
    case "hydration-log":
      return { title: tr("Water", "Água"), detail: `${n((data as LogData[typeof type]).ml)} ml` }
    case "nutrition-log": {
      const f = data as LogData[typeof type]
      const macros = [f.protein != null && tr(`${f.protein} g protein`, `${f.protein} g de proteína`), f.carbs != null && tr(`${f.carbs} g carbs`, `${f.carbs} g de carboidratos`), f.fat != null && tr(`${f.fat} g fat`, `${f.fat} g de gordura`)]
      return { title: f.name ?? labelOf(MEALS, f.meal), detail: [`${n(f.kcal)} kcal`, ...macros].filter(Boolean).join(", ") }
    }
    case "weight":
      return { title: tr("Weight", "Peso"), detail: `${(data as LogData[typeof type]).kg} kg` }
    case "body-fat":
      return { title: tr("Body fat", "Gordura corporal"), detail: `${(data as LogData[typeof type]).pct}%` }
    case "moods": {
      const m = data as LogData[typeof type]
      return { title: tr("Mood", "Humor"), detail: [m.valence && labelOf(VALENCES, m.valence), ...m.moods.map((x) => labelOf(MOODS, x))].filter(Boolean).join(", ") }
    }
    case "symptoms":
      return { title: tr("Symptoms", "Sintomas"), detail: (data as LogData[typeof type]).symptoms.map((x) => labelOf(SYMPTOMS, x)).join(", ") }
    case "menstrual-period": {
      const p = data as LogData[typeof type]
      const days = Math.round((Date.parse(p.end) - Date.parse(p.start)) / 86_400_000) + 1
      return { title: tr("Period", "Menstruação"), detail: [tr(`${days} ${days === 1 ? "day" : "days"}`, `${days} ${days === 1 ? "dia" : "dias"}`), p.flow && tr(`${labelOf(FLOWS, p.flow).toLowerCase()} flow`, `fluxo ${labelOf(FLOWS, p.flow).toLowerCase()}`)].filter(Boolean).join(", ") }
    }
    case "ovulation-test":
      return { title: tr("Ovulation test", "Teste de ovulação"), detail: labelOf(OVULATION_RESULTS, (data as LogData[typeof type]).result) }
  }
}
