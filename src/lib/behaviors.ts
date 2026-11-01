// The journal's behaviour catalogue (journal-behavior-picker-*): every behaviour a person can add to the daily journal, with the
// sentence the journal asks, its Select Behaviors category and the journal section it sits in. Keys are stored in
// journal_tags and journal_entries; never rename one. The nine defaults keep their original keys.
import { isPt, tr } from "./locale-context"

export const BEHAVIOR_CATEGORIES = [
  { key: "drugs", get label() { return tr("Drugs & medication", "Medicamentos") } },
  { key: "health", get label() { return tr("Health & symptoms", "Saúde e sintomas") } },
  { key: "personal", get label() { return tr("Personal health", "Saúde pessoal") } },
  { key: "lifestyle", get label() { return tr("Lifestyle", "Estilo de vida") } },
  { key: "mental", get label() { return tr("Mental wellbeing", "Bem-estar mental") } },
  { key: "nutrition", get label() { return tr("Nutrition", "Nutrição") } },
  { key: "recovery", get label() { return tr("Recovery", "Recuperação") } },
] as const
export type BehaviorCategory = (typeof BEHAVIOR_CATEGORIES)[number]["key"]

/** The journal's sections (journal-daily-questions-today): when in the day the question is about. Custom behaviours sit under "custom". */
export const JOURNAL_SECTIONS = [
  { key: "daytime", get title() { return tr("Daytime", "Durante o dia") } },
  { key: "nighttime", get title() { return tr("Nighttime", "À noite") } },
  { key: "status", get title() { return tr("Status", "Estado") } },
  { key: "custom", get title() { return tr("Your behaviours", "Seus comportamentos") } },
] as const
export type JournalSection = (typeof JOURNAL_SECTIONS)[number]["key"]

/**
 * A follow-up asked once the answer is yes (journal-follow-up-slider-open): a slider whose value is stored beside the answer.
 * "clock" is minutes after midnight in 30-minute steps; "count" a whole number.
 */
export type FollowUp = { question: string; kind: "clock" | "count"; min: number; max: number; step: number }

export type Behavior = { key: string; label: string; question: string; category: BehaviorCategory; section: Exclude<JournalSection, "custom">; followUp?: FollowUp }

const LAST: FollowUp = { get question() { return tr("When did you last consume it?", "Quando foi a última vez que consumiu?") }, kind: "clock", min: 6 * 60, max: 24 * 60 - 30, step: 30 }

