import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftIcon, CheckIcon, DoorOpenIcon, PencilSimpleIcon, XIcon } from "@phosphor-icons/react";
import type { HostRoom } from "@/components/connect/types";
import { CONNECT_ARCHIVE_HOURS, CONNECT_ROOM_NAME_MAX } from "@/lib/connect-types";
import { ConnectAvatar } from "@/components/connect/ConnectAvatar";
import { TwoTapButton } from "@/components/connect/ConnectParts";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";

const iconButton = "flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40";

/** The room name, with a pencil that turns it into a field. */
function RoomName({ name, onRename, saving }: { name: string; onRename: (name: string) => Promise<boolean>; saving: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (draft === null) return;
    const next = draft.trim();
    if (!next || next === name) { setDraft(null); return; }
    if (await onRename(next)) setDraft(null);
  };
  return (
    <AnimatePresence mode="wait" initial={false}>
      {draft === null ? (
        <motion.div key="name" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={CONNECT_SPRING} className="flex min-w-0 items-center gap-1">
          <h1 className="text-2xl font-black leading-tight [overflow-wrap:anywhere] sm:text-3xl">{name}</h1>
          <button type="button" aria-label="Rename room" onClick={() => setDraft(name)} className={iconButton}>
            <PencilSimpleIcon className="size-4" aria-hidden="true" />
          </button>
        </motion.div>
      ) : (
        <motion.form key="field" onSubmit={(event) => void submit(event)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={CONNECT_SPRING} className="flex min-w-0 items-center gap-1">
          <input autoFocus aria-label="Room name" value={draft} maxLength={CONNECT_ROOM_NAME_MAX} onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Escape") setDraft(null); }}
            className="h-11 min-w-0 flex-1 rounded-2xl border border-input bg-background px-3 text-xl font-black outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 sm:w-96 sm:flex-none" />
          <button type="submit" aria-label="Save room name" disabled={saving || !draft.trim()}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40">
            <CheckIcon className="size-4" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Cancel renaming" onClick={() => setDraft(null)} className={iconButton}><XIcon className="size-4" aria-hidden="true" /></button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

export function HostHeader({ room, onRename, renaming, onEnd, ending }: {
  room: HostRoom;
  onRename: (name: string) => Promise<boolean>;
  renaming: boolean;
  onEnd: () => void;
  ending: boolean;
}) {
  return (
    <header className="flex flex-col gap-3">
      <Link to="/connect" className="flex w-fit items-center gap-2 rounded-full px-2 py-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        <ArrowLeftIcon className="size-4" aria-hidden="true" />Connect
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ConnectAvatar name={room.hostName} className="size-14 text-xl" />
          <div className="min-w-0">
            <RoomName key={room.name} name={room.name} onRename={onRename} saving={renaming} />
            <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">Hosted by {room.hostName}</p>
          </div>
        </div>
        <TwoTapButton label="End room" confirmLabel="Tap again to end" Icon={DoorOpenIcon} className="border border-border" disabled={ending} onConfirm={onEnd} />
      </div>
      <p className="sr-only">Ending the room disconnects everyone. You can reopen it from Connect for {CONNECT_ARCHIVE_HOURS} hours with a new code.</p>
    </header>
  );
}
