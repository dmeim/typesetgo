import { AnimatePresence, motion } from "framer-motion";
import { CrownSimpleIcon } from "@phosphor-icons/react";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatLeaderboardDate, leaderboardEntryKey, PODIUM_METALS, type LeaderboardEntry } from "@/lib/leaderboard-entries";
import { ARENA_SPRING } from "./arena-motion";
import { PlayerAvatar, PlayerName, YouTag } from "./LeaderboardParts";

// Fixed grid slots read 2–1–3 while the DOM keeps rank order. The top inset of 2nd and 3rd
// matches their shorter steps, so a long wrapped name can never lift them above 1st.
// Short side-by-side screens get lower steps so the whole board fits without the page scrolling.
const PLACES = [
  { slot: "col-start-2", inset: "", step: "h-32 sm:h-44 [@media(min-width:48rem)_and_(max-height:51rem)]:h-36" },
  { slot: "col-start-1", inset: "pt-8 sm:pt-12", step: "h-24 sm:h-32 [@media(min-width:48rem)_and_(max-height:51rem)]:h-28" },
  { slot: "col-start-3", inset: "pt-16 sm:pt-20", step: "h-16 sm:h-24 [@media(min-width:48rem)_and_(max-height:51rem)]:h-20" },
] as const;

interface PodiumProps {
  entries: readonly LeaderboardEntry[];
  title: string;
  youId: Id<"users"> | null;
  /** True once the viewer has switched periods: names fade in and scores count to their new value. */
  entrance: boolean;
  reducedMotion: boolean;
  className?: string;
}

function PodiumSpot({ entry, place, isYou, entrance, reducedMotion }: { entry: LeaderboardEntry; place: 0 | 1 | 2; isYou: boolean; entrance: boolean; reducedMotion: boolean }) {
  const wpm = useAnimatedCounter(entry.wpm, entrance ? 700 : 0);
  const metal = PODIUM_METALS[place];
  const key = leaderboardEntryKey(entry);
  const { slot, inset, step } = PLACES[place];
  return (
    <li data-podium-rank={entry.rank} className={cn("row-start-1 flex min-w-0 flex-col items-center text-center", slot, inset)}>
      <div data-podium-identity className="relative flex w-full min-w-0 flex-1 flex-col items-center gap-2 px-0.5 pb-4">
        <span className="sr-only">Rank {entry.rank}</span>
        <AnimatePresence initial={false}>
          {place === 0 && (
            <motion.span
              key={key}
              initial={reducedMotion ? false : { y: -12, opacity: 0, rotate: -20 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{ ...ARENA_SPRING, delay: 0.25 }}
              aria-hidden="true"
              data-podium-crown
              className="absolute -top-7"
              style={{ color: metal }}
            >
              <CrownSimpleIcon weight="fill" className="size-7" />
            </motion.span>
          )}
        </AnimatePresence>
        <span className="rounded-full" style={{ boxShadow: `0 0 0 4px var(--background), 0 0 0 7px ${metal}` }}>
          <PlayerAvatar entry={entry} size={place === 0 ? "xl" : "lg"} layoutId={reducedMotion ? undefined : `arena-${key}`} />
        </span>
        <motion.span
          key={key}
          initial={entrance && !reducedMotion ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 flex w-full flex-1 flex-col items-center gap-1 text-sm font-semibold leading-5"
        >
          <PlayerName entry={entry} className="w-full" />
          {isYou && <YouTag />}
        </motion.span>
        <span className="flex flex-wrap items-baseline justify-center gap-x-1">
          <span className={cn("font-bold tabular-nums", place === 0 ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl")}>{wpm}</span>
          <span className="text-xs text-muted-foreground">WPM</span>
        </span>
        <span className="text-xs text-muted-foreground">{formatLeaderboardDate(entry.createdAt)}</span>
      </div>
      <div
        data-podium-step
        aria-hidden="true"
        className={cn("flex w-full shrink-0 justify-center rounded-t-2xl border border-b-0 border-t-4 pt-2 sm:pt-3", step)}
        style={{ borderColor: metal, background: `linear-gradient(180deg, color-mix(in srgb, ${metal} 30%, var(--card)), color-mix(in srgb, ${metal} 6%, var(--background)))` }}
      >
        <span className="text-4xl font-black tabular-nums sm:text-5xl" style={{ color: metal }}>{place + 1}</span>
      </div>
    </li>
  );
}

/** One podium for the top three; empty places stay empty rather than inventing winners. */
export function ArenaPodium({ entries, title, youId, entrance, reducedMotion, className }: PodiumProps) {
  return (
    <ol aria-label={`${title} podium`} className={cn("mx-auto grid w-full max-w-2xl grid-cols-3 items-stretch gap-2 border-b border-border pt-8 sm:gap-3", className)}>
      {entries.slice(0, 3).map((entry, place) => (
        <PodiumSpot
          key={place}
          entry={entry}
          place={place as 0 | 1 | 2}
          isYou={!!youId && entry.userId === youId}
          entrance={entrance}
          reducedMotion={reducedMotion}
        />
      ))}
    </ol>
  );
}
