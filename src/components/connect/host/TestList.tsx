import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import { CheckIcon, CopySimpleIcon, DotsSixVerticalIcon, LockSimpleIcon, PencilSimpleIcon, PlusIcon, TimerIcon, TrashIcon, UsersIcon } from "@phosphor-icons/react";
import { ScrollRow } from "@/components/ui/scroll-row";
import type { HostParticipant, HostRoom } from "@/components/connect/types";
import { connectTestLabels } from "@/lib/connect-settings";
import { CONNECT_MAX_TESTS, describeConnectTest, type ConnectTest } from "@/lib/connect-types";
import { cn } from "@/lib/utils";
import { ConnectCard, ICON_BUTTON } from "@/components/connect/ConnectParts";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";
import { TestEditor } from "./TestEditor";
import { hostPacedTestState, lockedThrough, selfPacedCounts, type TestState } from "./host-utils";
import { MODE_ICONS, QUICK_ADD } from "./test-presets";

const NEW = "new";

function move(tests: ConnectTest[], from: number, to: number) {
  const next = [...tests];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function TestItem({ test, index, total, title, state, locked, canMoveUp, full, count, editing, onEdit, onMove, onDuplicate, onRemove, onDragEnd, children }: {
  test: ConnectTest;
  index: number;
  total: number;
  title: string;
  state: TestState;
  locked: boolean;
  canMoveUp: boolean;
  full: boolean;
  count: number | null;
  editing: boolean;
  onEdit: () => void;
  onMove: (to: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onDragEnd: () => void;
  children: ReactNode;
}) {
  const controls = useDragControls();
  const position = index + 1;
  const done = state === "done";
  const current = state === "current";
  const ModeIcon = MODE_ICONS[test.mode];
  const onHandleKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowUp" && canMoveUp) { event.preventDefault(); onMove(index - 1); }
    if (event.key === "ArrowDown" && index < total - 1) { event.preventDefault(); onMove(index + 1); }
  };

  return (
    <Reorder.Item value={test} dragListener={false} dragControls={controls} layout="position" transition={CONNECT_SPRING} onDragEnd={onDragEnd}
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
      aria-current={current ? "step" : undefined} className="relative list-none rounded-2xl bg-card"
      whileDrag={{ scale: 1.02, boxShadow: "0 18px 40px -18px rgb(0 0 0 / 0.5)", zIndex: 5 }}>
      {editing ? children : (
        <>
          {current && <motion.span layoutId="host-current-test" transition={CONNECT_SPRING} className="absolute inset-0 rounded-2xl bg-primary/12 ring-2 ring-inset ring-primary" />}
          <div className={cn("group relative flex items-center gap-2 py-2 pl-1 pr-2", done && "text-muted-foreground")}>
            {locked ? <span className="w-7 shrink-0" aria-hidden="true" /> : (
              <button type="button" aria-label={`Reorder test ${position}: ${title}. Drag, or use the up and down arrow keys.`} onKeyDown={onHandleKey}
                onPointerDown={(event: PointerEvent) => controls.start(event)}
                className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing">
                <DotsSixVerticalIcon className="size-5" aria-hidden="true" />
              </button>
            )}
            <span aria-hidden="true" className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold", done ? "bg-success text-background" : current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {done ? <CheckIcon className="size-4" /> : position}
            </span>
            <ModeIcon className="hidden size-5 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
            <button type="button" disabled={locked} onClick={onEdit} aria-label={locked ? undefined : `Edit test ${position}: ${title}`}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1 py-1 text-left enabled:hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-ring">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  <span className="sr-only">Test {position}: </span>{title}
                  {current && <span className="sr-only"> (current)</span>}
                  {done && <span className="sr-only"> (finished)</span>}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{describeConnectTest(test)}</span>
              </span>
              {!locked && <PencilSimpleIcon className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />}
            </button>
            {count !== null && (
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums" title="Players on this test">
                <UsersIcon className="size-3.5" aria-hidden="true" />{count}<span className="sr-only"> {count === 1 ? "player" : "players"} on this test</span>
              </span>
            )}
            {locked ? (
              <span className="mx-2.5 flex shrink-0 text-muted-foreground" title="Locked while the room runs">
                <LockSimpleIcon className="size-4" aria-hidden="true" /><span className="sr-only">Locked</span>
              </span>
            ) : (
              <span className="flex shrink-0">
                <button type="button" aria-label={`Duplicate test ${position}: ${title}`} title="Duplicate" disabled={full} onClick={onDuplicate} className={cn(ICON_BUTTON, "hidden sm:flex")}>
                  <CopySimpleIcon className="size-4" aria-hidden="true" />
                </button>
                <button type="button" aria-label={`Remove test ${position}: ${title}`} title="Remove" disabled={total <= 1} onClick={onRemove}
                  className={cn(ICON_BUTTON, "hover:bg-destructive/10 hover:text-destructive")}>
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

/** The host's test list: drag or arrow keys to reorder, tap a test to edit it in place, quick-add common tests. */
export function TestsCard({ room, tests, participants, onSave, className }: {
  room: HostRoom;
  tests: ConnectTest[];
  participants: HostParticipant[];
  onSave: (tests: ConnectTest[]) => Promise<boolean>;
  className?: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragOrder, setDragOrder] = useState<ConnectTest[] | null>(null);
  const dragRef = useRef<ConnectTest[] | null>(null);
  const list = dragOrder ?? tests;
  const labels = connectTestLabels(list);
  const lockedIndex = lockedThrough(room, participants);
  const selfPaced = room.pacing === "participant" && room.status !== "lobby";
  const counts = selfPaced ? selfPacedCounts(tests.length, participants) : null;
  const full = tests.length >= CONNECT_MAX_TESTS;
  const editing = tests.find((test) => test.id === editingId) ?? null;

  const save = (next: ConnectTest[]) => {
    if (editingId && editingId !== NEW && !next.some((test) => test.id === editingId)) setEditingId(null);
    return onSave(next);
  };
  // Dragging moves unlocked tests only; the order is saved once, when the drag ends.
  const reorder = (next: ConnectTest[]) => {
    const keeps = tests.slice(0, lockedIndex + 1).every((test, index) => next[index]?.id === test.id);
    if (!keeps) return;
    dragRef.current = next;
    setDragOrder(next);
  };
  const finishDrag = () => {
    const next = dragRef.current;
    dragRef.current = null;
    setDragOrder(null);
    if (next && next.some((test, index) => test.id !== tests[index]?.id)) void save(next);
  };
  const autoTitle = (position: number) => (test: ConnectTest) => {
    const draft = [...tests];
    draft[position] = { ...test, title: undefined };
    return connectTestLabels(draft)[position].title;
  };
  const editor = (test: ConnectTest | null, position: number) => (
    <TestEditor key={test?.id ?? NEW} editing={test} full={full} canRemove={tests.length > 1} autoTitle={autoTitle(position)}
      onCancel={() => setEditingId(null)}
      onSave={async (saved) => {
        const ok = await save(test ? tests.map((item) => (item.id === saved.id ? saved : item)) : [...tests, saved]);
        if (ok) setEditingId(null);
        return ok;
      }}
      onDuplicate={test ? () => { setEditingId(null); void save([...tests.slice(0, position + 1), { ...test, id: crypto.randomUUID() }, ...tests.slice(position + 1)]); } : undefined}
      onRemove={test ? () => { setEditingId(null); void save(tests.filter((item) => item.id !== test.id)); } : undefined} />
  );

  return (
    <ConnectCard title="Tests" description={`${tests.length} of ${CONNECT_MAX_TESTS}`} Icon={TimerIcon} tile="bg-warning text-background" className={className}>
      <AnimatePresence initial={false}>
        {lockedIndex >= 0 && room.status !== "complete" && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="-mt-1 flex items-center gap-2 overflow-hidden text-xs text-muted-foreground">
            <LockSimpleIcon className="size-4 shrink-0" aria-hidden="true" />Tests already reached are locked while the room runs. Later ones can still change.
          </motion.p>
        )}
      </AnimatePresence>
      <Reorder.Group as="ol" axis="y" values={list} onReorder={reorder} className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {list.map((test, index) => (
            <TestItem key={test.id} test={test} index={index} total={list.length} title={labels[index]?.title ?? ""}
              state={selfPaced ? "upcoming" : hostPacedTestState(index, room.status, room.currentIndex)}
              locked={index <= lockedIndex} canMoveUp={index - 1 > lockedIndex} full={full}
              count={counts ? counts.perTest[index] ?? 0 : null} editing={editingId === test.id}
              onEdit={() => setEditingId(test.id)}
              onMove={(to) => void save(move(tests, index, to))}
              onDuplicate={() => void save([...tests.slice(0, index + 1), { ...test, id: crypto.randomUUID() }, ...tests.slice(index + 1)])}
              onRemove={() => void save(tests.filter((item) => item.id !== test.id))}
              onDragEnd={finishDrag}>
              {editingId === test.id && editing && editor(editing, index)}
            </TestItem>
          ))}
        </AnimatePresence>
      </Reorder.Group>
      {counts && <p className="text-sm text-muted-foreground">{counts.done} finished every test.</p>}
      <AnimatePresence mode="popLayout" initial={false}>
        {editingId === NEW ? (
          <motion.div key="editor" layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={CONNECT_SPRING}>
            {editor(null, tests.length)}
          </motion.div>
        ) : (
          <motion.div key="add" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={CONNECT_SPRING} className="flex flex-col gap-3 border-t border-border pt-4">
            <button type="button" disabled={full} onClick={() => setEditingId(NEW)}
              className="flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-bold text-background hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40">
              <PlusIcon className="size-4" aria-hidden="true" />Add a test or break
            </button>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Or quick add</p>
            <ScrollRow aria-label="Quick add tests" expandable expandLabel="All" className="p-0.5">
              {QUICK_ADD.map(({ label, test }) => {
                const ModeIcon = MODE_ICONS[test.mode];
                return (
                  <motion.button key={label} type="button" whileTap={{ scale: 0.92 }} disabled={full} onClick={() => void save([...tests, { ...test, id: crypto.randomUUID() }])}
                    className="flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-border px-4 text-sm font-medium hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40">
                    <PlusIcon className="size-3.5" aria-hidden="true" /><ModeIcon className="size-4" aria-hidden="true" />{label}
                  </motion.button>
                );
              })}
            </ScrollRow>
          </motion.div>
        )}
      </AnimatePresence>
    </ConnectCard>
  );
}
