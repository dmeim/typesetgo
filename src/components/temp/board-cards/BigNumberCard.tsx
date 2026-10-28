import { cn } from "@/lib/utils";
import { Bar, CardAvatar, CardName, PresenceDot, StatusText, TestPips, Wpm } from "./CardParts";
import { frameTone, type BoardCardProps } from "./card-tone";

/** Tile: the name owns the top line, the speed is the hero, and the bottom edge of the card is the progress bar. */
export function BigNumberCard({ player, tests }: BoardCardProps) {
  return (
    <article aria-label={player.name} className={cn("@container relative flex min-w-0 flex-1 flex-col gap-[0.45em] rounded-[1.1em] border px-[0.85em] pb-[1em] pt-[0.75em]", frameTone(player))}>
      <header className="flex min-w-0 items-center gap-[0.5em]">
        <CardAvatar player={player} className="size-[1.9em]" />
        <CardName name={player.name} size={1.2} reserve={3.6} className="flex-1" />
        <PresenceDot player={player} />
      </header>
      <div className="flex items-end justify-between gap-[0.5em]">
        <span className="flex items-baseline gap-[0.2em]">
          <Wpm value={player.wpm} className="text-[3.1em] tracking-tight" />
          <span className="text-[0.8em] font-semibold text-muted-foreground">{player.isAverage ? "avg wpm" : "wpm"}</span>
        </span>
        <span className="flex flex-col items-end leading-none">
          <span className="text-[1.15em] font-bold tabular-nums">{player.accuracy > 0 ? `${player.accuracy}%` : "–"}</span>
          <span className="text-[0.7em] text-muted-foreground">acc</span>
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-[0.6em]">
        <StatusText player={player} className="min-w-0 flex-1 text-[0.85em]" />
        <TestPips tests={tests} step={player.step} className="w-[2.6em] shrink-0" />
      </div>
      {/* Clipped on its own so the crown can still poke out of the card. */}
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <Bar player={player} className="absolute inset-x-0 bottom-0 h-[0.4em]" />
      </span>
    </article>
  );
}
