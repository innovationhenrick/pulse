import { connection } from "next/server"
import { userCtx } from "@/server/queries/common"
import { getBehaviours } from "@/server/queries/journal"
import { DetailShell } from "@/components/shells/DetailShell"
import { Behaviours } from "./Behaviours"
import { tr } from "@/lib/locale-context"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  return { title: (await getTranslations("meta.behaviours"))("title") }
}

/** Behaviours `/more/behaviours` (U21): manage the journal check-in list. */
export default async function BehavioursPage() {
  await connection()
  return <DetailShell title={tr("Behaviours", "Comportamentos")} primary={<Behaviours vm={await getBehaviours(await userCtx())} />} />
}
