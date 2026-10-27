import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { TrophyIcon } from "@phosphor-icons/react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import Header from "@/components/layout/Header";
import { useAccount } from "@/components/layout/useAccount";
import { ArenaPodium } from "@/components/leaderboard/ArenaPodium";
import { ArenaRankList } from "@/components/leaderboard/ArenaRankList";
import { RulesNote } from "@/components/leaderboard/LeaderboardParts";
import { PeriodTabs } from "@/components/leaderboard/PeriodTabs";
import { YourStanding } from "@/components/leaderboard/YourStanding";
import { useNow } from "@/hooks/useNow";
import { LEADERBOARD_PERIODS, LEADERBOARD_SIZE, PODIUM_METALS, type LeaderboardEntry, type LeaderboardPeriodId } from "@/lib/leaderboard-entries";
import { msUntilNextUtcDay, resetCountdownUTC, todayTitleUTC, utcDayStart, weekTitleUTC } from "@/lib/leaderboard-period";
import { api } from "../../convex/_generated/api";

function isPeriodId(value: string): value is LeaderboardPeriodId {
  return LEADERBOARD_PERIODS.some((period) => period.id === value);
}

/** Follows the UTC day so an open page rolls Today and 7 days over at midnight. */
function useUtcPeriodStart() {
  const [periodStart, setPeriodStart] = useState(() => utcDayStart(Date.now()));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      setPeriodStart(utcDayStart(Date.now()));
      timer = setTimeout(refresh, msUntilNextUtcDay(Date.now()) + 1);
    };
    refresh();
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);
  return periodStart;
}

/** All three boards stay subscribed so switching periods is instant and players can morph between places. */
function useLeaderboards(periodStart: number): Record<LeaderboardPeriodId, LeaderboardEntry[] | undefined> {
  // The deployed query accepts only timeRange and limit. Alternating between
  // two supported limits subscribes again at UTC midnight; display stays at 50.
  const refreshLimit = LEADERBOARD_SIZE + (Math.floor(periodStart / 86_400_000) % 2);
  const allTime = useQuery(api.testResults.getLeaderboard, { timeRange: "all-time", limit: LEADERBOARD_SIZE });
  const today = useQuery(api.testResults.getLeaderboard, { timeRange: "today", limit: refreshLimit });
  const week = useQuery(api.testResults.getLeaderboard, { timeRange: "week", limit: refreshLimit });
  return {
    "all-time": allTime,
    today: today?.slice(0, LEADERBOARD_SIZE),
    week: week?.slice(0, LEADERBOARD_SIZE),
  };
}

function periodSubtitle(period: LeaderboardPeriodId, periodStart: number, now: number) {
  if (period === "today") return `${todayTitleUTC(periodStart)} · ${resetCountdownUTC(now)} · UTC`;
  if (period === "week") return `${weekTitleUTC(periodStart)} · Rolls over daily · UTC`;
  return "Every ranked test ever";
}

/** Arena leaderboard: one podium; switching period morphs every player to their new place. */
export default function Leaderboard() {
  const [periodId, setPeriodId] = useState<LeaderboardPeriodId>("all-time");
  const [switched, setSwitched] = useState(false);
  const reducedMotion = useReducedMotion() ?? false;
  const periodStart = useUtcPeriodStart();
  const now = useNow(periodId === "today", 30_000);
  const boards = useLeaderboards(periodStart);
  const account = useAccount();
  const youId = account.status === "ready" ? account.userId : null;

  const period = LEADERBOARD_PERIODS.find((entry) => entry.id === periodId) ?? LEADERBOARD_PERIODS[0];
  const board = boards[periodId];
  const animate = switched && !reducedMotion;
  const subtitle = periodSubtitle(periodId, periodStart, now);

  return (
    <div className="min-h-[100dvh] bg-background font-mono text-foreground">
      <Header />
      <Tabs
        value={periodId}
        onValueChange={(value) => {
          if (!isPeriodId(value)) return;
          setPeriodId(value);
          setSwitched(true);
        }}
        className="contents"
      >
        <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 pt-6 pb-6">
          <header className="flex flex-col items-center gap-4 text-center">
            <h1 className="flex items-center gap-3 text-3xl font-bold sm:text-4xl">
              <TrophyIcon weight="fill" className="size-8 sm:size-9" style={{ color: PODIUM_METALS[0] }} aria-hidden="true" />Leaderboard
            </h1>
            <PeriodTabs value={periodId} />
            <motion.p key={periodId} initial={animate ? { opacity: 0 } : false} animate={{ opacity: 1 }} className="text-sm text-muted-foreground">
              {subtitle}
            </motion.p>
            <RulesNote />
          </header>

          <TabsContent value={periodId} aria-busy={board === undefined} className="flex flex-col gap-8">
            {board === undefined ? (
              <p role="status" className="py-12 text-center text-sm text-muted-foreground">Loading {period.title.toLowerCase()} scores…</p>
            ) : board.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-medium">No scores yet</p>
                <p className="mt-2 text-sm text-muted-foreground">{period.emptyMessage}</p>
              </div>
            ) : (
              <LayoutGroup>
                <ArenaPodium entries={board} title={period.title} youId={youId} entrance={switched} reducedMotion={reducedMotion} />
                {board.length > 3 && (
                  <ArenaRankList entries={board.slice(3)} title={period.title} youId={youId} entrance={switched} reducedMotion={reducedMotion} />
                )}
              </LayoutGroup>
            )}
            {youId && board !== undefined && <YourStanding entries={board} youId={youId} period={period} entrance={animate} />}
          </TabsContent>
        </main>
      </Tabs>
    </div>
  );
}
