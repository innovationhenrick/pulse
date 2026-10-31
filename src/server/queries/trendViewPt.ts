// Brazilian Portuguese copy for the Trend Views in trendView.ts, laid over the English table by key. English stays
// the source: a view with no entry here, or a field left out, reads in English.
import { isPt } from "@/lib/locale-context";

type PtView = {
  label?: string;
  card?: string;
  short?: string;
  bandsTitle?: string;
  footnote?: string;
  goal?: string;
  aboutTitle: string;
  about: string[];
};

const VIEWS: Record<string, PtView> = {
  recovery: {
    label: "Recuperação", short: "Recuperação", bandsTitle: "Recuperação por faixa (dias)",
    aboutTitle: "O que é a Recuperação?",
    about: [
      "A Recuperação mostra o quanto seu corpo está pronto para encarar esforço hoje, numa escala de 0 a 100%.",
      "O Pulse a calcula toda manhã a partir da variabilidade da frequência cardíaca, da frequência cardíaca de repouso, da frequência respiratória, do desempenho do sono e da temperatura da pele, cada um comparado com a sua própria base recente.",
      "Verde (67% ou mais) significa que você está pronto para um dia puxado, amarelo significa manter, e vermelho significa que seu corpo está pedindo descanso.",
    ],
  },
  hrv: {
    label: "Variabilidade da frequência cardíaca", short: "VFC",
    aboutTitle: "O que é a Variabilidade da frequência cardíaca?",
    about: [
      "A variabilidade da frequência cardíaca (VFC) é a variação do tempo entre seus batimentos, medida em milissegundos enquanto você dorme.",
      "Uma VFC mais alta costuma indicar que seu sistema nervoso está relaxado e pronto para o estresse; uma mais baixa muitas vezes vem depois de treino pesado, sono ruim, álcool ou doença.",
      "A VFC varia muito de pessoa para pessoa, então compare-a apenas com a sua própria faixa típica, não com a de outra pessoa.",
    ],
  },
  rhr: {
    label: "Frequência cardíaca de repouso", short: "FC de repouso",
    aboutTitle: "O que é a Frequência cardíaca de repouso?",
    about: [
      "A frequência cardíaca de repouso (FCR) é quantas vezes seu coração bate por minuto quando você está totalmente em repouso, medida durante o sono.",
      "Uma FCR mais baixa geralmente reflete melhor condicionamento e recuperação. Alguns batimentos acima da sua faixa típica podem indicar fadiga, estresse, calor, álcool ou o início de uma doença.",
    ],
  },
  resp: {
    label: "Frequência respiratória", short: "frequência respiratória",
    aboutTitle: "O que é a Frequência respiratória?",
    about: [
      "A frequência respiratória é quantas respirações você faz por minuto enquanto dorme.",
      "É um dos sinais vitais mais estáveis: de uma noite para outra ela raramente muda muito. Um aumento claro acima da sua faixa típica merece atenção, pois muitas vezes acompanha doença ou uma carga pesada sobre o corpo.",
    ],
  },
  sleep: {
    label: "Desempenho do sono", short: "Desempenho do sono", bandsTitle: "Desempenho do sono por faixa (dias)",
    aboutTitle: "O que é o Desempenho do sono?",
    about: [
      "O Desempenho do sono compara o sono que você teve com o sono de que seu corpo precisava, ajustado pela consistência e pela eficiência desse sono.",
      "Sua necessidade aumenta com o esforço de ontem e com qualquer dívida de sono que você carregue, então as mesmas horas podem pontuar diferente em noites diferentes.",
    ],
  },
  hours: {
    label: "Horas de sono", card: "Horas vs. necessárias (horas)", short: "horas de sono",
    aboutTitle: "O que são as Horas de sono?",
    about: [
      "As horas de sono são o tempo que você realmente passou dormindo no seu sono principal, sem contar o tempo acordado na cama.",
      "A maioria dos adultos precisa de sete a nove horas, e a sua necessidade muda com o esforço e a dívida de sono.",
    ],
  },
  hours_need: {
    label: "Horas vs. necessárias", card: "Horas vs. necessárias (%)", short: "horas vs. necessárias", bandsTitle: "Horas vs. necessárias por faixa (dias)",
    aboutTitle: "O que são as Horas vs. necessárias?",
    about: [
      "Horas vs. necessárias é o sono que você teve como parcela do sono de que seu corpo precisava naquela noite.",
      "Sua necessidade é uma base mais um extra pelo esforço de ontem e por qualquer dívida de sono, então um dia puxado a aumenta.",
    ],
  },
  restorative: {
    label: "Sono restaurador", short: "sono restaurador",
    aboutTitle: "O que é o Sono restaurador?",
    about: [
      "O sono restaurador é o tempo que você passa em sono profundo (ondas lentas) e em sono REM, as duas fases em que acontece a maior parte do reparo físico e mental.",
      "O sono profundo vem principalmente no começo da noite e o REM no fim, então uma noite curta corta o REM primeiro.",
    ],
  },
  consistency: {
    label: "Consistência do sono", short: "Consistência do sono", bandsTitle: "Consistência do sono por faixa (dias)",
    aboutTitle: "O que é a Consistência do sono?",
    about: [
      "A consistência do sono mede o quanto seus horários de dormir e acordar se repetem de um dia para o outro.",
      "Dormir e acordar em horários parecidos mantém o relógio do corpo estável, o que torna as mesmas horas de sono mais reparadoras.",
    ],
  },
  efficiency: {
    label: "Eficiência do sono", short: "Eficiência do sono", bandsTitle: "Eficiência do sono por faixa (dias)",
    aboutTitle: "O que é a Eficiência do sono?",
    about: [
      "A eficiência do sono é a parcela do tempo na cama que você realmente passou dormindo: horas de sono divididas pelo tempo na cama.",
      "Acima de 85% costuma ser considerado bom. Longos períodos acordado, muitos despertares ou muito tempo na cama antes de adormecer a reduzem.",
      "Uma eficiência melhor significa que mais da noite vai para as fases do sono que restauram você, o que também eleva o seu Desempenho do sono.",
    ],
  },
  time_in_bed: {
    label: "Tempo na cama", short: "tempo na cama",
    aboutTitle: "O que é o Tempo na cama?",
    about: [
      "O tempo na cama vai de quando seu sono principal começou até quando terminou, incluindo qualquer tempo acordado.",
      "Cada barra vai do seu horário de dormir ao de acordar, então uma fileira regular de barras significa uma rotina regular.",
    ],
  },
  sleep_stress: {
    label: "Estresse durante o sono", short: "tempo em estresse alto",
    aboutTitle: "O que é o Estresse durante o sono?",
    about: ["O estresse durante o sono é o quanto da noite sua frequência cardíaca e sua variabilidade mostraram uma resposta de estresse em vez de descanso."],
  },
  strain: {
    label: "Esforço do dia", card: "Esforço", short: "Esforço do dia", bandsTitle: "Esforço por faixa (dias)",
    aboutTitle: "O que é o Esforço do dia?",
    about: [
      "O Esforço do dia mede a carga sobre seu coração e seu corpo ao longo do dia inteiro, numa escala de 0 a 21.",
      "Ele se acumula a partir do tempo que você passa em zonas de frequência cardíaca mais altas, então a subida fica mais íngreme quanto mais forte você vai.",
    ],
  },
  zones13: {
    label: "Zonas de frequência cardíaca 1-3", card: "Zonas de FC 1-3", short: "tempo nas zonas de FC 1-3",
    footnote: "O tempo nas zonas é calculado a partir da sua frequência cardíaca ao longo do dia.",
    goal: "Defina uma meta de zonas de FC no Plano semanal",
    aboutTitle: "O que são as Zonas de frequência cardíaca 1-3?",
    about: [
      "As zonas 1 a 3 cobrem esforço leve a moderado, de 50 a 80% da sua reserva de frequência cardíaca: caminhadas rápidas, corridas leves, pedaladas constantes.",
      "O tempo aqui constrói sua base aeróbica e ajuda a recuperação sem somar muita fadiga.",
    ],
  },
  zones45: {
    label: "Zonas de frequência cardíaca 4-5", card: "Zonas de FC 4-5", short: "tempo nas zonas de FC 4-5",
    footnote: "O tempo nas zonas é calculado a partir da sua frequência cardíaca ao longo do dia.",
    goal: "Atualize sua meta das zonas de FC 4-5",
    aboutTitle: "O que são as Zonas de frequência cardíaca 4-5?",
    about: [
      "As zonas 4 e 5 são esforço intenso, acima de 80% da sua reserva de frequência cardíaca: intervalados, provas e o fim de uma subida difícil.",
      "Um pouco de tempo aqui por semana eleva seu teto de condicionamento; demais, sem descanso, soma esforço mais rápido do que você se recupera.",
    ],
  },
  strength: {
    label: "Tempo de treino de força", short: "tempo de treino de força",
    footnote: "O tempo de treino de força é calculado a partir dos seus treinos de força registrados.",
    goal: "Defina uma meta no Plano semanal",
    aboutTitle: "O que é o Tempo de treino de força?",
    about: [
      "O tempo de treino de força é o tempo que você passou em treino resistido: pesos, exercícios com o peso do corpo, CrossFit e sessões parecidas.",
      "O treino de força regular constrói músculo e osso e sustenta um envelhecimento saudável. A maioria das diretrizes sugere pelo menos duas sessões por semana.",
    ],
  },
  steps: {
    label: "Passos", short: "passos",
    goal: "Atualize sua meta diária de passos",
    aboutTitle: "O que são os Passos?",
    about: ["Os passos são contados pelo seu Fitbit ao longo do dia. São uma medida simples do quanto você se mexe fora dos treinos."],
  },
  calories: {
    label: "Calorias", short: "calorias",
    aboutTitle: "O que são as Calorias?",
    about: ["As calorias são tudo o que você queimou no dia: seu gasto em repouso mais movimento e treinos."],
  },
  vo2max: {
    label: "VO2 máx.", short: "VO2 máx.",
    aboutTitle: "O que é o VO2 máx.?",
    about: [
      "O VO2 máx. é o máximo de oxigênio que seu corpo consegue usar num exercício intenso, em mililitros por quilo de peso corporal por minuto. O Fitbit o estima a partir das suas corridas, ou da sua frequência cardíaca de repouso quando você não corre.",
      "É um dos mais fortes sinais de saúde a longo prazo: mais condicionamento acompanha uma vida mais longa. O treino aeróbico constante o eleva ao longo de semanas e meses.",
    ],
  },
  lean_mass: {
    label: "Massa magra", short: "massa magra",
    aboutTitle: "O que é a Massa magra?",
    about: [
      "A massa magra é o seu peso menos a gordura corporal: músculo, osso, órgãos e água. O Pulse a calcula a partir do peso e da gordura corporal que sua balança ou o app Fitbit registra.",
      "Mais massa magra para a sua altura está ligada a uma vida mais longa, seja qual for a sua gordura corporal. Treino de força e proteína suficiente a constroem.",
    ],
  },
};

