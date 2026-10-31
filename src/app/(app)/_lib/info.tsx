// Info-sheet copy for the half-A screens (spec §7.2, §7.3, §7.5, §7.15). Final copy: do not reword. The three score sheets
// end with SOURCE_NOTE (user, 2026-10-04). Each sheet is built per access (lazy), so it follows the interface language.
import type { InfoContent } from "@/components/shells/InfoButton"
import { lazy, tr } from "@/lib/locale-context"

function Rows({ rows }: { rows: [swatch: string | null, text: string][] }) {
  return (
    <ul className="space-y-2">
      {rows.map(([swatch, text]) => (
        <li key={text} className="flex items-baseline gap-2.5">
          {swatch && <span aria-hidden className={`size-2.5 shrink-0 translate-y-px rounded-sm ${swatch}`} />}
          <span>{text}</span>
        </li>
      ))}
    </ul>
  )
}

/** Under each score's explainer: these are Pulse's own scores, not the reference app's (brand guidelines audit). */
const sourceNote = () => (
  <p className="text-[13px] leading-[18px] text-muted-foreground">{tr("Pulse scores, computed from your Fitbit data.", "Scores do Pulse, calculados a partir dos seus dados do Fitbit.")}</p>
)

export const RECOVERY_INFO: InfoContent = lazy(() => ({
  title: tr("How Recovery works", "Como funciona a Recuperação"),
  body: (
    <>
      <p>
        {tr(
          "Recovery shows how ready your body is to take on strain, from 0 to 100%. Pulse scores it each morning from last night’s heart rate variability, resting heart rate, respiratory rate, sleep performance and skin temperature, each compared with your own baseline.",
          "A Recuperação mostra o quanto seu corpo está pronto para encarar esforço, de 0 a 100%. O Pulse a calcula toda manhã a partir da variabilidade da frequência cardíaca, da frequência cardíaca de repouso, da frequência respiratória, do desempenho do sono e da temperatura da pele da noite passada, cada um comparado com a sua própria base.",
        )}
      </p>
      <Rows
        rows={[
          ["bg-recovery-green", tr("Green, 67-100%: your body is primed for strain.", "Verde, 67-100%: seu corpo está pronto para o esforço.")],
          ["bg-recovery-yellow", tr("Yellow, 34-66%: you are maintaining; moderate strain fits.", "Amarelo, 34-66%: você está se mantendo; esforço moderado se encaixa.")],
          ["bg-recovery-red", tr("Red, 0-33%: your body needs rest.", "Vermelho, 0-33%: seu corpo precisa de descanso.")],
        ]}
      />
      <p>
        {tr(
          "Recovery needs 7 nights of HRV before the first score and stays provisional until 14. A day without HRV or processed sleep gets no score rather than a guess.",
          "A Recuperação precisa de 7 noites de VFC antes do primeiro score e fica provisória até 14. Um dia sem VFC ou sem sono processado fica sem score, em vez de um palpite.",
        )}
      </p>
      {sourceNote()}
    </>
  ),
}))

export const STRAIN_INFO: InfoContent = lazy(() => ({
  title: tr("How Strain works", "Como funciona o Esforço"),
  body: (
    <>
      <p>
        {tr(
          "Strain measures the cardiovascular load of your day on a 0 to 21 scale, from the time you spend at higher heart rates. The scale is non-linear: each point is harder to earn than the last.",
          "O Esforço mede a carga cardiovascular do seu dia numa escala de 0 a 21, a partir do tempo que você passa em frequências cardíacas mais altas. A escala não é linear: cada ponto é mais difícil de ganhar que o anterior.",
        )}
      </p>
      <Rows
        rows={[
          [null, tr("Light: up to 10.0", "Leve: até 10,0")],
          [null, tr("Moderate: 10.1 - 14.0", "Moderado: 10,1 - 14,0")],
          [null, tr("Strenuous: 14.1 - 18.0", "Intenso: 14,1 - 18,0")],
          [null, tr("All Out: 18.1 - 21", "Máximo: 18,1 - 21")],
        ]}
      />
      <p>
        {tr(
          "Your Strain Target is a range for today, set from your Recovery and your recent training load. Today’s Strain is a running total until midnight.",
          "Sua meta de Esforço é uma faixa para hoje, definida a partir da sua Recuperação e da sua carga de treino recente. O Esforço de hoje é um total acumulado até a meia-noite.",
        )}
      </p>
      {sourceNote()}
    </>
  ),
}))

export const STRAIN_TARGET_INFO: InfoContent = lazy(() => ({
  title: tr("Strain Target", "Meta de Esforço"),
  body: (
    <p>
      {tr(
        "Your Strain Target is a range for today, set from your Recovery and your training load over the last 28 days. Inside it, training builds fitness without digging a recovery hole.",
        "Sua meta de Esforço é uma faixa para hoje, definida a partir da sua Recuperação e da sua carga de treino nos últimos 28 dias. Dentro dela, o treino melhora o condicionamento sem abrir um buraco de recuperação.",
      )}
    </p>
  ),
}))

