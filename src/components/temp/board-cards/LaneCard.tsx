import type { CSSProperties } from "react";
import { FlagCheckeredIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { CardAvatar, CardName, PresenceDot, StatusText, TestPips, Wpm } from "./CardParts";
import { barTone, frameTone, type BoardCardProps } from "./card-tone";

const RUNNER = 2.1;
const FLAG = 1.9;
const MOVE = "transition-[left,right,width] duration-700 ease-out";

/** The player's face runs along a lane toward the finish flag; the status rides in the open part of the lane. */
function Lane({ player }: BoardCardProps) {
  const track = `(100% - ${RUNNER + FLAG}em) * ${player.percent / 100}`;
  const ahead = player.percent < 55;
  const runner: CSSProperties = { left: `calc(${track} + 0.1em)` };
  const trail: CSSProperties = { width: `calc(${track} + ${RUNNER / 2}em)` };
  // Status text takes whichever side of the runner has more room.
  const text: CSSProperties = ahead
    ? { left: `calc(${track} + ${RUNNER + 0.5}em)`, right: `${FLAG}em` }
    : { left: "0.7em", right: `calc(100% - (${track}) + 0.4em)` };
  return (
    <div role="progressbar" aria-label={`${player.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(player.percent)} aria-valuetext={player.statusText}
      className={cn("relative h-[2.3em] rounded-full bg-foreground/[0.07]", player.status === "late" && "outline-dashed outline-[0.1em] -outline-offset-[0.1em] outline-warning/50")}>
      <span aria-hidden="true" className={cn("absolute inset-y-[0.85em] left-[0.4em] rounded-full opacity-35", barTone(player), MOVE)} style={trail} />
      <span aria-hidden="true" className="absolute inset-y-[0.4em] right-[0.35em] flex w-[1.3em] items-center justify-center border-l-[0.15em] border-dotted border-foreground/25 pl-[0.2em] text-muted-foreground">
        <FlagCheckeredIcon weight="fill" className="size-[1.05em]" />
      </span>
      <span className={cn("absolute inset-y-0 flex items-center", ahead ? "justify-end" : "justify-start")} style={text}>
        <StatusText player={player} className="text-[0.8em]" />
      </span>
      <CardAvatar player={player} className={cn("absolute top-[0.1em] size-[2.1em]", MOVE)} style={runner} />
    </div>
  );
}

/** Lane: the name and speed on one wide line over a race lane where the player's face moves toward the flag. */
export function LaneCard({ player, tests }: BoardCardProps) {
  return (
    <article aria-label={player.name} className={cn("@container flex min-w-0 flex-1 flex-col gap-[0.45em] rounded-[1em] border px-[0.7em] pb-[0.6em] pt-[0.55em]", frameTone(player))}>
      <header className="flex min-w-0 items-center gap-[0.4em]">
        <CardName name={player.name} size={1.3} reserve={player.isAverage ? 7 : 5.6} />
        <PresenceDot player={player} />
        <span className="ml-auto flex shrink-0 items-baseline gap-[0.3em] pl-[0.4em]">
          <Wpm value={player.wpm} className="text-[1.7em]" />
          <span className="flex flex-col text-[0.65em] leading-tight text-muted-foreground">
            <span>{player.isAverage ? "avg wpm" : "wpm"}</span>
            <span className="font-semibold tabular-nums text-foreground">{player.accuracy > 0 ? `${player.accuracy}%` : "–"}</span>
          </span>
        </span>
      </header>
      <Lane player={player} tests={tests} />
      <TestPips tests={tests} step={player.step} className="h-[0.3em]" />
    </article>
  );
}
