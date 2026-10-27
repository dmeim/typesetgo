import { useEffect } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  ArrowFatRightIcon, ArrowsCounterClockwiseIcon, CornersInIcon, CornersOutIcon, DeviceMobileIcon, PauseIcon, PlayIcon, ProjectorScreenChartIcon,
} from "@phosphor-icons/react";
import { useFullscreen } from "@/components/connect/use-fullscreen";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { cn } from "@/lib/utils";
import { chip, toggleFullscreen } from "./board-actions";
import { JOIN_HOST } from "./connect-mock";
import { CodeTiles, Pills } from "./ConnectParts";
import { BoardControls, BoardGrid, BoardSummary } from "./LiveBoard";
import { StudentView } from "./StudentView";
import { useBoardPrefs } from "./use-board-prefs";
import type { MockRoom } from "./use-mock-room";

export type BoardView = "board" | "student";

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

/** The projector strip: room, live status, where to join, and a big code. */
function BoardStrip({ room, live }: { room: MockRoom; live: boolean }) {
  const fullscreen = useFullscreen();
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-3xl border border-border bg-card px-5 py-3">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-black sm:text-2xl" title={room.name}>{room.name}</h1>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className={cn("size-2 rounded-full", live ? "bg-success" : "animate-pulse bg-muted-foreground")} aria-hidden="true" />
          {live ? "Live" : "Connecting…"}<span aria-hidden="true">·</span><span className="truncate">Hosted by {room.host}</span>
        </p>
      </div>
      <div className="ml-auto flex min-w-0 items-center gap-3 sm:gap-4">
        <p className="min-w-0 text-right text-xs leading-tight text-muted-foreground sm:text-sm">Join at<br /><span className="font-semibold text-foreground">{JOIN_HOST}</span></p>
        <CodeTiles key={room.code} code={room.code} className="[&>span]:h-12 [&>span]:w-10 [&>span]:rounded-xl [&>span]:text-2xl sm:[&>span]:h-14 sm:[&>span]:w-11 sm:[&>span]:text-3xl" />
        <button type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"} title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          {fullscreen ? <CornersInIcon className="size-5" aria-hidden="true" /> : <CornersOutIcon className="size-5" aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}

function Board({ room, interactive }: { room: MockRoom; interactive: boolean }) {
  const [prefs, update] = useBoardPrefs();
  return (
    <div className="flex flex-col gap-4">
      <BoardSummary room={room} />
      {interactive && <BoardControls room={room} prefs={prefs} update={update} />}
      <BoardGrid room={room} prefs={prefs} update={update} interactive={interactive} emptyHint={`Go to ${JOIN_HOST} and enter code ${room.code}.`} />
    </div>
  );
}

/** The card-only board in its own window or tab. It follows the host tab's room and board settings, so it has no controls. */
export function PopoutBoard({ room }: { room: MockRoom }) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${room.name} · Board`;
    return () => { document.title = previous; };
  }, [room.name]);
  if (room.ended) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <ProjectorScreenChartIcon className="size-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-black">{room.name} has ended</h1>
        <p className="text-sm text-muted-foreground">The host can reopen it from Connect.</p>
      </main>
    );
  }
  return (
    <main className="flex min-h-dvh flex-col gap-4 bg-background p-3 sm:p-5">
      <BoardStrip room={room} live={room.synced} />
      {room.synced ? <Board room={room} interactive={false} /> : (
        <p className="m-auto max-w-sm text-center text-sm text-muted-foreground">Waiting for the host tab. Keep the Connect mockup open in another tab; this board mirrors it.</p>
      )}
    </main>
  );
}

/** The live board a teacher projects, plus what one student sees on their own screen. */
export function ConnectBoardScreen({ room, view, onViewChange, onLeave }: { room: MockRoom; view: BoardView; onViewChange: (view: BoardView) => void; onLeave: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-6 md:px-6 md:pt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DemoRemote room={room} />
        <Pills<BoardView> label="Whose screen" value={view} onChange={onViewChange} className="sm:w-auto"
          options={[{ value: "board", label: "Teacher", Icon: ProjectorScreenChartIcon }, { value: "student", label: "Student", Icon: DeviceMobileIcon }]} />
      </div>
      <LayoutGroup>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={view} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={LAB_SPRING} className="flex flex-col gap-4">
            {view === "board" ? (
              <>
                <BoardStrip room={room} live />
                <Board room={room} interactive />
              </>
            ) : <StudentView room={room} onLeave={onLeave} />}
          </motion.div>
        </AnimatePresence>
      </LayoutGroup>
    </main>
  );
}
