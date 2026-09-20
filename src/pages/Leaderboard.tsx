import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { ArrowLeftIcon, MedalIcon, MedalMilitaryIcon, TrophyIcon } from "@phosphor-icons/react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { cn } from "@/lib/utils";
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

function Avatar({ entry, podium = false }: { entry: LeaderboardEntry; podium?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  return (
    <span
      aria-hidden="true"
      data-podium-avatar={podium || undefined}
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-medium text-secondary-foreground",
        podium ? "size-10 ring-2 ring-border ring-offset-2 ring-offset-card @min-[28rem]:size-12" : "size-9",
      )}
    >
      {entry.username.charAt(0).toUpperCase()}
      {entry.avatarUrl && entry.avatarUrl !== failedUrl && (
        <img
          src={entry.avatarUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailedUrl(entry.avatarUrl)}
        />
      )}
    </span>
  );
}

function PodiumEntry({ entry }: { entry: LeaderboardEntry }) {
  const Award = entry.rank === 1 ? TrophyIcon : entry.rank === 2 ? MedalIcon : MedalMilitaryIcon;
  const metal = entry.rank === 1 ? "#d6a738" : entry.rank === 2 ? "#98a7be" : "#c58150";

  return (
    <li
      data-podium-rank={entry.rank}
      className={cn(
        "row-start-1 flex min-w-0 flex-col text-center",
        // Equal-height columns reserve the tallest identity for everyone. The
        // top inset mirrors the step difference so long names cannot outrank #1.
        entry.rank === 1 ? "col-start-2" : entry.rank === 2 ? "col-start-1 pt-8 @min-[28rem]:pt-10" : "col-start-3 pt-16 @min-[28rem]:pt-20",
      )}
    >
      <div data-podium-identity className="flex min-w-0 flex-1 flex-col items-center pb-3 @min-[28rem]:pb-4">
        <span className="sr-only">Rank {entry.rank}</span>
        <Avatar entry={entry} podium />
        <p className="mt-3 w-full flex-1 text-sm font-semibold leading-5 text-card-foreground [overflow-wrap:anywhere]">{entry.username}</p>
        <p className="mt-2 flex flex-wrap items-baseline justify-center gap-x-1 text-2xl font-bold tabular-nums text-card-foreground @min-[28rem]:text-3xl">
          {entry.wpm} <span className="text-xs font-normal text-muted-foreground">WPM</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p>
      </div>
      <div
        data-podium-step
        aria-hidden="true"
        className={cn(
          "flex shrink-0 flex-col items-center justify-center gap-1 rounded-t-lg border border-b-0 border-t-[3px] py-2",
          entry.rank === 1 ? "h-36 @min-[28rem]:h-44" : entry.rank === 2 ? "h-28 @min-[28rem]:h-34" : "h-20 @min-[28rem]:h-24",
        )}
        style={{
          background: `linear-gradient(180deg, color-mix(in srgb, ${metal} 22%, var(--card)), color-mix(in srgb, ${metal} 8%, var(--card)))`,
          borderColor: `color-mix(in srgb, ${metal} 65%, var(--card))`,
        }}
      >
        <span
          data-podium-award
          className="flex size-8 items-center justify-center rounded-full bg-card motion-safe:animate-in motion-safe:zoom-in-90 motion-safe:duration-300 @min-[28rem]:size-10"
          style={{ color: metal }}
        >
          <Award aria-hidden="true" weight="fill" className="size-5 @min-[28rem]:size-6" />
        </span>
        <span className="rounded-full bg-card px-2 text-lg font-bold leading-6 text-card-foreground">{entry.rank}</span>
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
    <section aria-labelledby={`${id}-title`} aria-busy={leaderboard === undefined} className="@container min-w-0 rounded-xl border border-border bg-card p-3 text-card-foreground sm:p-4">
      <header className="mb-6 min-h-12">
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
          {/* Keep rank reading order while CSS gives every entrant a fixed podium slot. */}
          <ol aria-label={`${title} podium`} className="mx-auto grid max-w-[40rem] grid-cols-3 items-stretch gap-2 border-b border-border @min-[28rem]:gap-3">
            {top3.map((entry) => <PodiumEntry key={`${entry.rank}-${entry.username}`} entry={entry} />)}
          </ol>
          {remaining.length > 0 && (
            <Table className="mt-4 w-full table-fixed text-sm">
              <TableCaption className="sr-only">{title} ranks 4 and below</TableCaption>
              <TableHeader className="border-b border-border text-xs text-muted-foreground">
                <TableRow>
                  <TableHead scope="col" className="w-10 py-2 text-left font-medium">Rank</TableHead>
                  <TableHead scope="col" className="px-2 py-2 text-left font-medium">User</TableHead>
                  <TableHead scope="col" className="w-12 py-2 text-right font-medium">WPM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remaining.map((entry) => (
                  <TableRow key={`${entry.rank}-${entry.username}`} className="border-b border-border last:border-b-0">
                    <TableCell className="py-3 text-muted-foreground">{entry.rank}</TableCell>
                    <TableHead scope="row" className="whitespace-normal px-2 py-3 text-left font-medium">
                      <span className="flex min-w-0 items-center gap-2">
                        <Avatar entry={entry} />
                        <span className="min-w-0 [overflow-wrap:anywhere]">{entry.username}</span>
                      </span>
                    </TableHead>
                    <TableCell className="py-3 text-right font-semibold tabular-nums">{entry.wpm}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
        <Link to="/" className="inline-flex items-center gap-2 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
          Homepage
        </Link>
        <h1 className="flex items-center gap-2 text-xl font-semibold"><TrophyIcon aria-hidden="true" className="size-5" />Leaderboard</h1>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 pb-6 md:px-6">
        <p className="mb-5 text-sm text-muted-foreground">
          Requires 90%+ accuracy and at least 30 seconds or 50 correct words.
          15-second tests do not rank. The WPM cap is 300; 170–200 WPM is allowed.
        </p>
        <div className="grid grid-cols-1 items-start gap-4 min-[90rem]:grid-cols-3">
          <LeaderboardColumn id="all-time" title="All-Time" leaderboard={allTimeLeaderboard} emptyMessage="Complete a typing test and save your results to appear on the leaderboard!" />
          <LeaderboardColumn id="today" title="Today" subtitle={getTodayTitleET()} leaderboard={todayLeaderboard} emptyMessage="No one has completed a test today yet. Be the first!" />
          <LeaderboardColumn id="week" title="This Week" subtitle={getWeekRangeTitleET()} leaderboard={weekLeaderboard} emptyMessage="No tests completed this week. Start typing to claim the top spot!" />
        </div>
      </main>
      <footer className="px-4 pb-5 text-center text-xs text-muted-foreground">Leaderboard shows verified tests only</footer>
    </div>
  );
}
