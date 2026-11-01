import { DetailShell } from "@/components/shells/DetailShell"
import { Skeleton } from "@/components/ui/skeleton"
import { tr } from "@/lib/locale-context"

/** Chats: the header at once, list-row bars while the list loads. */
export default function Loading() {
  return (
    <DetailShell
      loading
      title={tr("Chats", "Conversas")}
      backHref="/coach"
      primary={
        <div aria-hidden className="mx-auto flex w-full max-w-[640px] flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      }
    />
  )
}
