import { useMemo, type CSSProperties } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { UsersThreeIcon } from "@phosphor-icons/react";
import type { BoardPrefs } from "@/hooks/useConnectBoardPrefs";
import type { HostParticipant, HostRoom } from "@/components/connect/types";
import { connectTestLabels } from "@/lib/connect-settings";
import { cn } from "@/lib/utils";
import { reorderIds, sortParticipants, visibleParticipants } from "@/components/connect/board/board-model";
import { ParticipantCard } from "@/components/connect/board/ParticipantCard";
import { BoardSummary } from "@/components/connect/board/BoardSummary";

export interface ParticipantBoardProps {
  room: HostRoom;
  participants: HostParticipant[];
  prefs: BoardPrefs;
  /** Persists drag-to-reorder; omitted on the read-only pop-out board. */
  onReorder?: (customOrder: string[]) => void;
  /** Host-tab only actions; omitted on the pop-out board. */
  onReset?: (participant: HostParticipant) => void;
  onRemove?: (participant: HostParticipant) => void;
  /**
   * Lets a drag switch the board to custom order. Without it, drag handles only
   * appear while the sort is already "custom".
   */
  onPrefsChange?: (changes: Partial<BoardPrefs>) => void;
  /** Shows the shared-test / room overview strip above the cards (default true). */
  showSummary?: boolean;
  /** Text shown when nobody has joined yet. */
  emptyHint?: string;
  className?: string;
}

const clampScale = (value: number) => Math.min(1.6, Math.max(0.8, Number.isFinite(value) ? value : 1));

export function ParticipantBoard({
  room,
  participants,
  prefs,
  onReorder,
  onReset,
  onRemove,
  onPrefsChange,
  showSummary = true,
  emptyHint = "Students join at /connect/join with the room code.",
  className,
}: ParticipantBoardProps) {
  const labels = useMemo(() => connectTestLabels(room.tests), [room.tests]);
  const shown = useMemo(() => visibleParticipants(room, participants, prefs), [room, participants, prefs]);
  const hiddenCount = participants.length - shown.length;
  const sortable = Boolean(onReorder) && (prefs.sort === "custom" || Boolean(onPrefsChange));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!onReorder || !over || active.id === over.id) return;
    // Persist the full order, including hidden participants, so toggling filters keeps positions.
    const base = sortParticipants(room, participants, prefs).map((participant) => participant._id);
    onReorder(reorderIds(base, String(active.id), String(over.id)));
    if (prefs.sort !== "custom") onPrefsChange?.({ sort: "custom", descending: false });
  };

  const style = { fontSize: `${clampScale(prefs.cardSize)}rem` } as CSSProperties;
  const ids = shown.map((participant) => participant._id);

  return (
    <div className={cn("space-y-[1em]", className)} style={style} data-layout={prefs.layout}>
      {showSummary && <BoardSummary room={room} participants={participants} labels={labels} />}
      {shown.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-[0.5em] rounded-[0.75em] border border-dashed border-border px-[1em] py-[3em] text-center text-muted-foreground">
          <UsersThreeIcon weight="regular" className="size-[2.5em]" aria-hidden="true" />
          <p className="text-[1em] font-medium text-foreground">
            {participants.length === 0 ? "No one has joined yet" : "Everyone is offline"}
          </p>
          <p className="text-[0.875em]">
            {participants.length === 0 ? emptyHint : `${hiddenCount} offline ${hiddenCount === 1 ? "participant is" : "participants are"} hidden.`}
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={prefs.layout === "grid" ? rectSortingStrategy : verticalListSortingStrategy} disabled={!sortable}>
            <ul
              aria-label="Participants"
              className={prefs.layout === "grid" ? "grid gap-[0.75em]" : "flex flex-col gap-[0.4em]"}
              style={prefs.layout === "grid" ? { gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 15em), 1fr))" } : undefined}
            >
              {shown.map((participant) => (
                <ParticipantCard
                  key={participant._id}
                  room={room}
                  participant={participant}
                  labels={labels}
                  layout={prefs.layout}
                  sortable={sortable}
                  onReset={onReset}
                  onRemove={onRemove}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {shown.length > 0 && hiddenCount > 0 && (
        <p className="text-[0.8em] text-muted-foreground">
          {hiddenCount} offline {hiddenCount === 1 ? "participant" : "participants"} hidden
        </p>
      )}
    </div>
  );
}
