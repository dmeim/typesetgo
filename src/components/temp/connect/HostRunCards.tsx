import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowClockwiseIcon, ArrowFatRightIcon, ArrowLeftIcon, ArrowsCounterClockwiseIcon, CheckIcon, ConfettiIcon, FlagCheckeredIcon,
  LockSimpleIcon, PauseIcon, PlayIcon, PlusIcon, RocketLaunchIcon, TimerIcon, TrashIcon, UsersIcon,
} from "@phosphor-icons/react";
import { ScrollRow } from "@/components/ui/scroll-row";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { cn } from "@/lib/utils";
import { MAX_TESTS, MODE_ICONS, QUICK_ADD, testDetail, type Pacing } from "./connect-mock";
import { LabCard, Pills, StatusBadge, TestDots } from "./ConnectParts";
import { selfPacedCounts, stepLine } from "./room-text";
import type { MockRoom } from "./use-mock-room";

const PACING_HELP: Record<Pacing, string> = {
  host: "Everyone moves through the list together. Next and Previous move the whole room.",
  participant: "Everyone works through the list at their own speed once you start.",
};

const secondary = "flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40";

function Headline({ room }: { room: MockRoom }) {
  const total = room.tests.length;
  let title: string;
  let detail: string;
  if (room.status === "lobby") {
    title = `${total} tests ready`;
    detail = "Start when everyone has joined.";
  } else if (room.status === "complete") {
    title = "That's a wrap!";
    detail = `All ${total} tests are done. Nice work, everyone.`;
  } else if (room.pacing === "host") {
    title = `Test ${Math.min(room.index + 1, total)} of ${total} · ${room.tests[room.index]?.title ?? ""}`;
    detail = room.status === "paused" ? "Paused. Everyone's progress is kept." : stepLine(room);
  } else {
    const { perTest, done } = selfPacedCounts(room);
    title = "Own pace";
    detail = [...perTest.flatMap((count, index) => count ? [`${count} on test ${index + 1}`] : []), `${done} done`].join(" · ");
  }
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={LAB_SPRING} className="flex items-center gap-3">
        {room.status === "complete" && <ConfettiIcon weight="fill" className="size-8 shrink-0 text-warning" aria-hidden="true" />}
        <div className="min-w-0">
          <p className="text-xl font-bold">{title}</p>
          <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">{detail}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/** The one big button: Start, Pause, Resume or Start again. */
function MainButton({ room }: { room: MockRoom }) {
  const { status } = room;
  const [label, ButtonIcon, onClick] = status === "running" ? ["Pause", PauseIcon, room.actions.pause] as const
    : status === "paused" ? ["Resume", PlayIcon, room.actions.start] as const
      : status === "complete" ? ["Start again", ArrowClockwiseIcon, room.actions.start] as const
        : ["Start", RocketLaunchIcon, room.actions.start] as const;
  return (
    <motion.button layout type="button" onClick={onClick} transition={LAB_SPRING} whileTap={{ scale: 0.96 }}
      className={cn("flex h-12 items-center gap-2 rounded-full px-6 text-base font-bold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        status === "running" ? "bg-warning text-background" : "bg-primary text-primary-foreground")}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={label} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={LAB_SPRING} className="flex items-center gap-2">
          <ButtonIcon weight="fill" className="size-5" aria-hidden="true" />{label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

export function RunCard({ room, className }: { room: MockRoom; className?: string }) {
  const active = room.status === "running" || room.status === "paused";
  const last = room.index >= room.tests.length - 1;
  return (
    <LabCard title="Run the room" Icon={PlayIcon} action={<StatusBadge status={room.status} />} className={className}>
      <Headline room={room} />
      {room.pacing === "host" && room.status !== "lobby" && <TestDots tests={room.tests} index={room.status === "complete" ? room.tests.length : room.index} />}
      <motion.div layout transition={LAB_SPRING} className="flex flex-wrap items-center gap-2">
        <MainButton room={room} />
        <AnimatePresence initial={false} mode="popLayout">
          {active && room.pacing === "host" && (
            <motion.div key="steps" layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={LAB_SPRING} className="flex flex-wrap gap-2">
              <button type="button" className={secondary} disabled={room.index <= 0} onClick={() => room.actions.goTo(room.index - 1)}>
                <ArrowLeftIcon className="size-4" aria-hidden="true" />Previous
              </button>
              <button type="button" className={secondary} onClick={() => room.actions.goTo(room.index + 1)}>
                {last ? <FlagCheckeredIcon className="size-4" aria-hidden="true" /> : <ArrowFatRightIcon className="size-4" aria-hidden="true" />}{last ? "Finish" : "Next test"}
              </button>
            </motion.div>
          )}
          {active && (
            <motion.button key="restart" layout type="button" className={secondary} onClick={room.actions.restartTest}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={LAB_SPRING}>
              <ArrowClockwiseIcon className="size-4" aria-hidden="true" />Restart test
            </motion.button>
          )}
        </AnimatePresence>
        {room.status !== "lobby" && (
          <button type="button" onClick={room.actions.reset} className="ml-auto flex h-10 items-center gap-2 rounded-full px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            <ArrowsCounterClockwiseIcon className="size-4" aria-hidden="true" />Reset room
          </button>
        )}
      </motion.div>
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <Pills<Pacing> label="Pacing" value={room.pacing} onChange={room.actions.setPacing} disabled={room.status !== "lobby"} className="sm:max-w-sm"
          options={[{ value: "host", label: "Together" }, { value: "participant", label: "Own pace" }]} />
        <p className="text-xs text-muted-foreground">{PACING_HELP[room.pacing]}{room.status !== "lobby" && " Reset the room to change this."}</p>
      </div>
    </LabCard>
  );
}

export function TestsCard({ room, className }: { room: MockRoom; className?: string }) {
  const selfPaced = room.pacing === "participant" && room.status !== "lobby";
  const counts = selfPaced ? selfPacedCounts(room) : null;
  const reached = room.status === "lobby" ? -1 : room.pacing === "host" ? room.index : Math.max(...room.kids.map((kid) => kid.step));
  return (
    <LabCard title="Tests" description={`${room.tests.length} of ${MAX_TESTS}`} Icon={TimerIcon} tile="bg-warning text-background" className={className}>
      <ol className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {room.tests.map((test, index) => {
            const done = !selfPaced && room.status !== "lobby" && (room.status === "complete" || index < room.index);
            const current = !selfPaced && room.status !== "lobby" && room.status !== "complete" && index === room.index;
            const locked = index <= reached;
            const ModeIcon = MODE_ICONS[test.mode];
            return (
              <motion.li key={test.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={LAB_SPRING}
                aria-current={current ? "step" : undefined} className="relative overflow-hidden rounded-2xl">
                {current && <motion.span layoutId="host-current-test" transition={LAB_SPRING} className="absolute inset-0 rounded-2xl bg-primary/12 ring-2 ring-inset ring-primary" />}
                <div className={cn("relative flex items-center gap-3 px-3 py-2.5", done && "text-muted-foreground")}>
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold", done ? "bg-success text-background" : current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    {done ? <CheckIcon className="size-4" aria-label="Done" /> : index + 1}
                  </span>
                  <ModeIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{test.title}</span>
                    <span className="block text-xs text-muted-foreground">{testDetail(test)}</span>
                  </span>
                  {counts && (
                    <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums" title="Players on this test">
                      <UsersIcon className="size-3.5" aria-hidden="true" />{counts.perTest[index]}<span className="sr-only"> players on this test</span>
                    </span>
                  )}
                  {locked ? (
                    <LockSimpleIcon className="size-4 shrink-0 text-muted-foreground" aria-label="Locked while the room runs" />
                  ) : (
                    <button type="button" aria-label={`Remove ${test.title}`} disabled={room.tests.length <= 1} onClick={() => room.actions.removeTest(test.id)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-30">
                      <TrashIcon className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick add</p>
        <ScrollRow aria-label="Quick add tests" expandable expandLabel="All" className="p-0.5">
          {QUICK_ADD.map((test) => {
            const ModeIcon = MODE_ICONS[test.mode];
            return (
              <motion.button key={test.title} type="button" whileTap={{ scale: 0.92 }} disabled={room.tests.length >= MAX_TESTS} onClick={() => room.actions.addTest(test)}
                className="flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-border px-4 text-sm font-medium hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40">
                <PlusIcon className="size-3.5" aria-hidden="true" /><ModeIcon className="size-4" aria-hidden="true" />{test.title}
              </motion.button>
            );
          })}
        </ScrollRow>
      </div>
    </LabCard>
  );
}
