import { motion } from "framer-motion";
import { CrownSimpleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { CardAvatar, CardName, StatusText, TestPips, Wpm } from "./CardParts";
import { frameTone, GOLD, type BoardCardProps } from "./card-tone";

function fillTone(player: BoardCardProps["player"]) {
  if (player.away) return "bg-foreground/5";
  if (player.finished) return "bg-success/18";
  if (player.status === "break") return "bg-muted-foreground/12";
  return "bg-primary/16";
}

/** Ribbon: the name is the biggest thing on the card, and the whole card fills up as the player gets through the test. */
export function NameRibbonCard({ player, tests }: BoardCardProps) {
  return (
    <article aria-label={player.name} className={cn("@container relative flex min-w-0 flex-1 items-center gap-[0.6em] overflow-hidden rounded-[0.9em] border py-[0.5em] pl-[0.55em] pr-[0.8em]", frameTone(player))}>
      <motion.span aria-hidden="true" initial={false} animate={{ width: `${player.percent}%` }} transition={{ type: "spring", stiffness: 90, damping: 20 }}
        className={cn("absolute inset-y-0 left-0", fillTone(player))} />
      <span role="progressbar" aria-label={`${player.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(player.percent)} aria-valuetext={player.statusText} className="sr-only" />
      <CardAvatar player={player} crown={false} className="relative size-[2.3em]" />
      <div className="relative flex min-w-0 flex-1 flex-col gap-[0.15em]">
        {/* The speed only shares the name's line, so the status line below gets the full width. */}
        <div className="flex min-w-0 items-center gap-[0.5em]">
          <CardName name={player.name} size={1.4} reserve={player.leader ? 7.6 : 6} className="flex-1" />
          {player.leader && <CrownSimpleIcon weight="fill" className="size-[1.4em] shrink-0" style={{ color: GOLD }} aria-label="Fastest right now" />}
          <Wpm value={player.wpm} className="shrink-0 text-[1.75em]" />
        </div>
        <div className="flex min-w-0 items-center gap-[0.5em] text-[0.8em]">
          <TestPips tests={tests} step={player.step} className="h-[0.4em] w-[3em] shrink-0" />
          <StatusText player={player} className="min-w-0 flex-1" />
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {player.isAverage && "avg · "}{player.accuracy > 0 ? `${player.accuracy}%` : "–"}
          </span>
        </div>
      </div>
    </article>
  );
}
