import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftIcon, CheckIcon, DoorOpenIcon, PencilSimpleIcon, XIcon } from "@phosphor-icons/react";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { CONNECT_ARCHIVE_HOURS, CONNECT_ROOM_NAME_MAX } from "@/lib/connect-types";
import { KidAvatar, TwoTapButton } from "./ConnectParts";
import { EveryoneGetsCard } from "./EveryoneGetsCard";
import { RunCard } from "./HostRunCards";
import { CodeCard, RosterCard } from "./HostSideCards";
import { TestsCard } from "./HostTestsCard";
import { LiveBoardCard } from "./LiveBoard";
import { useBoardPrefs } from "./use-board-prefs";
import type { MockRoom } from "./use-mock-room";

const iconButton = "flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40";

/** The room name, with a pencil that turns it into a field. */
function RoomName({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = draft?.trim();
    if (next && next !== name) onRename(next);
    setDraft(null);
  };
  return (
    <AnimatePresence mode="wait" initial={false}>
      {draft === null ? (
        <motion.div key="name" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={LAB_SPRING} className="group flex min-w-0 items-center gap-1">
          <h1 className="text-2xl font-black leading-tight [overflow-wrap:anywhere] sm:text-3xl">{name}</h1>
          <button type="button" aria-label="Rename room" onClick={() => setDraft(name)} className={iconButton}>
            <PencilSimpleIcon className="size-4" aria-hidden="true" />
          </button>
        </motion.div>
      ) : (
        <motion.form key="field" onSubmit={submit} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={LAB_SPRING} className="flex min-w-0 items-center gap-1">
          <input autoFocus aria-label="Room name" value={draft} maxLength={CONNECT_ROOM_NAME_MAX} onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Escape") setDraft(null); }}
            className="h-11 min-w-0 flex-1 rounded-2xl border border-input bg-background px-3 text-xl font-black outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 sm:w-96 sm:flex-none" />
          <button type="submit" aria-label="Save room name" disabled={!draft.trim()} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40">
            <CheckIcon className="size-4" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Cancel renaming" onClick={() => setDraft(null)} className={iconButton}><XIcon className="size-4" aria-hidden="true" /></button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

/** Host panel: run, tests and room settings on the left; code and roster on the right; the live board underneath. On phones the code comes first. */
export function ConnectHostScreen({ room, onBack, onOpenBoard }: { room: MockRoom; onBack: () => void; onOpenBoard: () => void }) {
  const [prefs, updatePrefs] = useBoardPrefs();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-6 md:px-6 md:pt-10">
      <header className="flex flex-col gap-3">
        <button type="button" onClick={onBack} className="flex w-fit items-center gap-2 rounded-full px-2 py-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <ArrowLeftIcon className="size-4" aria-hidden="true" />Connect
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <KidAvatar name={room.host} size="lg" />
            <div className="min-w-0">
              <RoomName name={room.name} onRename={room.actions.rename} />
              <p className="text-sm text-muted-foreground">Hosted by {room.host}</p>
            </div>
          </div>
          <TwoTapButton label="End room" confirmLabel="Tap again to end" Icon={DoorOpenIcon} className="border border-border"
            onConfirm={() => { room.actions.end(); onBack(); }} />
        </div>
        <p className="sr-only">Ending the room disconnects everyone. You can reopen it from Connect for {CONNECT_ARCHIVE_HOURS} hours with a new code.</p>
      </header>
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div className="contents lg:flex lg:flex-col lg:gap-5">
          <RunCard room={room} className="order-2" />
          <TestsCard room={room} className="order-4" />
          <EveryoneGetsCard room={room} className="order-5" />
        </div>
        <div className="contents lg:flex lg:flex-col lg:gap-5">
          <CodeCard room={room} className="order-1" />
          <RosterCard room={room} className="order-3" />
        </div>
      </div>
      <LiveBoardCard room={room} prefs={prefs} update={updatePrefs} onShowHere={onOpenBoard} />
    </main>
  );
}
