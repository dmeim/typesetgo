import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  ArrowFatRightIcon, ArrowsCounterClockwiseIcon, CheckCircleIcon, DeviceMobileIcon, EyeIcon, EyeSlashIcon, ListIcon, PauseIcon, PlayIcon,
  ProjectorScreenChartIcon, SquaresFourIcon, UsersIcon,
} from "@phosphor-icons/react";
import { ScrollRow } from "@/components/ui/scroll-row";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { cn } from "@/lib/utils";
import { ROOM, testDetail } from "./connect-mock";
import { Pills, StatusBadge, TestDots } from "./ConnectParts";
import { KidCard } from "./KidCard";
import { StudentView } from "./StudentView";
import { leaderId, selfPacedCounts, sortKids, stepLine, type BoardSort } from "./room-text";
import type { MockRoom } from "./use-mock-room";

export type BoardView = "board" | "student";

const SORTS: { value: BoardSort; label: string }[] = [
  { value: "join", label: "Joined" },
  { value: "wpm", label: "Fastest" },
  { value: "accuracy", label: "Most accurate" },
  { value: "progress", label: "Furthest" },
  { value: "name", label: "A–Z" },
];

const chip = "flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-3.5 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40";

function Summary({ room }: { room: MockRoom }) {
  const online = room.kids.filter((kid) => kid.online);
  const hostPaced = room.pacing === "host";
  const test = room.tests[room.index];
  const finished = hostPaced ? online.filter((kid) => kid.finished).length : selfPacedCounts(room).done;
  const heading = room.status === "lobby" ? `${room.tests.length} tests ready`
    : room.status === "complete" ? "All tests complete"
      : hostPaced ? `Test ${room.index + 1} of ${room.tests.length} · ${test?.title}` : "Own pace";
  const detail = room.status === "lobby" ? "Waiting for the host to start"
    : room.status === "complete" ? "Great typing, everyone!"
      : hostPaced ? `${test ? testDetail(test) : ""} · ${stepLine(room)}` : "Everyone moves through the list at their own speed";
  return (
    <section aria-label="Room progress" className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={room.status} />
          <h2 className="text-xl font-black">{heading}</h2>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">{detail}</p>
        {hostPaced && room.status !== "lobby" && <TestDots tests={room.tests} index={room.status === "complete" ? room.tests.length : room.index} className="max-w-md" />}
      </div>
      <dl className="flex shrink-0 gap-3">
        <div className="flex min-w-24 flex-col items-center rounded-2xl bg-muted/50 px-4 py-2">
          <dt className="flex items-center gap-1 text-xs text-muted-foreground"><UsersIcon className="size-3.5" aria-hidden="true" />Online</dt>
          <dd className="text-2xl font-black tabular-nums">{online.length}<span className="text-sm font-normal text-muted-foreground">/{room.kids.length}</span></dd>
        </div>
        {room.status !== "lobby" && (
          <div className="flex min-w-24 flex-col items-center rounded-2xl bg-success/10 px-4 py-2">
            <dt className="flex items-center gap-1 text-xs text-success"><CheckCircleIcon weight="fill" className="size-3.5" aria-hidden="true" />{hostPaced ? "Finished" : "All done"}</dt>
            <dd className="text-2xl font-black tabular-nums">{finished}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

/** Lets the mockup be driven from the board, since the real board is a separate window. */
function DemoRemote({ room }: { room: MockRoom }) {
  const running = room.status === "running";
  return (
    <div role="group" aria-label="Mockup controls" className="flex w-fit flex-wrap items-center gap-2 rounded-3xl border border-dashed border-border p-1 pl-4 text-xs text-muted-foreground sm:rounded-full">
      <span>Pretend host:</span>
      <button type="button" className={chip} onClick={running ? room.actions.pause : room.actions.start}>
        {running ? <PauseIcon weight="fill" className="size-4" aria-hidden="true" /> : <PlayIcon weight="fill" className="size-4" aria-hidden="true" />}
        {running ? "Pause" : room.status === "paused" ? "Resume" : room.status === "complete" ? "Start again" : "Start"}
      </button>
      {room.pacing === "host" && (room.status === "running" || room.status === "paused") && (
        <button type="button" className={chip} onClick={() => room.actions.goTo(room.index + 1)}><ArrowFatRightIcon className="size-4" aria-hidden="true" />Next</button>
      )}
      <button type="button" className={chip} disabled={room.status === "lobby"} onClick={room.actions.reset}><ArrowsCounterClockwiseIcon className="size-4" aria-hidden="true" />Reset</button>
    </div>
  );
}

function Board({ room }: { room: MockRoom }) {
  const [sort, setSort] = useState<BoardSort>("join");
  const [layout, setLayout] = useState<"cards" | "list">("cards");
  const [showOffline, setShowOffline] = useState(true);
  const kids = sortKids(room, sort).filter((kid) => showOffline || kid.online);
  const leader = leaderId(room);
  return (
    <div className="flex flex-col gap-4">
      <Summary room={room} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <ScrollRow aria-label="Sort players" className="min-w-0 flex-1 p-0.5">
          <Pills<BoardSort> label="Sort by" value={sort} onChange={setSort} options={SORTS} className="shrink-0" />
        </ScrollRow>
        <div className="flex flex-wrap items-center gap-2">
          <Pills<"cards" | "list"> label="Layout" value={layout} onChange={setLayout} className="shrink-0"
            options={[{ value: "cards", label: "Cards", Icon: SquaresFourIcon }, { value: "list", label: "List", Icon: ListIcon }]} />
          <button type="button" aria-pressed={showOffline} onClick={() => setShowOffline((value) => !value)} className={chip}>
            {showOffline ? <EyeIcon className="size-4" aria-hidden="true" /> : <EyeSlashIcon className="size-4" aria-hidden="true" />}Offline
          </button>
        </div>
      </div>
      <ul className={cn("grid gap-3", layout === "cards" ? "grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]" : "grid-cols-1")}>
        <AnimatePresence initial={false} mode="popLayout">
          {kids.map((kid) => <KidCard key={kid.id} room={room} kid={kid} leader={leader === kid.id} layout={layout} />)}
        </AnimatePresence>
      </ul>
    </div>
  );
}

/** The live board a teacher projects, plus what one student sees on their own screen. */
export function ConnectBoardScreen({ room, view, onViewChange, onLeave }: { room: MockRoom; view: BoardView; onViewChange: (view: BoardView) => void; onLeave: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-6 md:px-6 md:pt-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{ROOM.name} · code <span className="font-mono font-bold tracking-widest text-foreground">{ROOM.code}</span></p>
          <h1 className="text-3xl font-black">{view === "board" ? "Live board" : "Student view"}</h1>
        </div>
        <Pills<BoardView> label="Whose screen" value={view} onChange={onViewChange} className="sm:w-auto"
          options={[{ value: "board", label: "Teacher", Icon: ProjectorScreenChartIcon }, { value: "student", label: "Student", Icon: DeviceMobileIcon }]} />
      </header>
      <DemoRemote room={room} />
      <LayoutGroup>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={view} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={LAB_SPRING}>
            {view === "board" ? <Board room={room} /> : <StudentView room={room} onLeave={onLeave} />}
          </motion.div>
        </AnimatePresence>
      </LayoutGroup>
    </main>
  );
}
