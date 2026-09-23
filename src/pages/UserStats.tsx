import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, ArrowsDownUpIcon } from "@phosphor-icons/react";
import { lazy, Suspense, useState, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { useAccount } from "@/components/layout/useAccount";
import { toast } from "@/lib/toast-manager";
import { useAppAuth } from "@/components/layout/useAppAuth";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import AchievementsCategoryGrid from "@/components/auth/AchievementsCategoryGrid";
import type { StatCardType } from "@/components/stats/UserStatsChartModal";
import TestDetailDialog from "@/components/stats/TestDetailDialog";
import { ResultModeLabels, ResultValidity } from "@/components/stats/ResultLabels";
import { formatDuration, PROFILE_HISTORY_LIMIT, type VerifiedProfileTestResult } from "@/components/stats/profile-presentation";

type SortColumn = "date" | "wpm" | "accuracy";
type SortDirection = "asc" | "desc";

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const UserStatsChartModal = lazy(() => import("@/components/stats/UserStatsChartModal"));

export default function UserStats() {
  const { userId } = useParams<{ userId: string }>();
  return <ProfileStats key={userId ?? "missing"} userId={userId} />;
}

function ProfileStats({ userId }: { userId: string | undefined }) {
  const { user: clerkUser } = useAppAuth();
  const profileUser = useQuery(api.users.getUserById, userId ? { userId: userId as Id<"users"> } : "skip");
  const stats = useQuery(api.testResults.getUserStatsByUserId, userId ? { userId: userId as Id<"users"> } : "skip");
  const achievements = useQuery(api.achievements.getUserAchievementsByUserId, userId ? { userId: userId as Id<"users"> } : "skip");
  const account = useAccount();
  const recheckAchievements = useMutation(api.achievements.recheckAllAchievements);
  const refreshPending = useRef(false);
  const isOwner = !!clerkUser && !!userId && account.status === "ready" && account.userId === userId;

  const [selectedTest, setSelectedTest] = useState<VerifiedProfileTestResult | null>(null);
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
      const result = await recheckAchievements({ clerkId: clerkUser.id });
      if (result.pending) toast.add({ title: "Achievement refresh started", description: "Your history is being checked. Awards will update automatically.", type: "info" });
      return result;
    } finally {
      refreshPending.current = false;
    }
  };

  if (profileUser === null) {
    return (
      <main className="min-h-dvh bg-background p-4 font-mono text-foreground flex flex-col items-center justify-center gap-4">
        <h1 className="text-xl font-semibold">User not found</h1>
        <p className="text-sm text-muted-foreground">The user profile you're looking for doesn't exist.</p>
        <Link to="/leaderboard" className={`inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 ${focusClass}`}>
          <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
          Back to Leaderboard
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
      <header className="mx-auto grid max-w-[1600px] grid-cols-1 items-center gap-4 px-4 py-5 md:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
        <Link to="/leaderboard" className={`inline-flex items-center gap-2 w-fit shrink-0 rounded text-sm text-muted-foreground hover:text-foreground ${focusClass}`}>
          <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
          Back to Leaderboard
        </Link>
        <div className="flex min-w-0 max-w-full items-center justify-self-center gap-3 text-center">
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
        <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 pb-6 md:px-6">
          <section aria-labelledby="lifetime-heading">
            <h2 id="lifetime-heading" className="text-sm font-semibold">Lifetime statistics</h2>
            <p className="mt-1 mb-3 text-xs text-muted-foreground">{stats.totalTests.toLocaleString()} verified tests. Select a statistic to view recent tests. Characters are estimated as words × 5.</p>
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
            <section aria-labelledby="history-heading" className="@container min-w-0 rounded-lg border border-border bg-card text-card-foreground">
              <div className="border-b border-border p-4">
                <h2 id="history-heading" ref={historyHeading} tabIndex={-1} className="font-semibold">Recent test history</h2>
                <p className="mt-1 text-xs text-muted-foreground">Showing {sortedResults.length} saved tests (latest {PROFILE_HISTORY_LIMIT} maximum), including unverified and invalid tests.</p>
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
                <ul className="max-h-[44rem] overflow-y-auto p-2">
                  {sortedResults.map((result) => (
                    <li key={result._id} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        className={`group flex w-full min-w-0 flex-col gap-3 rounded-lg p-3 text-left hover:bg-accent hover:text-accent-foreground motion-safe:transition-[background-color,transform] motion-safe:duration-150 motion-safe:active:scale-[0.99] ${focusClass}`}
                        onClick={(event) => { dialogTrigger.current = event.currentTarget; setSelectedTest(result); }}
                      >
                        <span className="grid w-full min-w-0 gap-3 @min-[28rem]:grid-cols-[minmax(0,1fr)_auto] @min-[28rem]:items-center">
                          <span className="flex min-w-0 flex-col gap-2">
                            <ResultModeLabels result={result} />
                            <time dateTime={new Date(result.createdAt).toISOString()} className="text-xs text-muted-foreground">{new Date(result.createdAt).toLocaleDateString()} · {new Date(result.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
                          </span>
                          <span className="flex flex-wrap items-baseline gap-x-5 gap-y-1 tabular-nums @min-[28rem]:justify-end">
                            <span className="whitespace-nowrap text-xs text-muted-foreground"><strong className="text-2xl font-semibold text-primary">{result.wpm}</strong> WPM</span>
                            <span className="whitespace-nowrap text-xs text-muted-foreground"><strong className="text-lg font-semibold text-foreground">{Math.round(result.accuracy)}%</strong> accuracy</span>
                          </span>
                        </span>
                        <span className="flex w-full flex-wrap items-center justify-between gap-2">
                          <ResultValidity verification={result.verification} />
                          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground group-hover:text-foreground"><ArrowRightIcon className="size-3 shrink-0 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />View details</span>
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
        <Suspense fallback={<p role="status" className="py-6 text-center text-sm text-muted-foreground">Loading chart…</p>}>
          <UserStatsChartModal isOpen onClose={() => setSelectedChart(null)} cardType={selectedChart} cardValue={cards.find((card) => card.type === selectedChart)!.value} allResults={stats.allResults} onCloseAutoFocus={restoreFocus} />
        </Suspense>
      )}
    </main>
  );
}
