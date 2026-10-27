import { motion, useReducedMotion } from "framer-motion";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LEADERBOARD_PERIODS, type LeaderboardPeriodId } from "@/lib/leaderboard-entries";
import { ARENA_SPRING } from "./arena-motion";

/** Today / 7 days / All time as a pill with a sliding highlight. Must sit inside the page's `Tabs`. */
export function PeriodTabs({ value }: { value: LeaderboardPeriodId }) {
  const reducedMotion = useReducedMotion();
  return (
    <TabsList aria-label="Leaderboard period" className="flex h-auto w-full max-w-md rounded-full bg-muted/60 p-1">
      {LEADERBOARD_PERIODS.map((period) => (
        <TabsTrigger
          key={period.id}
          value={period.id}
          className="relative h-auto flex-1 rounded-full border-0 px-4 py-2 text-sm font-normal text-muted-foreground hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
        >
          {value === period.id && (
            <motion.span
              layoutId={reducedMotion ? undefined : "leaderboard-period-highlight"}
              transition={ARENA_SPRING}
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-primary"
            />
          )}
          <span className="relative">{period.label}</span>
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