export const BEHAVIORS: readonly Behavior[] = [
  { key: "accutane", get label() { return tr("Accutane", "Accutane") }, get question() { return tr("Took Accutane?", "Tomou Accutane?") }, category: "drugs", section: "daytime" },
  { key: "acne", get label() { return tr("Acne", "Acne") }, get question() { return tr("Experienced acne?", "Teve acne?") }, category: "health", section: "status" },
  { key: "acupuncture", get label() { return tr("Acupuncture", "Acupuntura") }, get question() { return tr("Received acupuncture therapy?", "Fez acupuntura?") }, category: "recovery", section: "daytime" },
  { key: "adhd_medication", get label() { return tr("AD(H)D medication", "Medicação para TDA(H)") }, get question() { return tr("Took AD(H)D medication?", "Tomou medicação para TDA(H)?") }, category: "drugs", section: "daytime" },
  { key: "adaptogens", get label() { return tr("Adaptogen mushrooms", "Cogumelos adaptógenos") }, get question() { return tr("Took adaptogen mushrooms?", "Tomou cogumelos adaptógenos?") }, category: "nutrition", section: "daytime" },
  { key: "added_sugar", get label() { return tr("Added sugar", "Açúcar adicionado") }, get question() { return tr("Consumed added sugar?", "Consumiu açúcar adicionado?") }, category: "nutrition", section: "daytime" },
  { key: "afternoon_snack", get label() { return tr("Afternoon snack", "Lanche da tarde") }, get question() { return tr("Ate an afternoon snack?", "Fez um lanche da tarde?") }, category: "nutrition", section: "daytime" },
  { key: "air_travel", get label() { return tr("Air travel", "Viagem de avião") }, get question() { return tr("Travelled by plane?", "Viajou de avião?") }, category: "lifestyle", section: "daytime" },
  { key: "alcohol", get label() { return tr("Alcohol", "Álcool") }, get question() { return tr("Had any alcohol?", "Bebeu álcool?") }, category: "nutrition", section: "nighttime", followUp: { get question() { return tr("How many drinks?", "Quantas doses?") }, kind: "count", min: 1, max: 10, step: 1 } },
  { key: "allergy_medication", get label() { return tr("Allergy medication", "Medicação para alergia") }, get question() { return tr("Took allergy medication?", "Tomou medicação para alergia?") }, category: "drugs", section: "daytime" },
  { key: "anti_anxiety_medication", get label() { return tr("Anti-anxiety medication", "Medicação para ansiedade") }, get question() { return tr("Took anti-anxiety medication?", "Tomou medicação para ansiedade?") }, category: "drugs", section: "daytime" },
  { key: "anxiety", get label() { return tr("Anxiety", "Ansiedade") }, get question() { return tr("Felt anxious?", "Sentiu ansiedade?") }, category: "mental", section: "status" },
  { key: "blood_donation", get label() { return tr("Blood donation", "Doação de sangue") }, get question() { return tr("Donated blood?", "Doou sangue?") }, category: "personal", section: "daytime" },
  { key: "caffeine", get label() { return tr("Caffeine", "Cafeína") }, get question() { return tr("Had any caffeine?", "Tomou alguma cafeína?") }, category: "nutrition", section: "daytime", followUp: LAST },
  { key: "camping", get label() { return tr("Camping", "Acampamento") }, get question() { return tr("Went camping?", "Foi acampar?") }, category: "lifestyle", section: "nighttime" },
  { key: "car_train_travel", get label() { return tr("Car or train travel", "Viagem de carro ou trem") }, get question() { return tr("Travelled by car or train?", "Viajou de carro ou trem?") }, category: "lifestyle", section: "daytime" },
  { key: "caregiving", get label() { return tr("Caregiving", "Cuidar de alguém") }, get question() { return tr("Cared for someone?", "Cuidou de alguém?") }, category: "lifestyle", section: "daytime" },
  { key: "cold_exposure", get label() { return tr("Cold exposure", "Exposição ao frio") }, get question() { return tr("Took a cold plunge or shower?", "Tomou banho ou imersão em água fria?") }, category: "recovery", section: "daytime" },
  { key: "electrolytes", get label() { return tr("Electrolytes", "Eletrólitos") }, get question() { return tr("Took electrolyte supplements?", "Tomou suplemento de eletrólitos?") }, category: "nutrition", section: "daytime", followUp: LAST },
  { key: "family_friends", get label() { return tr("Family and friends", "Família e amigos") }, get question() { return tr("Spent time with family or friends?", "Passou tempo com a família ou amigos?") }, category: "mental", section: "daytime" },
  { key: "feeding_baby", get label() { return tr("Feeding baby at night", "Amamentar à noite") }, get question() { return tr("Fed a baby at night?", "Alimentou um bebê à noite?") }, category: "lifestyle", section: "nighttime" },
  { key: "fever", get label() { return tr("Fever", "Febre") }, get question() { return tr("Experiencing a fever?", "Está com febre?") }, category: "health", section: "daytime" },
  { key: "headache", get label() { return tr("Headache", "Dor de cabeça") }, get question() { return tr("Had a headache?", "Teve dor de cabeça?") }, category: "health", section: "status" },
  { key: "illness", get label() { return tr("Illness", "Doença") }, get question() { return tr("Feeling sick or ill?", "Está se sentindo mal ou doente?") }, category: "health", section: "status" },
  { key: "injury", get label() { return tr("Injury", "Lesão") }, get question() { return tr("Dealing with an injury?", "Está lidando com uma lesão?") }, category: "health", section: "status" },
  { key: "intermittent_fasting", get label() { return tr("Intermittent fasting", "Jejum intermitente") }, get question() { return tr("Fasted for 14 hours or more?", "Ficou em jejum por 14 horas ou mais?") }, category: "nutrition", section: "daytime" },
  { key: "journaling", get label() { return tr("Journaling", "Escrever num diário") }, get question() { return tr("Wrote in a journal?", "Escreveu num diário?") }, category: "mental", section: "nighttime" },
  { key: "late_caffeine", get label() { return tr("Late caffeine", "Cafeína tarde") }, get question() { return tr("Had caffeine after 2 PM?", "Tomou cafeína depois das 14h?") }, category: "nutrition", section: "daytime" },
  { key: "late_meal", get label() { return tr("Late meal", "Refeição tardia") }, get question() { return tr("Ate within two hours of bed?", "Comeu até duas horas antes de dormir?") }, category: "nutrition", section: "nighttime" },
  { key: "magnesium", get label() { return tr("Magnesium", "Magnésio") }, get question() { return tr("Took magnesium?", "Tomou magnésio?") }, category: "nutrition", section: "nighttime" },
  { key: "meditation", get label() { return tr("Meditation", "Meditação") }, get question() { return tr("Meditated?", "Meditou?") }, category: "mental", section: "daytime" },
  { key: "melatonin", get label() { return tr("Melatonin", "Melatonina") }, get question() { return tr("Took melatonin?", "Tomou melatonina?") }, category: "drugs", section: "nighttime" },
  { key: "menstruating", get label() { return tr("Menstruating", "Menstruação") }, get question() { return tr("Menstruating?", "Está menstruada?") }, category: "personal", section: "status" },
  { key: "mouth_tape", get label() { return tr("Mouth tape", "Fita na boca") }, get question() { return tr("Wore mouth tape while sleeping?", "Usou fita na boca para dormir?") }, category: "recovery", section: "nighttime" },
  { key: "nap", get label() { return tr("Nap", "Cochilo") }, get question() { return tr("Took a nap?", "Tirou um cochilo?") }, category: "recovery", section: "daytime" },
  { key: "night_shift", get label() { return tr("Night shift", "Turno da noite") }, get question() { return tr("Worked the night shift?", "Trabalhou no turno da noite?") }, category: "lifestyle", section: "nighttime" },
  { key: "on_call", get label() { return tr("On-call shift", "Plantão") }, get question() { return tr("Worked an on-call shift?", "Fez plantão?") }, category: "lifestyle", section: "nighttime" },
  { key: "outdoor_time", get label() { return tr("Outdoor time", "Tempo ao ar livre") }, get question() { return tr("Spent time outdoors?", "Passou tempo ao ar livre?") }, category: "lifestyle", section: "daytime" },
  { key: "parenting", get label() { return tr("Parenting", "Cuidar dos filhos") }, get question() { return tr("Spent the day parenting?", "Passou o dia cuidando dos filhos?") }, category: "lifestyle", section: "daytime" },
  { key: "remote_work", get label() { return tr("Remote work", "Trabalho remoto") }, get question() { return tr("Worked from home?", "Trabalhou de casa?") }, category: "lifestyle", section: "daytime" },
  { key: "sauna", get label() { return tr("Sauna", "Sauna") }, get question() { return tr("Used a sauna?", "Usou sauna?") }, category: "recovery", section: "daytime" },
  { key: "screen_in_bed", get label() { return tr("Screen in bed", "Tela na cama") }, get question() { return tr("Used a screen in bed?", "Usou uma tela na cama?") }, category: "lifestyle", section: "nighttime" },
  { key: "sexual_activity", get label() { return tr("Sexual activity", "Atividade sexual") }, get question() { return tr("Had sexual activity?", "Teve atividade sexual?") }, category: "personal", section: "nighttime" },
  { key: "shared_bed_child", get label() { return tr("Shared bedroom with child", "Quarto compartilhado com criança") }, get question() { return tr("Shared a bedroom with a child?", "Dividiu o quarto com uma criança?") }, category: "lifestyle", section: "nighttime" },
  { key: "sleep_aid", get label() { return tr("Sleep aid", "Auxiliar de sono") }, get question() { return tr("Took a sleep aid?", "Tomou algum auxiliar de sono?") }, category: "drugs", section: "nighttime" },
  { key: "sore_throat", get label() { return tr("Sore throat", "Dor de garganta") }, get question() { return tr("Have a sore throat?", "Está com dor de garganta?") }, category: "health", section: "status" },
  { key: "stress", get label() { return tr("Stress", "Estresse") }, get question() { return tr("Felt stressed?", "Sentiu estresse?") }, category: "mental", section: "status" },
  { key: "stretching", get label() { return tr("Stretching", "Alongamento") }, get question() { return tr("Stretched?", "Fez alongamento?") }, category: "recovery", section: "daytime" },
  { key: "therapy", get label() { return tr("Therapy", "Terapia") }, get question() { return tr("Went to a therapy session?", "Foi a uma sessão de terapia?") }, category: "mental", section: "daytime" },
  { key: "travel", get label() { return tr("Travel", "Viagem") }, get question() { return tr("Travelled today?", "Viajou hoje?") }, category: "lifestyle", section: "status" },
]

