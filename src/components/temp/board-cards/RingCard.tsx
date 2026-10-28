import { motion } from "framer-motion";
import { ConnectAvatar } from "@/components/connect/ConnectAvatar";
import { cn } from "@/lib/utils";
import { CardName, Crown, DoneCheck, PresenceDot, StatusText, TestPips, Wpm } from "./CardParts";
import { frameTone, type BoardCardProps } from "./card-tone";

const RADIUS = 18;
const LENGTH = 2 * Math.PI * RADIUS;

function ringTone(player: BoardCardProps["player"]) {
  if (player.away) return "text-muted-foreground/40";
  if (player.finished) return "text-success";
  if (player.status === "break") return "text-muted-foreground";
  return "text-primary";
}

/** The face sits in a ring that closes as the player gets through the test. */
function ProgressRing({ player }: BoardCardProps) {
  return (
    <span role="progressbar" aria-label={`${player.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(player.percent)} aria-valuetext={player.statusText}
      className="relative flex size-[3.7em] shrink-0 items-center justify-center">
      <svg viewBox="0 0 40 40" className={cn("absolute inset-0 size-full -rotate-90", ringTone(player))} aria-hidden="true">
        <circle cx="20" cy="20" r={RADIUS} fill="none" strokeWidth="3" className="stroke-foreground/10" />
        <motion.circle cx="20" cy="20" r={RADIUS} fill="none" strokeWidth="3" strokeLinecap="round" stroke="currentColor" strokeDasharray={LENGTH}
          initial={false} animate={{ strokeDashoffset: LENGTH * (1 - player.percent / 100) }} transition={{ type: "spring", stiffness: 90, damping: 20 }} />
      </svg>
      <ConnectAvatar name={player.name} avatarUrl={player.picture} className={cn("size-[2.75em] text-[1.05em]", player.away && "opacity-40")} />
      <Crown show={player.leader} className="-left-[0.2em] -top-[0.55em] size-[1.5em] -rotate-12" />
      <DoneCheck show={player.finished} className="bottom-0 right-0 size-[1.3em]" />
    </span>
  );
}

/** Ring: a progress ring around the face, the name on its own line beside it, the speed under the name. */
export function RingCard({ player, tests }: BoardCardProps) {
  return (
    <article aria-label={player.name} className={cn("@container flex min-w-0 flex-1 flex-col gap-[0.55em] rounded-[1.3em] border px-[0.75em] py-[0.7em]", frameTone(player))}>
      <div className="flex min-w-0 items-center gap-[0.65em]">
        <ProgressRing player={player} tests={tests} />
        <div className="flex min-w-0 flex-1 flex-col gap-[0.2em]">
          <span className="flex min-w-0 items-center gap-[0.35em]">
            <CardName name={player.name} size={1.2} reserve={5.4} />
            <PresenceDot player={player} />
          </span>
          <span className="flex items-baseline gap-[0.3em]">
            <Wpm value={player.wpm} className="text-[2.1em]" />
            <span className="text-[0.75em] text-muted-foreground">{player.isAverage ? "avg wpm" : "wpm"}</span>
            <span className="ml-auto text-[0.9em] font-bold tabular-nums">{player.accuracy > 0 ? `${player.accuracy}%` : "–"}</span>
          </span>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-[0.6em]">
        <StatusText player={player} className="min-w-0 flex-1 text-[0.85em]" />
        <TestPips tests={tests} step={player.step} className="w-[3.4em] shrink-0" />
      </div>
    </article>
  );
}
