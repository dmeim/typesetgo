import { motion, useReducedMotion } from "framer-motion";
import { PODIUM_METALS } from "@/lib/leaderboard-entries";
import { cn } from "@/lib/utils";
import { BOUNCY_SPRING, DEFAULT_RACE_EMOJI, RACE_SPRING, formatRaceTime, racerColor } from "./race-format";
import { HostTag, RacerAvatar, YouTag } from "./RaceParts";

export interface RaceRanking {
  sessionId: string;
  name: string;
  emoji?: string;
  position: number;
  wpm: number;
  accuracy: number;
  finishTime?: number;
  didFinish: boolean;
}

const PODIUM = [
  { slot: "col-start-2", inset: "", step: "h-28 sm:h-36" },
  { slot: "col-start-1", inset: "pt-8", step: "h-20 sm:h-28" },
  { slot: "col-start-3", inset: "pt-14", step: "h-14 sm:h-20" },
] as const;

function PodiumPlace({ ranking, index, isYou }: { ranking: RaceRanking; index: 0 | 1 | 2; isYou: boolean }) {
  const metal = PODIUM_METALS[index];
  const { slot, inset, step } = PODIUM[index];
  return (
    <li className={cn("row-start-1 flex min-w-0 flex-col items-center text-center", slot, inset)}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...BOUNCY_SPRING, delay: 0.3 + (2 - index) * 0.15 }}
        className="flex w-full min-w-0 flex-1 flex-col items-center gap-1.5 pb-3">
        <span className="rounded-full" style={{ boxShadow: `0 0 0 3px var(--background), 0 0 0 6px ${metal}` }}>
          <RacerAvatar emoji={ranking.emoji || DEFAULT_RACE_EMOJI} color={racerColor(ranking.sessionId, isYou)} size={index === 0 ? "xl" : "lg"} className={index === 0 ? "max-sm:size-16 max-sm:text-3xl" : "max-sm:size-12 max-sm:text-2xl"} />
        </span>
        <span className="mt-1 flex w-full min-w-0 flex-col items-center gap-0.5 text-sm font-bold">
          <span className="max-w-full truncate">{ranking.name}</span>{isYou && <YouTag />}
        </span>
        <span className="text-xs text-muted-foreground"><strong className="text-xl tabular-nums text-foreground sm:text-2xl">{ranking.wpm}</strong> WPM</span>
      </motion.div>
      <motion.div aria-hidden="true" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ ...RACE_SPRING, delay: 0.1 + (2 - index) * 0.12 }}
        style={{ originY: 1, borderColor: metal, background: `linear-gradient(180deg, color-mix(in srgb, ${metal} 30%, var(--card)), color-mix(in srgb, ${metal} 6%, var(--background)))` }}
        className={cn("flex w-full shrink-0 justify-center rounded-t-2xl border border-b-0 border-t-4 pt-2", step)}>
        <span className="text-3xl font-black sm:text-4xl" style={{ color: metal }}>{index + 1}</span>
      </motion.div>
    </li>
  );
}

/** The top three finishers on steps, first in the middle. */
export function RacePodium({ rankings, currentSessionId }: { rankings: RaceRanking[]; currentSessionId: string }) {
  const finishers = rankings.filter((ranking) => ranking.didFinish).slice(0, 3);
  if (!finishers.length) return <p className="py-8 text-center text-muted-foreground">No racers finished this race.</p>;
  return (
    <ol aria-label="Podium" className="mx-auto grid w-full max-w-lg grid-cols-3 items-stretch gap-2 border-b border-border pt-4 sm:gap-3">
      {finishers.map((ranking, index) => (
        <PodiumPlace key={ranking.sessionId} ranking={ranking} index={index as 0 | 1 | 2} isYou={ranking.sessionId === currentSessionId} />
      ))}
    </ol>
  );
}

/** Everyone in finishing order, with accuracy, time (or DNF) and speed. */
export function RaceResultList({ rankings, currentSessionId, hostId }: { rankings: RaceRanking[]; currentSessionId: string; hostId?: string }) {
  const reduce = useReducedMotion();
  return (
    <ol aria-label="Everyone" className="flex flex-col gap-2">
      {rankings.map((ranking, index) => {
        const isYou = ranking.sessionId === currentSessionId;
        return (
          <motion.li key={ranking.sessionId} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ ...RACE_SPRING, delay: reduce ? 0 : 0.6 + Math.min(index, 12) * 0.06 }}
            className={cn("flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2.5 sm:gap-3", isYou ? "border-primary/50 bg-primary/5" : "border-border bg-card")}>
            <span className="w-6 shrink-0 text-center font-black tabular-nums text-muted-foreground"><span className="sr-only">Place </span>{ranking.position}</span>
            <RacerAvatar emoji={ranking.emoji || DEFAULT_RACE_EMOJI} color={racerColor(ranking.sessionId, isYou)} size="sm" className="max-sm:hidden" />
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <span className="truncate font-semibold">{ranking.name}</span>
              {isYou && <YouTag />}
              {ranking.sessionId === hostId && <HostTag label={false} />}
            </span>
            <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:inline">{ranking.accuracy}%<span className="sr-only"> accuracy</span></span>
            <span className="flex shrink-0 flex-col items-end leading-tight sm:flex-row-reverse sm:items-baseline sm:gap-3">
              <span className="text-sm sm:w-16 sm:text-right"><strong className="tabular-nums">{ranking.wpm}</strong> <span className="text-xs text-muted-foreground">WPM</span></span>
              <span className="text-xs tabular-nums text-muted-foreground sm:w-14 sm:text-right">
                {ranking.didFinish && ranking.finishTime !== undefined ? formatRaceTime(ranking.finishTime) : ranking.didFinish ? "–" : <abbr title="Did not finish" className="no-underline">DNF</abbr>}
              </span>
            </span>
          </motion.li>
        );
      })}
    </ol>
  );
}
