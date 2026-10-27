import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowClockwiseIcon, ArrowFatRightIcon, ArrowLeftIcon, ArrowsCounterClockwiseIcon, ConfettiIcon, FlagCheckeredIcon, PauseIcon, PlayIcon, RocketLaunchIcon,
} from "@phosphor-icons/react";
import type { HostParticipant, HostRoom } from "@/components/connect/types";
import { connectTestLabels } from "@/lib/connect-settings";
import type { ConnectPacing, ConnectTest } from "@/lib/connect-types";
import { useNow } from "@/hooks/useNow";
import { cn } from "@/lib/utils";
import { stepLine } from "@/components/connect/board/board-model";
import { StatusBadge, TestDots } from "@/components/connect/ConnectBadges";
import { ConnectCard, Pills, TwoTapButton } from "@/components/connect/ConnectParts";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";
import { selfPacedCounts } from "./host-utils";
import type { HostRoomActions } from "./use-host-room";

const PACING_HELP: Record<ConnectPacing, string> = {
  host: "Everyone moves through the list together, on its own once you start. Next and Previous move the whole room whenever you like.",
  participant: "Everyone works through the list at their own speed once you start.",
};

const secondary = "flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40";

function Headline({ room, tests, participants, pacing }: { room: HostRoom; tests: ConnectTest[]; participants: HostParticipant[]; pacing: ConnectPacing }) {
  const ticking = room.status === "running" && pacing === "host";
  const now = useNow(ticking, 500);
  const total = tests.length;
  const plural = total === 1 ? "test" : "tests";
  let title: string;
  let detail: string;
  if (room.status === "lobby") {
    title = `${total} ${plural} ready`;
    detail = "Start when everyone has joined.";
  } else if (room.status === "complete") {
    title = "That's a wrap!";
    detail = `All ${total} ${plural} are done. Nice work, everyone.`;
  } else if (pacing === "host") {
    title = `Test ${Math.min(room.currentIndex + 1, total)} of ${total} · ${connectTestLabels(tests)[room.currentIndex]?.title ?? ""}`;
    detail = room.status === "paused" ? "Paused. Everyone's progress is kept." : stepLine(room, participants, now);
  } else {
    const { perTest, done } = selfPacedCounts(total, participants);
    title = "Own pace";
    detail = [...perTest.flatMap((count, index) => count ? [`${count} on test ${index + 1}`] : []), `${done} done`].join(" · ")
      + (room.status === "paused" ? " · Paused" : "");
  }
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={CONNECT_SPRING} className="flex items-center gap-3">
        {room.status === "complete" && <ConfettiIcon weight="fill" className="size-8 shrink-0 text-warning" aria-hidden="true" />}
        <div className="min-w-0">
          <p className="text-xl font-bold [overflow-wrap:anywhere]">{title}</p>
          <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">{detail}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/** The one big button: Start, Pause, Resume or Start again. */
function MainButton({ room, actions }: { room: HostRoom; actions: HostRoomActions }) {
  const { status } = room;
  const [label, ButtonIcon, onClick] = status === "running" ? ["Pause", PauseIcon, actions.pause] as const
    : status === "paused" ? ["Resume", PlayIcon, actions.start] as const
      : status === "complete" ? ["Start again", ArrowClockwiseIcon, actions.start] as const
        : ["Start", RocketLaunchIcon, actions.start] as const;
  return (
    <motion.button layout type="button" onClick={() => void onClick()} disabled={actions.busy !== null} transition={CONNECT_SPRING} whileTap={{ scale: 0.96 }}
      className={cn("flex h-12 items-center gap-2 rounded-full px-6 text-base font-bold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60",
        status === "running" ? "bg-warning text-background" : "bg-primary text-primary-foreground")}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={label} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={CONNECT_SPRING} className="flex items-center gap-2">
          <ButtonIcon weight="fill" className="size-5" aria-hidden="true" />{label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

export function RunCard({ room, tests, participants, actions, className }: {
  room: HostRoom;
  tests: ConnectTest[];
  participants: HostParticipant[];
  actions: HostRoomActions;
  className?: string;
}) {
  const busy = actions.busy !== null;
  const pacing = actions.pacing;
  const active = room.status === "running" || room.status === "paused";
  const last = room.currentIndex >= tests.length - 1;
  const titles = connectTestLabels(tests).map((label) => label.title);
  return (
    <ConnectCard title="Run the room" Icon={PlayIcon} action={<StatusBadge status={room.status} />} className={className}>
      <Headline room={room} tests={tests} participants={participants} pacing={pacing} />
      {pacing === "host" && room.status !== "lobby" && (
        <TestDots tests={tests} titles={titles} index={room.status === "complete" ? tests.length : room.currentIndex} />
      )}
      <motion.div layout transition={CONNECT_SPRING} className="flex flex-wrap items-center gap-2">
        <MainButton room={room} actions={actions} />
        <AnimatePresence initial={false} mode="popLayout">
          {active && pacing === "host" && (
            <motion.div key="steps" layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={CONNECT_SPRING} className="flex flex-wrap gap-2">
              <button type="button" className={secondary} disabled={busy || room.currentIndex <= 0} onClick={() => void actions.goToTest(room.currentIndex - 1)}>
                <ArrowLeftIcon className="size-4" aria-hidden="true" />Previous
              </button>
              <button type="button" className={secondary} disabled={busy} onClick={() => void actions.goToTest(room.currentIndex + 1)}>
                {last ? <FlagCheckeredIcon className="size-4" aria-hidden="true" /> : <ArrowFatRightIcon className="size-4" aria-hidden="true" />}{last ? "Finish" : "Next test"}
              </button>
            </motion.div>
          )}
          {active && (
            <motion.button key="restart" layout type="button" className={secondary} disabled={busy} onClick={() => void actions.restartTest()}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={CONNECT_SPRING}>
              <ArrowClockwiseIcon className="size-4" aria-hidden="true" />Restart test
            </motion.button>
          )}
        </AnimatePresence>
        {room.status !== "lobby" && (
          <TwoTapButton label="Reset room" confirmLabel="Tap again: clears this run's results" Icon={ArrowsCounterClockwiseIcon} tone="warning"
            disabled={busy} onConfirm={() => void actions.resetRoom()} className="ml-auto" />
        )}
      </motion.div>
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <Pills<ConnectPacing> label="Pacing" value={pacing} onChange={(value) => void actions.setPacing(value)}
          disabled={room.status !== "lobby" || actions.busy === "pacing"} className="sm:max-w-sm"
          options={[{ value: "host", label: "Together" }, { value: "participant", label: "Own pace" }]} />
        <p className="text-xs text-muted-foreground">{PACING_HELP[pacing]}{room.status !== "lobby" && " Reset the room to change this."}</p>
      </div>
    </ConnectCard>
  );
}