const BY_KEY = new Map(BEHAVIORS.map((b) => [b.key, b]))
export const behavior = (key: string): Behavior | undefined => BY_KEY.get(key)

/** The journal's question for a tag: the catalogue sentence, or a custom label as a question. */
export const questionOf = (tag: string, label: string) => behavior(tag)?.question ?? `${label}?`

/** The label to show for a tag: the catalogue wording in the reader's language, unless the person renamed it (the stored label differs from the catalogue's English one). */
export function displayLabel(tag: string, stored: string) {
  const b = behavior(tag)
  return b && isCatalogueLabel(b, stored) ? b.label : stored
}
const isCatalogueLabel = (b: Behavior, stored: string) => stored === EN_LABELS.get(b.key)
const EN_LABELS = new Map<string, string>(Object.entries({"drugs": "Drugs & medication", "health": "Health & symptoms", "personal": "Personal health", "lifestyle": "Lifestyle", "mental": "Mental wellbeing", "nutrition": "Nutrition", "recovery": "Recovery", "accutane": "Accutane", "acne": "Acne", "acupuncture": "Acupuncture", "adhd_medication": "AD(H)D medication", "adaptogens": "Adaptogen mushrooms", "added_sugar": "Added sugar", "afternoon_snack": "Afternoon snack", "air_travel": "Air travel", "alcohol": "Alcohol", "allergy_medication": "Allergy medication", "anti_anxiety_medication": "Anti-anxiety medication", "anxiety": "Anxiety", "blood_donation": "Blood donation", "caffeine": "Caffeine", "camping": "Camping", "car_train_travel": "Car or train travel", "caregiving": "Caregiving", "cold_exposure": "Cold exposure", "electrolytes": "Electrolytes", "family_friends": "Family and friends", "feeding_baby": "Feeding baby at night", "fever": "Fever", "headache": "Headache", "illness": "Illness", "injury": "Injury", "intermittent_fasting": "Intermittent fasting", "journaling": "Journaling", "late_caffeine": "Late caffeine", "late_meal": "Late meal", "magnesium": "Magnesium", "meditation": "Meditation", "melatonin": "Melatonin", "menstruating": "Menstruating", "mouth_tape": "Mouth tape", "nap": "Nap", "night_shift": "Night shift", "on_call": "On-call shift", "outdoor_time": "Outdoor time", "parenting": "Parenting", "remote_work": "Remote work", "sauna": "Sauna", "screen_in_bed": "Screen in bed", "sexual_activity": "Sexual activity", "shared_bed_child": "Shared bedroom with child", "sleep_aid": "Sleep aid", "sore_throat": "Sore throat", "stress": "Stress", "stretching": "Stretching", "therapy": "Therapy", "travel": "Travel"}))

/** A follow-up value as words: "3:30 PM" or "3". */
export function followUpText(f: FollowUp, v: number) {
  if (f.kind === "count") return String(v)
  const h = Math.floor(v / 60) % 24
  if (isPt()) return `${String(h).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`
  return `${h % 12 || 12}:${String(v % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
}
