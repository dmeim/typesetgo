import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatLeaderboardDate, leaderboardEntryKey, type LeaderboardEntry } from "@/lib/leaderboard-entries";
import { ARENA_SPRING } from "./arena-motion";
import { PlayerAvatar, PlayerName, YouTag } from "./LeaderboardParts";

interface RankListProps {
  entries: readonly LeaderboardEntry[];
  title: string;
  youId: Id<"users"> | null;
  entrance: boolean;
  reducedMotion: boolean;
}

/** Ranks 4 and below. Rows slide to their new place when the period changes. */
export function ArenaRankList({ entries, title, youId, entrance, reducedMotion }: RankListProps) {
  const animate = entrance && !reducedMotion;
  return (
    <ol aria-label={`${title} ranks 4 and below`} start={4} className="flex flex-col gap-1.5">
      <AnimatePresence mode="popLayout" initial={false}>
        {entries.map((entry) => {
          const key = leaderboardEntryKey(entry);
          const isYou = !!youId && entry.userId === youId;
          return (
            <motion.li
              key={key}
              layout={!reducedMotion}
              initial={animate ? { opacity: 0, x: -16 } : false}
              animate={{ opacity: 1, x: 0 }}
              exit={animate ? { opacity: 0, x: 16 } : undefined}
              transition={ARENA_SPRING}
              data-leaderboard-row={entry.rank}
              className={cn("flex items-center gap-3 rounded-2xl border px-3 py-2.5 sm:px-4", isYou ? "border-primary/50 bg-primary/10" : "border-transparent bg-card")}
            >
              <span className="w-7 shrink-0 text-right text-lg font-bold tabular-nums text-muted-foreground">
                <span className="sr-only">Rank </span>{entry.rank}
              </span>
              <PlayerAvatar entry={entry} size="sm" layoutId={reducedMotion ? undefined : `arena-${key}`} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 font-semibold">
                  <PlayerName entry={entry} />
                  {isYou && <YouTag />}
                </span>
                <span className="text-xs text-muted-foreground">{formatLeaderboardDate(entry.createdAt)}</span>
              </span>
              <span className="shrink-0 text-xl font-bold tabular-nums">
                {entry.wpm}<span className="ml-1 text-xs font-normal text-muted-foreground">WPM</span>
              </span>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
