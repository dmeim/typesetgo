import { useRef, type CSSProperties } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowSquareOutIcon, CheckCircleIcon, CornersInIcon, CornersOutIcon, EyeIcon, EyeSlashIcon, ListIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon,
  PictureInPictureIcon, ProjectorScreenChartIcon, SortAscendingIcon, SortDescendingIcon, SquaresFourIcon, UsersIcon, UsersThreeIcon,
} from "@phosphor-icons/react";
import { useFullscreen } from "@/components/connect/use-fullscreen";
import { Slider } from "@/components/ui/slider";
import { ScrollRow } from "@/components/ui/scroll-row";
import { describeConnectTest } from "@/lib/connect-types";
import { cn } from "@/lib/utils";
import { POPOUT_PATH, chip, popOut, toggleFullscreen } from "./board-actions";
import { LabCard, Pills, StatusBadge, TestDots } from "./ConnectParts";
import { KidCard } from "./KidCard";
import { leaderId, selfPacedCounts, sortKids, stepLine } from "./room-text";
import { CARD_SIZE, DEFAULT_DESCENDING, type BoardPrefs, type BoardSort } from "./use-board-prefs";
import type { MockRoom } from "./use-mock-room";

const SORTS: { value: BoardSort; label: string }[] = [
  { value: "join", label: "Joined" },
  { value: "name", label: "Name" },
  { value: "wpm", label: "WPM" },
  { value: "accuracy", label: "Accuracy" },
  { value: "progress", label: "Progress" },
  { value: "custom", label: "Your order" },
];

const round = "flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-30";

type Prefs = { prefs: BoardPrefs; update: (changes: Partial<BoardPrefs>) => void };

/** Layout, sort and its direction, card size, and whether offline students show. A popped-out board follows these. */
export function BoardControls({ room, prefs, update, className }: Prefs & { room: MockRoom; className?: string }) {
  const custom = prefs.sort === "custom";
  const size = Math.round(prefs.cardSize * 100);
  const nudge = (step: number) => update({ cardSize: Math.min(CARD_SIZE.max, Math.max(CARD_SIZE.min, Math.round((prefs.cardSize + step) * 10) / 10)) });
  const sortBy = (sort: BoardSort) => update({
    sort,
    descending: DEFAULT_DESCENDING[sort],
    // Your order starts from what's on screen now.
    ...(sort === "custom" && !prefs.customOrder.length ? { customOrder: sortKids(room, prefs).map((kid) => kid.id) } : {}),
  });
  return (
    <div role="group" aria-label="Board settings" className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <ScrollRow aria-label="Sort students" className="min-w-0 flex-1 p-0.5">
          <Pills<BoardSort> label="Sort by" value={prefs.sort} onChange={sortBy} options={SORTS} className="shrink-0" />
        </ScrollRow>
        <button type="button" disabled={custom} onClick={() => update({ descending: !prefs.descending })} className={cn(chip, "px-2.5")}
          aria-label={prefs.descending ? "Highest first; switch to lowest first" : "Lowest first; switch to highest first"} title={prefs.descending ? "Highest first" : "Lowest first"}>
          {prefs.descending ? <SortDescendingIcon className="size-4" aria-hidden="true" /> : <SortAscendingIcon className="size-4" aria-hidden="true" />}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Pills<BoardPrefs["layout"]> label="Layout" value={prefs.layout} onChange={(layout) => update({ layout })} className="shrink-0"
          options={[{ value: "cards", label: "Cards", Icon: SquaresFourIcon }, { value: "list", label: "List", Icon: ListIcon }]} />
        <div className="flex min-w-56 flex-1 items-center gap-1">
          <button type="button" className={round} aria-label="Smaller cards" disabled={prefs.cardSize <= CARD_SIZE.min} onClick={() => nudge(-CARD_SIZE.step)}>
            <MagnifyingGlassMinusIcon className="size-4" aria-hidden="true" />
          </button>
          <Slider className="min-w-20 flex-1" aria-label="Card size" min={CARD_SIZE.min} max={CARD_SIZE.max} step={CARD_SIZE.step} value={[prefs.cardSize]}
            onValueChange={([value]) => { if (value !== undefined) update({ cardSize: Math.round(value * 10) / 10 }); }} />
          <button type="button" className={round} aria-label="Bigger cards" disabled={prefs.cardSize >= CARD_SIZE.max} onClick={() => nudge(CARD_SIZE.step)}>
            <MagnifyingGlassPlusIcon className="size-4" aria-hidden="true" />
          </button>
          <span className="w-11 text-right text-xs tabular-nums text-muted-foreground" aria-hidden="true">{size}%</span>
        </div>
        <button type="button" aria-pressed={prefs.showOffline} onClick={() => update({ showOffline: !prefs.showOffline })} className={chip}>
          {prefs.showOffline ? <EyeIcon className="size-4" aria-hidden="true" /> : <EyeSlashIcon className="size-4" aria-hidden="true" />}Offline
        </button>
      </div>
      {custom && <p className="text-xs text-muted-foreground">Drag the dots on a card to move it. Use space and the arrow keys to move one with the keyboard.</p>}
    </div>
  );
}

