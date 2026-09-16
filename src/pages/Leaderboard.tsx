import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { Trophy } from "lucide-react";
import { api } from "../../convex/_generated/api";

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatarUrl: string | null;
  wpm: number;
  createdAt: number;
}

const TIMEZONE = "America/New_York";

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTodayTitleET(): string {
  return new Date().toLocaleDateString("en-US", {
    timeZone: TIMEZONE,
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function getWeekRangeTitleET(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")!.value);
  const month = Number(parts.find((part) => part.type === "month")!.value) - 1;
  const day = Number(parts.find((part) => part.type === "day")!.value);
  const format = (date: Date) => date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${format(new Date(year, month, day - 7))} – ${format(new Date(year, month, day))}`;
}

function Avatar({ entry }: { entry: LeaderboardEntry }) {
  return entry.avatarUrl ? (
    <img src={entry.avatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
  ) : (
    <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-secondary-foreground">
      {entry.username.charAt(0).toUpperCase()}
    </span>
  );
}

function PodiumCard({ entry }: { entry: LeaderboardEntry }) {
  return (
    <li className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-background p-3 @min-[26rem]:flex-col @min-[26rem]:text-center">
      <div className="flex shrink-0 flex-col items-center gap-1">
        <span aria-label={`Rank ${entry.rank}`} className="text-xl">
          {["🥇", "🥈", "🥉"][entry.rank - 1]}
        </span>
        <Avatar entry={entry} />
      </div>
      <div className="min-w-0 flex-1 @min-[26rem]:w-full">
        <p className="text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{entry.username}</p>
        <p className="mt-1 text-lg font-bold text-foreground">
          {entry.wpm} <span className="text-xs font-normal text-muted-foreground">WPM</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p>
      </div>
    </li>
  );
}

function LeaderboardColumn({
  id,
  title,
  subtitle,
  leaderboard,
  emptyMessage,
}: {
  id: string;
  title: string;
  subtitle?: string;
  leaderboard: LeaderboardEntry[] | undefined;
  emptyMessage: string;
}) {
  const top3 = leaderboard?.slice(0, 3) ?? [];
  const remaining = leaderboard?.slice(3) ?? [];

  return (
    <section aria-labelledby={`${id}-title`} aria-busy={leaderboard === undefined} className="@container min-w-0 rounded-xl border border-border bg-card p-4 text-card-foreground">
      <header className="mb-4">
        <h2 id={`${id}-title`} className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle} · ET</p>}
      </header>
      {leaderboard === undefined ? (
        <p role="status" className="py-8 text-center text-sm text-muted-foreground">Loading {title.toLowerCase()} scores…</p>
      ) : leaderboard.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm font-medium">No scores yet</p>
          <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <ol aria-label={`${title} podium`} className="grid grid-cols-1 gap-2 @min-[26rem]:grid-cols-3">
            {top3.map((entry) => <PodiumCard key={`${entry.rank}-${entry.username}`} entry={entry} />)}
          </ol>
          {remaining.length > 0 && (
            <table className="mt-4 w-full table-fixed text-sm">
              <caption className="sr-only">{title} ranks 4 and below</caption>
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="w-10 py-2 text-left font-medium">Rank</th>
                  <th scope="col" className="px-2 py-2 text-left font-medium">User</th>
                  <th scope="col" className="w-12 py-2 text-right font-medium">WPM</th>
                </tr>
              </thead>
              <tbody>
                {remaining.map((entry) => (
                  <tr key={`${entry.rank}-${entry.username}`} className="border-b border-border last:border-b-0">
                    <td className="py-3 text-muted-foreground">{entry.rank}</td>
                    <th scope="row" className="px-2 py-3 text-left font-medium">
                      <span className="flex min-w-0 items-center gap-2">
                        <Avatar entry={entry} />
                        <span className="min-w-0 [overflow-wrap:anywhere]">{entry.username}</span>
                      </span>
                    </th>
                    <td className="py-3 text-right font-semibold tabular-nums">{entry.wpm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}

export default function Leaderboard() {
  const allTimeLeaderboard = useQuery(api.testResults.getLeaderboard, { timeRange: "all-time", limit: 50 });
  const todayLeaderboard = useQuery(api.testResults.getLeaderboard, { timeRange: "today", limit: 50 });
  const weekLeaderboard = useQuery(api.testResults.getLeaderboard, { timeRange: "week", limit: 50 });

  return (
    <div className="min-h-[100dvh] bg-background font-mono text-foreground">
      <header className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-6">
        <Link to="/" className="rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">← Homepage</Link>
        <h1 className="flex items-center gap-2 text-xl font-semibold"><Trophy aria-hidden="true" className="size-5" />Leaderboard</h1>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 pb-6 md:px-6">
        <p className="mb-5 text-sm text-muted-foreground">
          Requires 90%+ accuracy and at least 30 seconds or 50 correct words.
          15-second tests do not rank. The WPM cap is 300; 170–200 WPM is allowed.
        </p>
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          <LeaderboardColumn id="all-time" title="All-Time" leaderboard={allTimeLeaderboard} emptyMessage="Complete a typing test and save your results to appear on the leaderboard!" />
          <LeaderboardColumn id="today" title="Today" subtitle={getTodayTitleET()} leaderboard={todayLeaderboard} emptyMessage="No one has completed a test today yet. Be the first!" />
          <LeaderboardColumn id="week" title="This Week" subtitle={getWeekRangeTitleET()} leaderboard={weekLeaderboard} emptyMessage="No tests completed this week. Start typing to claim the top spot!" />
        </div>
      </main>
      <footer className="px-4 pb-5 text-center text-xs text-muted-foreground">Leaderboard shows verified tests only</footer>
    </div>
  );
}
