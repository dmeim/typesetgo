import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  CoffeeIcon,
  CopySimpleIcon,
  LockSimpleIcon,
  PencilSimpleIcon,
  TrashIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { HostParticipant, HostRoom } from "@/components/connect/types";
import { connectTestLabels } from "@/lib/connect-settings";
import { CONNECT_MAX_TESTS, type ConnectTest } from "@/lib/connect-types";
import { cn } from "@/lib/utils";
import { hostPacedTestState, lockedThrough, selfPacedCounts, type TestState } from "./host-utils";

const STATE_STYLES: Record<TestState, string> = {
  current: "border-primary bg-primary/10 ring-2 ring-primary",
  done: "border-border bg-muted/40 text-muted-foreground",
  upcoming: "border-border bg-background",
};

function moveTest(tests: ConnectTest[], from: number, to: number) {
  const next = [...tests];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function TestList({ room, tests, participants, editingId, onEdit, onSave }: {
  room: HostRoom;
  tests: ConnectTest[];
  participants: HostParticipant[];
  editingId: string | null;
  onEdit: (test: ConnectTest) => void;
  onSave: (tests: ConnectTest[]) => void;
}) {
  const labels = connectTestLabels(tests);
  const locked = lockedThrough(room, participants);
  const selfPaced = room.pacing === "participant" && room.status !== "lobby";
  const counts = selfPaced ? selfPacedCounts(tests.length, participants) : null;
  const full = tests.length >= CONNECT_MAX_TESTS;

  return (
    <section aria-labelledby="connect-tests-heading" className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-4 text-card-foreground sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="connect-tests-heading" className="text-lg font-semibold">Tests</h2>
        <span className="text-sm text-muted-foreground">{tests.length} of {CONNECT_MAX_TESTS}</span>
      </div>
      {locked >= 0 && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LockSimpleIcon className="size-4 shrink-0" aria-hidden="true" />
          Tests already reached are locked while the room runs. Later tests can still change.
        </p>
      )}
      <ol className="space-y-2">
        {tests.map((test, index) => {
          const label = labels[index];
          const isLocked = index <= locked;
          const state: TestState = selfPaced ? "upcoming" : hostPacedTestState(index, room.status, room.currentIndex);
          const position = index + 1;
          const onTest = counts?.perTest[index] ?? 0;
          return (
            <li
              key={test.id}
              aria-current={state === "current" ? "step" : undefined}
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2 transition-colors",
                STATE_STYLES[state],
                editingId === test.id && "border-dashed border-primary",
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground" aria-hidden="true">
                {state === "done" ? <CheckCircleIcon className="size-4" weight="fill" /> : position}
              </span>
              <div className="min-w-[8rem] flex-1">
                <p className="break-words text-sm font-medium">
                  <span className="sr-only">Test {position}: </span>
                  {test.mode === "break" && <CoffeeIcon className="mr-1.5 inline size-4 align-[-0.15em] text-muted-foreground" aria-hidden="true" />}
                  {label.title}
                  {state === "current" && <span className="sr-only"> (current)</span>}
                  {state === "done" && <span className="sr-only"> (finished)</span>}
                </p>
                <p className="text-xs text-muted-foreground">{label.detail}</p>
              </div>
              {counts && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground" title="Participants on this test">
                  <UsersIcon className="size-3.5" aria-hidden="true" />
                  {onTest}
                  <span className="sr-only"> {onTest === 1 ? "participant" : "participants"} on this test</span>
                </span>
              )}
              {isLocked ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <LockSimpleIcon className="size-4" aria-hidden="true" />
                  Locked
                </span>
              ) : (
                <div className="ml-auto flex items-center gap-0.5">
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit test ${position}`} onClick={() => onEdit(test)}>
                    <PencilSimpleIcon aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Duplicate test ${position}`} disabled={full}
                    onClick={() => onSave([...tests.slice(0, index + 1), { ...test, id: crypto.randomUUID() }, ...tests.slice(index + 1)])}>
                    <CopySimpleIcon aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move test ${position} up`} disabled={index === 0 || index - 1 <= locked}
                    onClick={() => onSave(moveTest(tests, index, index - 1))}>
                    <ArrowUpIcon aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move test ${position} down`} disabled={index === tests.length - 1}
                    onClick={() => onSave(moveTest(tests, index, index + 1))}>
                    <ArrowDownIcon aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove test ${position}`} disabled={tests.length <= 1}
                    onClick={() => onSave(tests.filter((item) => item.id !== test.id))}>
                    <TrashIcon aria-hidden="true" />
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {counts && <p className="text-sm text-muted-foreground">{counts.done} finished every test.</p>}
    </section>
  );
}