const BAND_LABELS: Record<string, string> = {
  green: "Verde", yellow: "Amarelo", red: "Vermelho",
  optimal: "Ótimo", sufficient: "Suficiente", poor: "Ruim",
  all_out: "Máximo", strenuous: "Intenso", moderate: "Moderado", light: "Leve",
};
const SERIES_LABELS: Record<string, string> = {
  asleep: "Horas de sono", need: "Sono necessário", rem: "REM", deep: "Profundo (ondas lentas)",
  low: "Baixo", medium: "Médio", high: "Alto",
  z1: "Zona 1", z2: "Zona 2", z3: "Zona 3", z4: "Zona 4", z5: "Zona 5",
};

type Loose = {
  label: string;
  card?: string;
  short: string;
  footnote?: string;
  actions?: { addActivity?: boolean; goal?: string };
  bands?: { title: string; round?: number; list: readonly { key: string; label: string }[] };
  series?: readonly { key: string; label: string }[];
  about: { title: string; body: readonly string[] };
};

/** The view as the reader's language has it: the English definition itself, or a copy with its text in Portuguese. */
export function localizeView<T extends Loose>(key: string, view: T): T {
  const pt = VIEWS[key];
  if (!pt || !isPt()) return view;
  return {
    ...view,
    label: pt.label ?? view.label,
    ...(view.card !== undefined && { card: pt.card ?? view.card }),
    short: pt.short ?? view.short,
    ...(view.footnote !== undefined && { footnote: pt.footnote ?? view.footnote }),
    ...(view.actions && { actions: { ...view.actions, ...(view.actions.goal !== undefined && { goal: pt.goal ?? view.actions.goal }) } }),
    ...(view.bands && {
      bands: { ...view.bands, title: pt.bandsTitle ?? view.bands.title, list: view.bands.list.map((b) => ({ ...b, label: BAND_LABELS[b.key] ?? b.label })) },
    }),
    ...(view.series && { series: view.series.map((s) => ({ ...s, label: SERIES_LABELS[s.key] ?? s.label })) }),
    about: { title: pt.aboutTitle, body: pt.about },
  };
}
