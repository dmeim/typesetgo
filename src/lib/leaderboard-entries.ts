import type { Id } from "../../convex/_generated/dataModel";

/** One row from `testResults.getLeaderboard`; the server decides every rank. */
export interface LeaderboardEntry {
  // Older deployed query responses remain readable until the additive update ships.
  userId?: Id<"users">;
  rank: number;
  username: string;
  avatarUrl: string | null;
  wpm: number;
  createdAt: number;
}

export type LeaderboardPeriodId = "today" | "week" | "all-time";

export interface LeaderboardPeriod {
  id: LeaderboardPeriodId;
  /** Short tab label. */
  label: string;
  /** Names the podium and list for assistive technology. */
  title: string;
  /** Completes "You're #3 …". */
  standingPhrase: string;
  emptyMessage: string;
}

export const LEADERBOARD_PERIODS: readonly LeaderboardPeriod[] = [
  {
    id: "today",
    label: "Today",
    title: "Today",
    standingPhrase: "today",
    emptyMessage: "No one has completed a test today yet. Be the first!",
  },
  {
    id: "week",
    label: "7 days",
    title: "Last 7 days",
    standingPhrase: "in the last 7 days",
    emptyMessage: "No tests completed this week. Start typing to claim the top spot!",
  },
  {
    id: "all-time",
    label: "All time",
    title: "All time",
    standingPhrase: "of all time",
    emptyMessage: "Complete a typing test and save your results to appear on the leaderboard!",
  },
];

export const LEADERBOARD_SIZE = 50;

/** Gold, silver and bronze for places 1–3. */
export const PODIUM_METALS = ["#d6a738", "#98a7be", "#c58150"] as const;

export const LEADERBOARD_RULES = "Ranked tests need 90%+ accuracy and at least 30 seconds or 50 correct words. 15-second tests don’t count. The WPM cap is 300; 170–200 WPM is allowed.";

/** Public profile for a ranked player. Profile routes will move; keep this the single place that knows the path. */
export function leaderboardProfileHref(userId: Id<"users">): string {
  return `/user/${userId}`;
}

/** Stable React/animation identity: the account ID, or rank and name for older responses without one. */
export function leaderboardEntryKey(entry: LeaderboardEntry): string {
  return entry.userId ?? `${entry.rank}-${entry.username}`;
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatLeaderboardDate(timestamp: number): string {
  return dateFormat.format(timestamp);
}

export interface LeaderboardStanding {
  entry: LeaderboardEntry;
  /** The player directly above, and how many WPM they lead by. */
  above: { username: string; gap: number } | null;
}

/** Where the signed-in player sits on the loaded board, or null when they are not on it. */
export function findStanding(entries: readonly LeaderboardEntry[], userId: Id<"users">): LeaderboardStanding | null {
  const index = entries.findIndex((entry) => entry.userId === userId);
  if (index === -1) return null;
  const entry = entries[index];
  const above = index > 0 ? entries[index - 1] : null;
  return { entry, above: above ? { username: above.username, gap: above.wpm - entry.wpm } : null };
}