export const SLEEP_INFO: InfoContent = lazy(() => ({
  title: tr("How Sleep works", "Como funciona o Sono"),
  body: (
    <>
      <p>
        {tr(
          "Sleep Performance compares the sleep you got with the sleep you needed, adjusted for consistency, efficiency and restorative sleep. Your need is your personal baseline: the upper quartile of your last 28 nights, between 8 and 9.5 hours. Strain, sleep debt and naps change tonight’s need in the sleep planner, not this score.",
          "O Desempenho do Sono compara o sono que você teve com o sono de que precisava, ajustado por consistência, eficiência e sono restaurador. Sua necessidade é a sua base pessoal: o quartil superior das suas últimas 28 noites, entre 8 e 9,5 horas. Esforço, dívida de sono e cochilos mudam a necessidade desta noite no planejador de sono, não este score.",
        )}
      </p>
      <p>
        {tr(
          "Sleep consistency is the Sleep Regularity Index: how closely your sleep and wake times match from one day to the next, over the last 7 days.",
          "A consistência do sono é o Índice de Regularidade do Sono: o quanto seus horários de dormir e acordar se repetem de um dia para o outro, nos últimos 7 dias.",
        )}
      </p>
      {sourceNote()}
    </>
  ),
}))

export const TONIGHT_INFO: InfoContent = lazy(() => ({
  title: tr("Tonight’s sleep", "Sono desta noite"),
  body: (
    <p>
      {tr(
        "Bedtimes are worked back from your typical wake time and how efficiently you sleep. Peak gets you 100% of tonight’s need, Perform 85%, Get by 70%.",
        "Os horários de dormir são calculados a partir do seu horário típico de acordar e da sua eficiência de sono. Pico garante 100% da necessidade desta noite, Desempenho 85% e Básico 70%.",
      )}
    </p>
  ),
}))

export const ENERGY_INFO: InfoContent = lazy(() => ({
  title: tr("Energy Bank", "Banco de Energia"),
  body: (
    <>
      <p>
        {tr(
          "Energy Bank estimates how much energy you have left today, from 0 to 100. It starts each morning from your Recovery and Sleep, drains with exertion and stressful stretches, and recharges during calm, still periods and naps. It is an estimate, not a measurement.",
          "O Banco de Energia estima quanta energia você ainda tem hoje, de 0 a 100. Ele começa toda manhã a partir da sua Recuperação e do seu Sono, se esgota com esforço e períodos de estresse, e recarrega em momentos calmos, parados, e em cochilos. É uma estimativa, não uma medição.",
        )}
      </p>
      <Rows
        rows={[
          ["bg-recovery-green", tr("67-100: plenty in reserve.", "67-100: muita reserva.")],
          ["bg-recovery-yellow", tr("34-66: pace yourself.", "34-66: dose o ritmo.")],
          ["bg-recovery-red", tr("0-33: running low.", "0-33: ficando baixo.")],
        ]}
      />
    </>
  ),
}))

export const STRAIN_RECOVERY_INFO: InfoContent = lazy(() => ({
  title: tr("Strain & recovery", "Esforço e recuperação"),
  body: (
    <>
      <p>
        {tr(
          "Your last 7 days side by side: Day Strain in blue on the left scale, from 0 to 21, and Recovery on the right scale, from 0 to 100%.",
          "Seus últimos 7 dias lado a lado: o Esforço do dia em azul, na escala da esquerda, de 0 a 21, e a Recuperação na escala da direita, de 0 a 100%.",
        )}
      </p>
      <p>
        {tr(
          "High strain on one day often shows up as lower Recovery the next morning. Days without a score are left as gaps.",
          "Um esforço alto num dia costuma aparecer como Recuperação mais baixa na manhã seguinte. Dias sem score ficam como lacunas.",
        )}
      </p>
    </>
  ),
}))

/** "Add activity" (Home's card button and the "+" menu): Pulse imports workouts, so this explains where they come from (§11 R2). */
export const ADD_ACTIVITY_INFO: InfoContent = lazy(() => ({
  title: tr("Add an activity", "Adicionar uma atividade"),
  body: (
    <>
      <p>{tr("Pulse reads your workouts from Fitbit through Google Health, so it cannot add one here.", "O Pulse lê seus treinos do Fitbit pelo Google Health, então não é possível adicionar um aqui.")}</p>
      <p>
        {tr(
          "Start or log the workout in the Fitbit app. It appears in your activities after the next sync, with its Strain.",
          "Inicie ou registre o treino no app Fitbit. Ele aparece nas suas atividades depois da próxima sincronização, com o seu Esforço.",
        )}
      </p>
    </>
  ),
}))
