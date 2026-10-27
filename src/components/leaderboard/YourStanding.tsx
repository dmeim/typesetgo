import { motion } from "framer-motion";
import { TrophyIcon } from "@phosphor-icons/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { findStanding, LEADERBOARD_SIZE, type LeaderboardEntry, type LeaderboardPeriod } from "@/lib/leaderboard-entries";
import { PlayerAvatar } from "./LeaderboardParts";

interface YourStandingProps {
  entries: readonly LeaderboardEntry[];
  youId: Id<"users">;
  period: LeaderboardPeriod;
  entrance: boolean;
}

function gapText(standing: NonNullable<ReturnType<typeof findStanding>>) {
  if (!standing.above) return "Top of the board";
  if (standing.above.gap === 0) return `Tied with ${standing.above.username}`;
  return `${standing.above.gap} WPM behind ${standing.above.username}`;
}

/**
 * The signed-in player's place on the loaded board. The query returns the top 50 only,
 * so anyone below that is told they are not on the board yet rather than given a guessed rank.
 * It sits in the page flow above the rank list, so it never covers a row.
 */
export function YourStanding({ entries, youId, period, entrance }: YourStandingProps) {
  const standing = findStanding(entries, youId);
  return (
    <aside aria-label="Your standing" className="mx-auto flex w-full max-w-3xl shrink-0 items-center gap-3 rounded-2xl border border-primary/40 bg-popover px-3 py-2 text-popover-foreground shadow-sm sm:gap-4 sm:px-4 sm:py-3">
      {standing ? (
        <PlayerAvatar entry={standing.entry} size="sm" />
      ) : (
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <TrophyIcon className="size-4" />
        </span>
      )}
      <motion.div
        key={period.id}
        initial={entrance ? { opacity: 0, y: 8 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-0.5"
      >
        {standing ? (
          <>
            <span className="text-sm">You’re <strong className="text-base sm:text-lg">#{standing.entry.rank}</strong> {period.standingPhrase}</span>
            <span className="min-w-0 text-xs text-muted-foreground [overflow-wrap:anywhere]">{gapText(standing)}</span>
          </>
        ) : (
          <>
            <span className="text-sm">You’re not in the top {LEADERBOARD_SIZE} {period.standingPhrase} yet</span>
            <span className="text-xs text-muted-foreground">Finish a ranked test to climb on.</span>
          </>
        )}
      </motion.div>
      {standing && (
        <span className="shrink-0 text-xl font-bold tabular-nums text-primary sm:text-2xl">
          {standing.entry.wpm}<span className="ml-1 text-xs font-normal text-muted-foreground">WPM</span>
        </span>
      )}
    </aside>
  );
}
