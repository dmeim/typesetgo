import { useMemo, type CSSProperties } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AnimatePresence } from "framer-motion";
import { UsersThreeIcon } from "@phosphor-icons/react";
import type { BoardPrefs } from "@/hooks/useConnectBoardPrefs";
import type { HostParticipant, HostRoom } from "@/components/connect/types";
import { connectTestLabels } from "@/lib/connect-settings";
import { useNow } from "@/hooks/useNow";
import { cn } from "@/lib/utils";
import { CARD_SIZE, leaderId, onBreak, reorderIds, sortParticipants, visibleParticipants } from "@/components/connect/board/board-model";
import { ParticipantCard } from "@/components/connect/board/ParticipantCard";
import { BoardSummary } from "@/components/connect/board/BoardSummary";

export interface ParticipantBoardProps {
  room: HostRoom;
  participants: HostParticipant[];
  prefs: BoardPrefs;
  /** Persists drag-to-reorder while the sort is "Your order"; omitted on the read-only pop-out board. */
  onReorder?: (customOrder: string[]) => void;
  /** Shows the room progress strip above the cards (default true). */
  showSummary?: boolean;
  /** Text shown when nobody has joined yet. */
  emptyHint?: string;
  className?: string;
}

const clampScale = (value: number) => Math.min(CARD_SIZE.max, Math.max(CARD_SIZE.min, Number.isFinite(value) ? value : 1));

export function ParticipantBoard({
  room, participants, prefs, onReorder, showSummary = true, emptyHint = "Students join at /connect/join with the room code.", className,
}: ParticipantBoardProps) {
  const labels = useMemo(() => connectTestLabels(room.tests), [room.tests]);
  const shown = useMemo(() => visibleParticipants(room, participants, prefs), [room, participants, prefs]);
  const hiddenCount = participants.length - shown.length;
  const leader = useMemo(() => leaderId(room, participants), [room, participants]);
  const ticking = room.status === "running" && participants.some((participant) => onBreak(room, participant));
  // Break countdowns tick on the board; nothing else needs a clock.
  const now = useNow(ticking, 1000);
  const sortable = Boolean(onReorder) && prefs.sort === "custom";
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!onReorder || !over || active.id === over.id) return;
    // Persist the full order, including hidden participants, so showing them again keeps their place.
    const base = sortParticipants(room, participants, prefs).map((participant) => participant._id);
    onReorder(reorderIds(base, String(active.id), String(over.id)));
  };

  const style = { fontSize: `${clampScale(prefs.cardSize)}rem` } as CSSProperties;
  const cards = shown.map((participant) => (
    <ParticipantCard key={participant._id} room={room} participant={participant} labels={labels} layout={prefs.layout} now={now}
      sortable={sortable} showPicture={prefs.showPictures} leader={leader === participant._id} />
  ));

  return (
    <div className={cn("flex flex-col gap-4", className)} data-layout={prefs.layout}>
      {showSummary && <BoardSummary room={room} participants={participants} labels={labels} />}
      <div style={style} className="flex flex-col gap-[0.75em]">
        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-[0.5em] rounded-[1.4em] border border-dashed border-border px-[1em] py-[3em] text-center text-muted-foreground">
            <UsersThreeIcon weight="regular" className="size-[2.5em]" aria-hidden="true" />
            <p className="font-semibold text-foreground">{participants.length === 0 ? "No one has joined yet" : "Everyone is offline"}</p>
            <p className="text-[0.875em]">
              {participants.length === 0 ? emptyHint : `${hiddenCount} offline ${hiddenCount === 1 ? "player is" : "players are"} hidden.`}
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={shown.map((participant) => participant._id)} strategy={prefs.layout === "grid" ? rectSortingStrategy : verticalListSortingStrategy} disabled={!sortable}>
              <ul aria-label="Players" className={cn("grid gap-[0.75em]", prefs.layout === "grid" ? "grid-cols-[repeat(auto-fill,minmax(min(100%,15em),1fr))]" : "grid-cols-1")}>
                {sortable ? cards : <AnimatePresence initial={false} mode="popLayout">{cards}</AnimatePresence>}
              </ul>
            </SortableContext>
          </DndContext>
        )}
        {shown.length > 0 && hiddenCount > 0 && (
          <p className="text-[0.8em] text-muted-foreground">{hiddenCount} offline {hiddenCount === 1 ? "player" : "players"} hidden</p>
        )}
      </div>
    </div>
  );
}
