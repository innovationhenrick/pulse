import type { ReasonCode } from "@/lib/reasons";
import { tr } from "@/lib/locale-context";

export type CoachSuggestion = { key: "brief" | "recovery" | "training" | "hrv" | "sleep" | "strain" | "sync"; text: string };
export type SuggestionSignals = {
  recovery: number | null;
  provisional: boolean;
  reason: ReasonCode | null;
  hrv: number | null;
  hrvBaseline: number | null;
  asleepMinutes: number | null;
  strain: number | null;
  targetHigh: number | null;
};

export function suggestionsFor(s: SuggestionSignals): CoachSuggestion[] {
  const out: CoachSuggestion[] = [{ key: "brief", text: tr("Today's brief", "Resumo de hoje") }];
  if (s.reason === "awaiting_sleep_sync") out.push({ key: "sync", text: tr("What can I do while last night's sleep syncs?", "O que posso fazer enquanto o sono de ontem sincroniza?") });
  else if (s.reason === "calibrating" || s.provisional) out.push({ key: "recovery", text: tr("How should I train while my Recovery is provisional?", "Como devo treinar enquanto minha Recuperação é provisória?") });
  else if (s.recovery !== null) out.push({ key: "training", text: s.recovery < 34 ? tr("What easy activity makes sense today?", "Que atividade leve faz sentido hoje?") : s.recovery < 67 ? tr("How should I keep today's training controlled?", "Como manter o treino de hoje controlado?") : tr("How hard can I train within today's target?", "Quão forte posso treinar dentro da meta de hoje?") });
  if (s.strain !== null && (s.targetHigh !== null ? s.strain >= s.targetHigh : s.strain >= 14)) out.push({ key: "strain", text: tr("Have I done enough activity today?", "Já fiz atividade suficiente hoje?") });
  if (s.hrv !== null && s.hrvBaseline !== null && s.hrvBaseline > 0 && s.hrv < s.hrvBaseline * 0.85) out.push({ key: "hrv", text: tr("Why is my HRV below my usual range?", "Por que minha VFC está abaixo do normal?") });
  if (s.asleepMinutes !== null && s.asleepMinutes < 360) out.push({ key: "sleep", text: tr("I slept poorly. How can I recover today?", "Dormi mal. Como posso me recuperar hoje?") });
  for (const item of [{ key: "sleep", text: tr("How can I improve tonight's sleep?", "Como posso melhorar o sono de hoje à noite?") }, { key: "recovery", text: tr("What's shaping my Recovery?", "O que está moldando minha Recuperação?") }, { key: "training", text: tr("How should I plan today's training?", "Como devo planejar o treino de hoje?") }] as CoachSuggestion[]) {
    if (!out.some((s) => s.key === item.key)) out.push(item);
  }
  return out.slice(0, 4);
}
