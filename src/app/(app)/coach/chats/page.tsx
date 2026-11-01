import { connection } from "next/server"
import { notFound } from "next/navigation"
import { coachAccess, groupChats, listChats } from "@/server/coach/store"
import { userCtx } from "@/server/queries/common"
import { DetailShell } from "@/components/shells/DetailShell"
import { ChatList } from "../ChatList"
import { tr } from "@/lib/locale-context"
import { requestLocale } from "@/server/locale"

export const generateMetadata = async () => {
  await requestLocale()
  return { title: tr("Chats", "Conversas") }
}

/** The coach's chats on phone and tablet `/coach/chats` (laptop shows the same list beside the conversation). */
export default async function ChatsPage() {
  await connection()
  await requestLocale()
  const ctx = await userCtx()
  const { db, userId, now } = ctx
  if (!(await coachAccess(db, userId))) notFound()
  const { chats, next } = await listChats(db, userId)
  const groups = groupChats(chats, now, ctx.timeZone)
  return <DetailShell title={tr("Chats", "Conversas")} backHref="/coach" primary={<ChatList groups={groups} next={next} current={null} className="mx-auto w-full max-w-[640px]" />} />
}