/** Where the room is: the test, what it waits on, and who's online and finished. */
export function BoardSummary({ room, className }: { room: MockRoom; className?: string }) {
  const online = room.kids.filter((kid) => kid.online);
  const hostPaced = room.pacing === "host";
  const test = room.tests[room.index];
  const finished = hostPaced ? online.filter((kid) => kid.finished).length : selfPacedCounts(room).done;
  const heading = room.status === "lobby" ? `${room.tests.length} tests ready`
    : room.status === "complete" ? "All tests complete"
      : hostPaced ? `Test ${room.index + 1} of ${room.tests.length} · ${room.labels[room.index]?.title}` : "Own pace";
  const detail = room.status === "lobby" ? "Waiting for the host to start"
    : room.status === "complete" ? "Great typing, everyone!"
      : hostPaced ? `${test ? describeConnectTest(test) : ""} · ${room.status === "paused" ? "Paused" : stepLine(room)}` : "Everyone moves through the list at their own speed";
  return (
    <section aria-label="Room progress" className={cn("flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:flex-row sm:items-center", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={room.status} />
          <h2 className="text-xl font-black">{heading}</h2>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">{detail}</p>
        {hostPaced && room.status !== "lobby" && <TestDots tests={room.tests} titles={room.labels.map((label) => label.title)} index={room.status === "complete" ? room.tests.length : room.index} className="max-w-md" />}
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

/** The cards themselves. `interactive` lets the host drag them while the sort is "Your order". */
export function BoardGrid({ room, prefs, update, interactive = false, emptyHint }: Prefs & { room: MockRoom; interactive?: boolean; emptyHint: string }) {
  const sorted = sortKids(room, prefs);
  const shown = sorted.filter((kid) => prefs.showOffline || kid.online);
  const hidden = room.kids.length - shown.length;
  const leader = leaderId(room);
  const sortable = interactive && prefs.sort === "custom";
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    // Keep hidden students in the saved order too, so showing them again keeps their place.
    const ids = sorted.map((kid) => kid.id);
    update({ customOrder: arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))) });
  };
  const style = { fontSize: `${prefs.cardSize}rem` } as CSSProperties;

  if (!shown.length) {
    return (
      <div style={style} className="flex flex-col items-center gap-[0.5em] rounded-[1.4em] border border-dashed border-border px-[1em] py-[3em] text-center text-muted-foreground">
        <UsersThreeIcon weight="regular" className="size-[2.5em]" aria-hidden="true" />
        <p className="font-semibold text-foreground">{room.kids.length ? "Everyone is offline" : "No one has joined yet"}</p>
        <p className="text-[0.875em]">{room.kids.length ? `${hidden} offline ${hidden === 1 ? "student is" : "students are"} hidden.` : emptyHint}</p>
      </div>
    );
  }
  return (
    <div style={style} className="flex flex-col gap-[0.75em]">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={shown.map((kid) => kid.id)} strategy={prefs.layout === "cards" ? rectSortingStrategy : verticalListSortingStrategy} disabled={!sortable}>
          <ul aria-label="Students" className={cn("grid gap-[0.75em]", prefs.layout === "cards" ? "grid-cols-[repeat(auto-fill,minmax(min(100%,15em),1fr))]" : "grid-cols-1")}>
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((kid) => <KidCard key={kid.id} room={room} kid={kid} leader={leader === kid.id} layout={prefs.layout} sortable={sortable} />)}
            </AnimatePresence>
          </ul>
        </SortableContext>
      </DndContext>
      {hidden > 0 && <p className="text-[0.8em] text-muted-foreground">{hidden} offline {hidden === 1 ? "student" : "students"} hidden</p>}
    </div>
  );
}

/** The host's live board: controls, ways to put it on a projector, and the cards. */
export function LiveBoardCard({ room, prefs, update, onShowHere, className }: Prefs & { room: MockRoom; onShowHere: () => void; className?: string }) {
  const section = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen();
  return (
    <div ref={section} className={cn(fullscreen && "h-dvh overflow-y-auto bg-background p-4 sm:p-6", className)}>
      <LabCard title="Live board" description="What the class sees. Put it on the projector, or keep an eye on it here." Icon={ProjectorScreenChartIcon} tile="bg-foreground text-background"
        className={cn(fullscreen && "border-0 bg-transparent p-0 sm:p-0")}
        action={(
          <div className="hidden items-center gap-1 md:flex">
            <OpenButtons fullscreen={fullscreen} onShowHere={onShowHere} onFullscreen={() => void toggleFullscreen(section.current)} />
          </div>
        )}>
        <div className="flex flex-wrap gap-2 md:hidden">
          <OpenButtons fullscreen={fullscreen} onShowHere={onShowHere} onFullscreen={() => void toggleFullscreen(section.current)} />
        </div>
        <BoardControls room={room} prefs={prefs} update={update} />
        <BoardGrid room={room} prefs={prefs} update={update} interactive emptyHint="Share the room code to get students in." />
      </LabCard>
    </div>
  );
}

function OpenButtons({ fullscreen, onShowHere, onFullscreen }: { fullscreen: boolean; onShowHere: () => void; onFullscreen: () => void }) {
  return (
    <>
      <button type="button" onClick={onFullscreen} className={chip}>
        {fullscreen ? <CornersInIcon className="size-4" aria-hidden="true" /> : <CornersOutIcon className="size-4" aria-hidden="true" />}
        {fullscreen ? "Exit fullscreen" : "Fullscreen"}
      </button>
      <AnimatePresence initial={false}>
        {!fullscreen && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap gap-2">
            <button type="button" onClick={popOut} className={chip}><PictureInPictureIcon className="size-4" aria-hidden="true" />Pop out</button>
            <a href={POPOUT_PATH} target="_blank" rel="noopener" className={chip}><ArrowSquareOutIcon className="size-4" aria-hidden="true" />New tab</a>
            <button type="button" onClick={onShowHere} className={chip}><ProjectorScreenChartIcon className="size-4" aria-hidden="true" />Board view</button>
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );
}
