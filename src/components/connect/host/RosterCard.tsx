import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowClockwiseIcon, PlayIcon, UserMinusIcon, UsersThreeIcon } from "@phosphor-icons/react";
import type { HostParticipant, HostRoom } from "@/components/connect/types";
import { cn } from "@/lib/utils";
import { BOARD_STATUS_LABELS, isAway, participantStatus, progressDetail, type BoardStatus } from "@/components/connect/board/board-model";
import { ConnectAvatar } from "@/components/connect/ConnectAvatar";
import { PresenceDot, ProgressBar } from "@/components/connect/ConnectBadges";
import { ConnectCard } from "@/components/connect/ConnectParts";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";
import type { HostRoomActions } from "./use-host-room";

const STATUS_TEXT: Partial<Record<BoardStatus, string>> = {
  typing: "text-primary",
  finished: "text-success",
  done: "text-success",
  late: "text-warning",
  paused: "text-warning",
};

type Asking = "reset" | "remove" | null;

/** Inline "are you sure" strip that slides over the row. */
function ConfirmStrip({ text, action, destructive, onConfirm, onKeep }: { text: string; action: string; destructive: boolean; onConfirm: () => void; onKeep: () => void }) {
  return (
    <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={CONNECT_SPRING} className="flex min-w-0 flex-1 items-center gap-2">
      <span className="min-w-0 flex-1 text-sm font-semibold [overflow-wrap:anywhere]">{text}</span>
      <button type="button" onClick={onConfirm} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-bold focus-visible:outline-2 focus-visible:outline-ring", destructive ? "bg-destructive text-background" : "bg-primary text-primary-foreground")}>{action}</button>
      <button type="button" autoFocus onClick={onKeep} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">Cancel</button>
    </motion.div>
  );
}

function RosterRow({ room, participant, actions }: { room: HostRoom; participant: HostParticipant; actions: HostRoomActions }) {
  const [asking, setAsking] = useState<Asking>(null);
  const status = participantStatus(room, participant);
  const progress = progressDetail(room, participant);
  const away = isAway(participant);
  const late = status === "late";
  const { name } = participant;
  const confirm = (run: () => Promise<boolean>) => { setAsking(null); void run(); };
  return (
    <div className="flex min-h-12 items-center gap-3 py-1.5">
      <span className="relative">
        <ConnectAvatar name={name} avatarUrl={participant.avatarUrl} className={cn("size-8 text-sm", away && "opacity-40")} />
        <span className="absolute -bottom-0.5 -right-0.5 flex rounded-full bg-card p-0.5"><PresenceDot online={!away} /></span>
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        {asking === "remove" ? (
          <ConfirmStrip text={`Remove ${name}? They can rejoin with the code.`} action="Remove" destructive
            onConfirm={() => confirm(() => actions.removeParticipant(participant._id))} onKeep={() => setAsking(null)} />
        ) : asking === "reset" ? (
          <ConfirmStrip text={late ? `Let ${name} start this test now?` : `Restart ${name}'s attempt? Earlier results stay.`} action={late ? "Start now" : "Restart"} destructive={!late}
            onConfirm={() => confirm(() => actions.resetParticipant(participant._id))} onKeep={() => setAsking(null)} />
        ) : (
          <motion.div key="row" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={CONNECT_SPRING} className="flex min-w-0 flex-1 items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-semibold" title={name}>{name}</span>
                <span className={cn("shrink-0 text-xs font-medium", STATUS_TEXT[status] ?? "text-muted-foreground")}>{BOARD_STATUS_LABELS[status]}</span>
              </p>
              <ProgressBar value={progress.percent} valueText={progress.label} done={status === "finished" || status === "done"} label={`${name} progress`} className="mt-1 h-1.5" />
            </div>
            <button type="button" aria-label={late ? `Let ${name} start now` : `Restart ${name}'s attempt`} title={late ? "Let them start this test now" : "Restart their attempt"}
              onClick={() => setAsking("reset")} disabled={room.status === "lobby" || room.status === "complete" || actions.busy === "participant"}
              className={cn("flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-30",
                late ? "bg-warning/15 text-warning" : "text-muted-foreground hover:text-foreground")}>
              {late ? <PlayIcon weight="fill" className="size-4" aria-hidden="true" /> : <ArrowClockwiseIcon className="size-4" aria-hidden="true" />}
            </button>
            <button type="button" aria-label={`Remove ${name}`} title="Remove from room" onClick={() => setAsking("remove")} disabled={actions.busy === "participant"}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-30">
              <UserMinusIcon className="size-4" aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Who's in the room, with per-player restart (or "let them start now" for late arrivals) and remove. */
export function RosterCard({ room, participants, actions, className }: { room: HostRoom; participants: HostParticipant[]; actions: HostRoomActions; className?: string }) {
  const online = participants.filter((participant) => !isAway(participant)).length;
  const late = participants.filter((participant) => participantStatus(room, participant) === "late").length;
  return (
    <ConnectCard title="Who's here" description={`${participants.length} joined · ${online} online${late ? ` · ${late} waiting` : ""}`} Icon={UsersThreeIcon}
      tile="bg-success text-background" className={className}>
      {participants.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No one has joined yet. Share the code to get started.</p>
      ) : (
        <ul aria-label="Players" className="flex flex-col divide-y divide-border">
          <AnimatePresence initial={false}>
            {participants.map((participant) => (
              <motion.li key={participant._id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={CONNECT_SPRING} className="overflow-hidden">
                <RosterRow room={room} participant={participant} actions={actions} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      {late > 0 && (
        <p className="rounded-2xl bg-warning/10 px-3 py-2 text-xs text-warning">
          Late arrivals sit out the test in progress and join the next one. Tap <PlayIcon weight="fill" className="inline size-3" aria-label="start now" /> to let someone in early.
        </p>
      )}
    </ConnectCard>
  );
}
