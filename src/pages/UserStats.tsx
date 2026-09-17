import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, ArrowsDownUpIcon } from "@phosphor-icons/react";
import { useState, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { useAppAuth } from "@/components/layout/useAppAuth";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import AchievementsCategoryGrid from "@/components/auth/AchievementsCategoryGrid";
import UserStatsChartModal, { type StatCardType } from "@/components/stats/UserStatsChartModal";
import TestDetailDialog from "@/components/stats/TestDetailDialog";
import { formatDuration, getTestTypeLabels, PROFILE_HISTORY_LIMIT, type ProfileTestResult } from "@/components/stats/profile-presentation";

type SortColumn = "date" | "wpm" | "accuracy";
type SortDirection = "asc" | "desc";

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export default function UserStats() {
  const { userId } = useParams<{ userId: string }>();
  return <ProfileStats key={userId ?? "missing"} userId={userId} />;
}

function ProfileStats({ userId }: { userId: string | undefined }) {
  const { user: clerkUser } = useAppAuth();
  const profileUser = useQuery(api.users.getUserById, userId ? { userId: userId as Id<"users"> } : "skip");
  const stats = useQuery(api.testResults.getUserStatsByUserId, userId ? { userId: userId as Id<"users"> } : "skip");
  const achievements = useQuery(api.achievements.getUserAchievementsByUserId, userId ? { userId: userId as Id<"users"> } : "skip");
  const currentConvexUser = useQuery(api.users.getUser, clerkUser ? { clerkId: clerkUser.id } : "skip");
  const recheckAchievements = useMutation(api.achievements.recheckAllAchievements);
  const refreshPending = useRef(false);
  const isOwner = !!clerkUser && !!userId && currentConvexUser?._id === userId;

  const [selectedTest, setSelectedTest] = useState<ProfileTestResult | null>(null);
  const [selectedChart, setSelectedChart] = useState<StatCardType | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const dialogTrigger = useRef<HTMLButtonElement | null>(null);
  const historyHeading = useRef<HTMLHeadingElement>(null);
  const isLoading = profileUser === undefined || stats === undefined;

  const allResults = stats?.allResults;
  const sortedResults = useMemo(() => {
    if (!allResults) return [];
    return [...allResults].sort((a, b) => {
      const key = sortColumn === "date" ? "createdAt" : sortColumn;
      const comparison = a[key] - b[key];
      return sortDirection === "desc" ? -comparison : comparison;
    });
  }, [allResults, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const restoreFocus = (event: Event) => {
    event.preventDefault();
    const target = dialogTrigger.current?.isConnected ? dialogTrigger.current : historyHeading.current;
    target?.focus();
  };

  const refreshAchievements = async () => {
    if (!isOwner || !clerkUser || refreshPending.current) return;
    refreshPending.current = true;
    try {
      return await recheckAchievements({ clerkId: clerkUser.id });
    } finally {
      refreshPending.current = false;
    }
  };

  if (profileUser === null) {
    return (
      <main className="min-h-dvh bg-background p-4 font-mono text-foreground flex flex-col items-center justify-center gap-4">
        <h1 className="text-xl font-semibold">User not found</h1>
        <p className="text-sm text-muted-foreground">The user profile you're looking for doesn't exist.</p>
        <Link to="/" className={`inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 ${focusClass}`}>
          <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
          Back to Homepage
        </Link>
      </main>
    );
  }

  const cards: { type: StatCardType; label: string; value: string }[] = stats ? [
    { type: "typingTime", label: "Typing time", value: formatDuration(stats.totalTimeTyped) },
    { type: "bestWpm", label: "Best WPM", value: String(stats.bestWpm) },
    { type: "avgWpm", label: "Average WPM", value: String(stats.averageWpm) },
    { type: "avgAccuracy", label: "Average accuracy", value: `${stats.averageAccuracy}%` },
    { type: "wordsTyped", label: "Words typed", value: stats.totalWordsTyped.toLocaleString() },
    { type: "characters", label: "Estimated characters", value: stats.totalCharactersTyped.toLocaleString() },
  ] : [];

  return (
    <main className="min-h-dvh bg-background font-mono text-foreground">
      <header className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:gap-8 md:px-6">
        <Link to="/" className={`inline-flex items-center gap-2 w-fit shrink-0 rounded text-sm text-muted-foreground hover:text-foreground ${focusClass}`}>
          <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
          Back to Homepage
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          {profileUser?.avatarUrl ? (
            <img src={profileUser.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
          ) : (
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-lg text-secondary-foreground">{(profileUser?.username || "U")[0].toUpperCase()}</span>
          )}
          <h1 className="min-w-0 break-words text-xl font-semibold [overflow-wrap:anywhere]">{profileUser?.username ?? "Profile"}</h1>
        </div>
      </header>
      {isLoading && <p role="status" className="p-12 text-center text-sm text-muted-foreground">Loading profile…</p>}
      {!isLoading && stats && (
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pb-6 md:px-6">
          <section aria-labelledby="lifetime-heading">
            <h2 id="lifetime-heading" className="text-sm font-semibold">Lifetime statistics</h2>
            <p className="mt-1 mb-3 text-xs text-muted-foreground">{stats.totalTests.toLocaleString()} valid tests. Select a statistic to view recent tests. Characters are estimated as words × 5.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {cards.map((card) => (
                <button
                  key={card.type}
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={`${card.label}: ${card.value}. View recent tests`}
                  className={`min-w-0 rounded-lg border border-border bg-card p-4 text-left text-card-foreground hover:bg-accent hover:text-accent-foreground ${focusClass}`}
                  onClick={(event) => { dialogTrigger.current = event.currentTarget; setSelectedChart(card.type); }}
                >
                  <span className="block text-xs text-muted-foreground">{card.label}</span>
                  <span className="mt-2 block break-words text-2xl font-semibold tabular-nums">{card.value}</span>
                </button>
              ))}
            </div>
          </section>
          <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <section aria-label="Achievements" className="min-w-0 rounded-lg border border-border bg-card p-4 text-card-foreground">
              <AchievementsCategoryGrid
                earnedAchievements={achievements ?? {}}
                isLoading={achievements === undefined}
                onRefresh={isOwner ? refreshAchievements : undefined}
              />
            </section>
            <section aria-labelledby="history-heading" className="min-w-0 rounded-lg border border-border bg-card text-card-foreground">
              <div className="border-b border-border p-4">
                <h2 id="history-heading" ref={historyHeading} tabIndex={-1} className="font-semibold">Recent test history</h2>
                <p className="mt-1 text-xs text-muted-foreground">Showing {sortedResults.length} saved tests (latest {PROFILE_HISTORY_LIMIT} maximum), including invalid tests.</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs" aria-label="Sort history">
                  <span className="text-muted-foreground">Sort by</span>
                  {([ ["date", "Date"], ["wpm", "WPM"], ["accuracy", "Accuracy"] ] as const).map(([column, label]) => (
                    <button
                      key={column}
                      type="button"
                      aria-pressed={sortColumn === column}
                      aria-label={`${label}${sortColumn === column ? `, ${sortDirection === "desc" ? "descending" : "ascending"}` : ""}`}
                      onClick={() => handleSort(column)}
                      className={`inline-flex items-center gap-2 min-h-9 rounded-md border border-border px-2 py-1 ${sortColumn === column ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"} ${focusClass}`}
                    >
                      {sortColumn !== column ? <ArrowsDownUpIcon className="size-3 shrink-0" aria-hidden="true" />
                        : sortDirection === "desc" ? <ArrowDownIcon className="size-3 shrink-0" aria-hidden="true" />
                          : <ArrowUpIcon className="size-3 shrink-0" aria-hidden="true" />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {sortedResults.length ? (
                <ul className="max-h-[44rem] overflow-y-auto p-1">
                  {sortedResults.map((result) => (
                    <li key={result._id} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        className={`flex w-full min-w-0 flex-col gap-2 rounded p-3 text-left hover:bg-accent hover:text-accent-foreground ${focusClass}`}
                        onClick={(event) => { dialogTrigger.current = event.currentTarget; setSelectedTest(result); }}
                      >
                        <span className="flex w-full flex-wrap justify-between gap-x-3 gap-y-1 text-xs">
                          <time dateTime={new Date(result.createdAt).toISOString()} className="text-muted-foreground">{new Date(result.createdAt).toLocaleDateString()} · {new Date(result.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
                          <span className={result.isValid === false ? "text-destructive" : "text-muted-foreground"}>{result.isValid === false ? "Invalid" : "Valid"}</span>
                        </span>
                        <span className="flex flex-wrap gap-1">
                          {getTestTypeLabels(result).map((label) => <span key={label} className="rounded border border-border px-1.5 py-0.5 text-xs">{label}</span>)}
                        </span>
                        <span className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-sm tabular-nums">
                          <span><strong>{result.wpm}</strong> WPM</span>
                          <span><strong>{Math.round(result.accuracy)}%</strong> accuracy</span>
                          <span className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground"><ArrowRightIcon className="size-3 shrink-0" aria-hidden="true" />View details</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="p-10 text-center text-sm text-muted-foreground">No tests saved yet</p>}
            </section>
          </div>
        </div>
      )}
      {selectedTest && (
        <TestDetailDialog key={selectedTest._id} result={selectedTest} clerkId={clerkUser?.id ?? null} isOwner={isOwner} onClose={() => setSelectedTest(null)} onDeleted={() => setSelectedTest(null)} onCloseAutoFocus={restoreFocus} />
      )}
      {selectedChart && stats && (
        <UserStatsChartModal isOpen onClose={() => setSelectedChart(null)} cardType={selectedChart} cardValue={cards.find((card) => card.type === selectedChart)!.value} allResults={stats.allResults} onCloseAutoFocus={restoreFocus} />
      )}
    </main>
  );
}
