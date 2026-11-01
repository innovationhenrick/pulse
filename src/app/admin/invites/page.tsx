import { listInvites, signupMode } from "@/server/admin"
import { tr } from "@/lib/locale-context"
import { requestLocale } from "@/server/locale"
import { adminGate } from "../gate"
import { InviteList, NewInvite } from "../Invites"
import { PageHeader } from "../ui"

export const generateMetadata = async () => {
  await requestLocale()
  return { title: tr("Invites", "Convites") }
}

const requestTime = () => Date.now()

/** Admin › Invites `/admin/invites`: make a one-time sign-up link, and see which are waiting, used or expired. */
export default async function InvitesPage() {
  const { db } = await adminGate()
  const [invites, signup] = await Promise.all([listInvites(db), signupMode(db)])
  return (
    <>
      <PageHeader title={tr("Invites", "Convites")} description={tr("Each link lets one person create an account. Only its fingerprint is stored, so a link is shown once.", "Cada link permite que uma pessoa crie uma conta. Só a impressão digital dele é guardada, então o link aparece uma única vez.")} />
      <NewInvite signup={signup} />
      <InviteList invites={invites} now={requestTime()} />
    </>
  )
}
