import { CrownSimpleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Bar, CardAvatar, CardName, StatusText, TestPips, Wpm } from "./CardParts";
import { frameTone, GOLD, type BoardCardProps } from "./card-tone";

function placeTone(player: BoardCardProps["player"]) {
  if (player.away) return "bg-foreground/5 text-muted-foreground";
  if (player.leader) return "bg-[#d6a738]/15";
  if (player.finished) return "bg-success/15 text-success";
  return "bg-foreground/[0.06] text-muted-foreground";
}

/** Scoreboard: one dense row per player with a place number, the name filling the middle and the speed in its own box. */
export function ScoreRowCard({ player, tests }: BoardCardProps) {
  return (
    <article aria-label={player.name} className={cn("@container relative flex min-w-0 flex-1 items-stretch overflow-hidden rounded-[0.6em] border", frameTone(player))}>
      <span className={cn("flex w-[2.2em] shrink-0 items-center justify-center text-[1.05em] font-black tabular-nums", placeTone(player))} style={player.leader ? { color: GOLD } : undefined}>
        {player.leader
          ? <CrownSimpleIcon weight="fill" className="size-[1.3em]" aria-label="Fastest right now" />
          : <><span className="sr-only">Place </span>{player.away ? "–" : player.rank}</>}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-[0.5em] py-[0.4em] pl-[0.5em] pr-[0.4em]">
        <CardAvatar player={player} crown={false} className="size-[1.85em]" />
        <div className="flex min-w-0 flex-1 flex-col gap-[0.2em]">
          <CardName name={player.name} size={1.2} reserve={9.3} />
          <div className="flex min-w-0 items-center gap-[0.45em] text-[0.75em]">
            <TestPips tests={tests} step={player.step} className="h-[0.4em] w-[3.4em] shrink-0" />
            <StatusText player={player} className="min-w-0 flex-1" />
          </div>
        </div>
      </div>
      <span className="flex w-[3.6em] shrink-0 flex-col items-center justify-center bg-foreground/[0.06] px-[0.3em]">
        <Wpm value={player.wpm} className="text-[1.65em]" />
        <span className="text-[0.65em] tabular-nums text-muted-foreground">{player.accuracy > 0 ? `${player.accuracy}%` : "wpm"}</span>
        <span className="sr-only">{player.isAverage ? "average words per minute" : "words per minute"}</span>
      </span>
      <Bar player={player} className="absolute inset-x-0 bottom-0 h-[0.2em]" />
    </article>
  );
}
