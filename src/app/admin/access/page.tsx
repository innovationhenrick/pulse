import { signupMode } from "@/server/admin"
import { coachMode } from "@/server/coach/store"
import { tr } from "@/lib/locale-context"
import { requestLocale } from "@/server/locale"
import { ModeChoice } from "../AdminClient"
import { adminGate } from "../gate"
import { PageHeader, Panel } from "../ui"

export const generateMetadata = async () => {
  await requestLocale()
  return { title: tr("Access", "Acesso") }
}

/** Admin › Access `/admin/access`: who can sign up, and who can use the AI coach. Saved on pick, no restart. */
export default async function AccessPage() {
  const { db } = await adminGate()
  const [signup, coach] = await Promise.all([signupMode(db), coachMode(db)])
  return (
    <>
      <PageHeader title={tr("Access", "Acesso")} description={tr("Changes apply at once, without a restart, and override SIGNUP in the server’s .env.", "As mudanças valem na hora, sem reiniciar, e substituem o SIGNUP do .env do servidor.")} />
      <div className="grid gap-4 lg:gap-6">
        <Panel title={tr("Sign-up", "Cadastro")} description={tr("Who can create an account on this server.", "Quem pode criar uma conta neste servidor.")}>
          <ModeChoice kind="signup" value={signup} />
        </Panel>
        <Panel title={tr("AI coach", "Coach de IA")} description={tr("Each person adds their own AI provider key, so the coach costs this server nothing. Admins never see anyone’s key or chats.", "Cada pessoa adiciona a própria chave de provedor de IA, então o coach não custa nada ao servidor. Admins nunca veem a chave nem as conversas de ninguém.")}>
          <ModeChoice kind="coach" value={coach} />
        </Panel>
      </div>
    </>
  )
}
