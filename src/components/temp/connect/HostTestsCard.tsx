import { useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import { CheckIcon, CopySimpleIcon, DotsSixVerticalIcon, LockSimpleIcon, PencilSimpleIcon, PlusIcon, TimerIcon, TrashIcon, UsersIcon } from "@phosphor-icons/react";
import { ScrollRow } from "@/components/ui/scroll-row";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { connectTestLabels } from "@/lib/connect-settings";
import { CONNECT_MAX_TESTS, describeConnectTest, type ConnectTest } from "@/lib/connect-types";
import { cn } from "@/lib/utils";
import { MODE_ICONS, QUICK_ADD } from "./connect-mock";
import { LabCard } from "./ConnectParts";
import { TestEditor } from "./TestEditor";
import { selfPacedCounts } from "./room-text";
import type { MockRoom } from "./use-mock-room";

const NEW = "new";
const iconButton = "flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-30";

function move(tests: ConnectTest[], from: number, to: number) {
  const next = [...tests];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Highest test index that can't change: everything already reached while the room runs. */
function lockedThrough(room: MockRoom) {
  if (room.status === "lobby") return -1;
  if (room.status === "complete") return room.tests.length - 1;
  return room.pacing === "host" ? room.index : Math.max(-1, ...room.kids.map((kid) => Math.min(kid.step, room.tests.length - 1)));
}

function TestItem({ room, test, index, locked, lockedIndex, editing, count, onEdit, onReorder, children }: {
  room: MockRoom;
  test: ConnectTest;
  index: number;
  locked: boolean;
  lockedIndex: number;
  editing: boolean;
  count: number | null;
  onEdit: () => void;
  onReorder: (tests: ConnectTest[]) => void;
  children: ReactNode;
}) {
  const controls = useDragControls();
  const selfPaced = room.pacing === "participant";
  const done = !selfPaced && room.status !== "lobby" && (room.status === "complete" || index < room.index);
  const current = !selfPaced && room.status !== "lobby" && room.status !== "complete" && index === room.index;
  const ModeIcon = MODE_ICONS[test.mode];
  const title = room.labels[index]?.title ?? "";
  const canMoveUp = index - 1 > lockedIndex;
  const canMoveDown = index < room.tests.length - 1;
  const onHandleKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowUp" && canMoveUp) { event.preventDefault(); onReorder(move(room.tests, index, index - 1)); }
    if (event.key === "ArrowDown" && canMoveDown) { event.preventDefault(); onReorder(move(room.tests, index, index + 1)); }
  };

  return (
    <Reorder.Item value={test} dragListener={false} dragControls={controls} layout="position" transition={LAB_SPRING}
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
      aria-current={current ? "step" : undefined} className="relative list-none rounded-2xl bg-card"
      whileDrag={{ scale: 1.02, boxShadow: "0 18px 40px -18px rgb(0 0 0 / 0.5)", zIndex: 5 }}>
      {editing ? children : (
        <>
          {current && <motion.span layoutId="host-current-test" transition={LAB_SPRING} className="absolute inset-0 rounded-2xl bg-primary/12 ring-2 ring-inset ring-primary" />}
          <div className={cn("group relative flex items-center gap-2 py-2 pl-1 pr-2", done && "text-muted-foreground")}>
            {locked ? <span className="w-7 shrink-0" aria-hidden="true" /> : (
              <button type="button" aria-label={`Reorder ${title}. Drag, or use the up and down arrow keys.`} onKeyDown={onHandleKey}
                onPointerDown={(event: PointerEvent) => controls.start(event)}
                className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing">
                <DotsSixVerticalIcon className="size-5" aria-hidden="true" />
              </button>
            )}
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold", done ? "bg-success text-background" : current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {done ? <CheckIcon className="size-4" aria-label="Done" /> : index + 1}
            </span>
            <ModeIcon className="hidden size-5 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
            <button type="button" disabled={locked} onClick={onEdit} aria-label={locked ? undefined : `Edit ${title}`}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1 py-1 text-left enabled:hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-ring">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{title}</span>
                <span className="block truncate text-xs text-muted-foreground">{describeConnectTest(test)}</span>
              </span>
              {!locked && <PencilSimpleIcon className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />}
            </button>
            {count !== null && (
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums" title="Players on this test">
                <UsersIcon className="size-3.5" aria-hidden="true" />{count}<span className="sr-only"> players on this test</span>
              </span>
            )}
            {locked ? (
              <LockSimpleIcon className="mx-2.5 size-4 shrink-0 text-muted-foreground" aria-label="Locked while the room runs" />
            ) : (
              <span className="flex shrink-0">
                <button type="button" aria-label={`Duplicate ${title}`} title="Duplicate" disabled={room.tests.length >= CONNECT_MAX_TESTS} onClick={() => room.actions.duplicateTest(test.id)} className={cn(iconButton, "hidden sm:flex")}>
                  <CopySimpleIcon className="size-4" aria-hidden="true" />
                </button>
                <button type="button" aria-label={`Remove ${title}`} title="Remove" disabled={room.tests.length <= 1} onClick={() => room.actions.removeTest(test.id)}
                  className={cn(iconButton, "hover:bg-destructive/10 hover:text-destructive")}>
                  <TrashIcon className="size-4" aria-hidden="true" />
                </button>
              </span>
            )}
          </div>
        </>
      )}
    </Reorder.Item>
  );
}

export function TestsCard({ room, className }: { room: MockRoom; className?: string }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const lockedIndex = lockedThrough(room);
  const selfPaced = room.pacing === "participant" && room.status !== "lobby";
  const counts = selfPaced ? selfPacedCounts(room) : null;
  const full = room.tests.length >= CONNECT_MAX_TESTS;
  const editing = room.tests.find((test) => test.id === editingId) ?? null;

  // Dragging may move unlocked tests only; the reached ones keep their place.
  const reorder = (next: ConnectTest[]) => {
    const keeps = room.tests.slice(0, lockedIndex + 1).every((test, index) => next[index]?.id === test.id);
    if (keeps) room.actions.setTests(next);
  };
  const autoTitle = (position: number) => (test: ConnectTest) => {
    const list = [...room.tests];
    list[position] = { ...test, title: undefined };
    return connectTestLabels(list)[position].title;
  };
  const editor = (test: ConnectTest | null, position: number) => (
    <TestEditor key={test?.id ?? NEW} editing={test} full={full} canRemove={room.tests.length > 1} autoTitle={autoTitle(position)}
      onCancel={() => setEditingId(null)}
      onSave={(saved) => { room.actions.saveTest(saved); setEditingId(null); }}
      onDuplicate={test ? () => { room.actions.duplicateTest(test.id); setEditingId(null); } : undefined}
      onRemove={test ? () => { room.actions.removeTest(test.id); setEditingId(null); } : undefined} />
  );

  return (
    <LabCard title="Tests" description={`${room.tests.length} of ${CONNECT_MAX_TESTS}`} Icon={TimerIcon} tile="bg-warning text-background" className={className}>
      <AnimatePresence initial={false}>
        {lockedIndex >= 0 && room.status !== "complete" && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="-mt-1 flex items-center gap-2 overflow-hidden text-xs text-muted-foreground">
            <LockSimpleIcon className="size-4 shrink-0" aria-hidden="true" />Tests already reached are locked while the room runs. Later ones can still change.
          </motion.p>
        )}
      </AnimatePresence>
      <Reorder.Group axis="y" values={room.tests} onReorder={reorder} className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {room.tests.map((test, index) => (
            <TestItem key={test.id} room={room} test={test} index={index} locked={index <= lockedIndex} lockedIndex={lockedIndex}
              editing={editingId === test.id} count={counts ? counts.perTest[index] : null} onEdit={() => setEditingId(test.id)} onReorder={room.actions.setTests}>
              {editingId === test.id && editor(editing, index)}
            </TestItem>
          ))}
        </AnimatePresence>
      </Reorder.Group>
      {counts && <p className="text-sm text-muted-foreground">{counts.done} finished every test.</p>}
      <AnimatePresence mode="popLayout" initial={false}>
        {editingId === NEW ? (
          <motion.div key="editor" layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={LAB_SPRING}>
            {editor(null, room.tests.length)}
          </motion.div>
        ) : (
          <motion.div key="add" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={LAB_SPRING} className="flex flex-col gap-3 border-t border-border pt-4">
            <button type="button" disabled={full} onClick={() => setEditingId(NEW)}
              className="flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-bold text-background hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40">
              <PlusIcon className="size-4" aria-hidden="true" />Add a test or break
            </button>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Or quick add</p>
            <ScrollRow aria-label="Quick add tests" expandable expandLabel="All" className="p-0.5">
              {QUICK_ADD.map(({ label, test }) => {
                const ModeIcon = MODE_ICONS[test.mode];
                return (
                  <motion.button key={label} type="button" whileTap={{ scale: 0.92 }} disabled={full} onClick={() => room.actions.addTest(test)}
                    className="flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-border px-4 text-sm font-medium hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40">
                    <PlusIcon className="size-3.5" aria-hidden="true" /><ModeIcon className="size-4" aria-hidden="true" />{label}
                  </motion.button>
                );
              })}
            </ScrollRow>
          </motion.div>
        )}
      </AnimatePresence>
    </LabCard>
  );
}
