import { lazy, Suspense, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowFatRightIcon, ArrowRightIcon, ChartLineUpIcon, ClockIcon, FlameIcon, GaugeIcon, KeyboardIcon, SignInIcon, TargetIcon, TextAaIcon, TextTIcon, TrophyIcon, type Icon,
} from "@phosphor-icons/react";
import { useAppAuth } from "@/components/layout/useAppAuth";
import { formatDuration, type VerifiedProfileTestResult } from "@/components/stats/profile-presentation";
import type { StatCardType } from "@/components/stats/UserStatsChartModal";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { toast } from "@/lib/toast-manager";
import { Sparkline } from "./ProfileCharts";
import { PROFILE_SPRING } from "./profile-sections";
import { joinedPhrase, weeklyTrend } from "./profile-stats";

const UserStatsChartModal = lazy(() => import("@/components/stats/UserStatsChartModal"));

const ease = "transition-[padding,opacity] duration-300";

export interface ProfileUser {
  username: string;
  avatarUrl?: string | null;
  createdAt?: number;
}

export interface ProfileStatsSummary {
  totalTests: number;
  averageWpm: number;
  bestWpm: number;
  averageAccuracy: number;
  totalTimeTyped: number;
  totalWordsTyped: number;
  totalCharactersTyped: number;
}

export interface ProfileStreak {
  currentStreak: number;
  longestStreak: number;
}

export function ProfileAvatar({ user, size = "size-12", text = "text-lg" }: { user: ProfileUser; size?: string; text?: string }) {
  if (user.avatarUrl) return <img src={user.avatarUrl} alt="" className={`shrink-0 rounded-full object-cover ${size}`} />;
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-[conic-gradient(from_200deg,var(--primary),var(--accent-emphasis),var(--primary))] font-bold text-primary-foreground ${size} ${text}`}>
      {(user.username || "?")[0].toUpperCase()}
    </span>
  );
}

const streakLabel = (days: number) => `${days}-day streak`;

/** Signed in: who you are, one tap from your stats. */
export function AccountCard({ user, streak, collapsed, fade, selected, onOpen }: {
  user: ProfileUser | undefined;
  streak: ProfileStreak | null | undefined;
  collapsed: boolean;
  fade: string;
  selected: boolean;
  onOpen: () => void;
}) {
  const name = user?.username ?? "Your profile";
  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={PROFILE_SPRING}
      onClick={onOpen}
      aria-label={`Your profile: ${name}`}
      title={collapsed ? name : undefined}
      className={`flex items-center gap-3 rounded-2xl py-3 text-left ring-primary/60 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring ${ease} ${selected ? "bg-accent ring-2" : "bg-card"} ${collapsed ? "px-3 md:px-0 md:ring-0" : "px-3"}`}
    >
      {user ? <ProfileAvatar user={user} /> : <span aria-hidden="true" className="size-12 shrink-0 animate-pulse rounded-full bg-muted" />}
      <span className={`flex min-w-0 flex-1 flex-col whitespace-nowrap ${ease} ${fade}`}>
        <span className="truncate font-semibold">{name}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {streak && streak.currentStreak > 0
            ? <><FlameIcon weight="fill" className="size-3.5 text-warning" aria-hidden="true" />{streakLabel(streak.currentStreak)}</>
            : <><ChartLineUpIcon className="size-3.5" aria-hidden="true" />Your stats</>}
        </span>
      </span>
    </motion.button>
  );
}

function useSignIn() {
  const { openSignIn } = useAppAuth();
  return async () => {
    if (!await openSignIn()) toast.add({ type: "info", title: "Sign-in isn’t available right now", description: "Try again in a moment. Your settings still save on this device." });
  };
}

/** Signed out: one big, obvious way in. */
export function SignInButton({ collapsed, fade }: { collapsed: boolean; fade: string }) {
  const signIn = useSignIn();
  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={PROFILE_SPRING}
      onClick={() => void signIn()}
      aria-label="Sign in"
      title={collapsed ? "Sign in" : undefined}
      className={`group flex flex-col gap-1 rounded-2xl bg-primary py-3.5 text-left text-primary-foreground shadow-lg shadow-primary/20 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:active:scale-[0.98] ${ease} ${collapsed ? "px-4 md:px-[0.9rem]" : "px-4"}`}
    >
      <span className="flex items-center gap-3 whitespace-nowrap text-lg font-bold">
        <SignInIcon className="size-6 shrink-0" aria-hidden="true" />
        <span className={`transition-opacity duration-200 ${fade}`}>Sign in</span>
      </span>
      <span className={`whitespace-normal text-xs opacity-85 transition-opacity duration-200 ${collapsed ? "md:hidden" : ""}`}>Save your stats, history and badges</span>
    </motion.button>
  );
}

const PROMPTS: Record<"stats" | "history" | "achievements", { title: string; body: string }> = {
  stats: { title: "Sign in to see your profile", body: "Your speed, accuracy and typing time, saved after every test." },
  history: { title: "Sign in to see your history", body: "Every test you finish is saved here, grouped by day." },
  achievements: { title: "Sign in to collect achievements", body: "Earn cards for speed, streaks and words typed, and see every level ahead." },
};

/** What an account tab shows to someone signed out, e.g. at /profile/history. */
export function SignInPrompt({ pane }: { pane: keyof typeof PROMPTS }) {
  const signIn = useSignIn();
  const prompt = PROMPTS[pane];
  return (
    <section className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card px-6 py-14 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-primary"><SignInIcon className="size-8" aria-hidden="true" /></span>
      <h2 className="text-2xl font-bold">{prompt.title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{prompt.body}</p>
      <button type="button" onClick={() => void signIn()} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <SignInIcon className="size-5" aria-hidden="true" />Sign in
      </button>
    </section>
  );
}

export function PanelLoading({ label }: { label: string }) {
  return (
    <section aria-busy="true" className="flex flex-col gap-4">
      <p role="status" className="sr-only">{label}</p>
      <div className="h-32 animate-pulse rounded-3xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-40 animate-pulse rounded-3xl bg-muted" />)}
      </div>
    </section>
  );
}

interface StatCard {
  type: StatCardType;
  label: string;
  value: number;
  format: (value: number) => string;
  Icon: Icon;
  trend?: number[];
  note: string;
}

const signed = (value: number) => `${value >= 0 ? "+" : ""}${Math.round(value * 10) / 10}`;

function cardsFor(stats: ProfileStatsSummary, results: readonly VerifiedProfileTestResult[]): StatCard[] {
  const wpmTrend = weeklyTrend(results, "wpm");
  const accuracyTrend = weeklyTrend(results, "accuracy");
  const trendNote = (trend: number[], unit: string, fallback: string) => trend.length >= 2
    ? `${signed(trend[trend.length - 1] - trend[0])}${unit} over ${trend.length} active weeks`
    : fallback;
  return [
    { type: "bestWpm", label: "Best WPM", value: stats.bestWpm, format: String, Icon: TrophyIcon, note: "Personal best" },
    { type: "avgWpm", label: "Average WPM", value: stats.averageWpm, format: String, Icon: GaugeIcon, trend: wpmTrend, note: trendNote(wpmTrend, "", "Across every counted test") },
    { type: "avgAccuracy", label: "Average accuracy", value: stats.averageAccuracy, format: (value) => `${value}%`, Icon: TargetIcon, trend: accuracyTrend, note: trendNote(accuracyTrend, "%", "Across every counted test") },
    { type: "typingTime", label: "Typing time", value: stats.totalTimeTyped, format: formatDuration, Icon: ClockIcon, note: `${stats.totalTests.toLocaleString()} tests` },
    { type: "wordsTyped", label: "Words typed", value: stats.totalWordsTyped, format: (value) => value.toLocaleString(), Icon: TextAaIcon, note: "Correct words, all time" },
    { type: "characters", label: "Characters", value: stats.totalCharactersTyped, format: (value) => value.toLocaleString(), Icon: TextTIcon, note: "Estimated as words × 5" },
  ];
}

function StatTile({ card, index, onOpen }: { card: StatCard; index: number; onOpen: (trigger: HTMLButtonElement) => void }) {
  const decimals = card.type === "avgAccuracy";
  const counted = useAnimatedCounter(decimals ? Math.round(card.value * 10) : card.value, 1000, index * 60);
  const shown = decimals ? counted / 10 : counted;
  const { Icon } = card;
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...PROFILE_SPRING, delay: index * 0.04 }}
      onClick={(event) => onOpen(event.currentTarget)}
      aria-haspopup="dialog"
      aria-label={`${card.label}: ${card.format(card.value)}. View chart`}
      className="group flex min-w-0 flex-col gap-3 rounded-3xl border border-border bg-card p-5 text-left hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-ring motion-safe:transition-[transform,border-color] motion-safe:hover:-translate-y-0.5"
    >
      <span className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary"><Icon weight="fill" className="size-4" aria-hidden="true" /></span>{card.label}</span>
        <ArrowRightIcon className="size-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
      </span>
      <span className="break-words text-4xl font-bold tabular-nums tracking-tight">{card.format(shown)}</span>
      {card.trend && card.trend.length >= 2 ? <Sparkline values={card.trend} /> : <span className="h-10" aria-hidden="true" />}
      <span className="text-xs text-muted-foreground">{card.note}</span>
    </motion.button>
  );
}

/** Shown instead of a wall of zeros before the first counted test. */
function NoStatsYet({ own, username }: { own: boolean; username: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary"><KeyboardIcon weight="fill" className="size-7" aria-hidden="true" /></span>
      <div className="flex flex-col gap-1">
        <p className="text-lg font-bold">No stats yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {own ? "Finish your first test and your speed, accuracy and typing time show up here." : <><span className="[overflow-wrap:anywhere]">{username}</span> hasn’t finished a test yet.</>}
        </p>
      </div>
      {own && (
        <Link to="/" className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <ArrowFatRightIcon className="size-4" aria-hidden="true" />Start a test
        </Link>
      )}
    </div>
  );
}

/** Stats tab and public profile: name, picture and lifetime cards; each card opens its chart. */
export function StatsPanel({ user, stats, results, streak }: {
  user: ProfileUser;
  stats: ProfileStatsSummary;
  results: readonly VerifiedProfileTestResult[];
  /** Only known on your own profile. */
  streak?: ProfileStreak | null;
}) {
  const own = streak !== undefined;
  const started = stats.totalTests > 0;
  const [chart, setChart] = useState<StatCard | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const restoreFocus = (event: Event) => {
    event.preventDefault();
    if (trigger.current?.isConnected) trigger.current.focus();
  };
  const joined = joinedPhrase(user.createdAt);
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-center gap-5 rounded-3xl border border-border bg-card p-6">
        {/* Smaller on phones so a long name keeps a readable line length beside the picture. */}
        <ProfileAvatar user={user} size="size-14 sm:size-20" text="text-2xl sm:text-3xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="break-words text-2xl font-bold [overflow-wrap:anywhere] sm:text-3xl">{user.username}</h2>
          <p className="text-sm text-muted-foreground">
            {started ? `${joined ? `Typing since ${joined} · ` : ""}${stats.totalTests.toLocaleString()} ${stats.totalTests === 1 ? "test" : "tests"}` : joined ? `Joined ${joined}` : "New player"}
          </p>
        </div>
        {streak && streak.longestStreak > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-2 rounded-2xl bg-warning/15 px-4 py-2 text-sm font-semibold text-warning">
              <FlameIcon weight="fill" className="size-5" aria-hidden="true" />{streakLabel(streak.currentStreak)}
            </span>
            <span className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">
              <ChartLineUpIcon className="size-5" aria-hidden="true" />Best streak {streak.longestStreak} {streak.longestStreak === 1 ? "day" : "days"}
            </span>
          </div>
        )}
      </section>
      <section aria-labelledby="profile-lifetime" className="flex flex-col gap-3">
        <h3 id="profile-lifetime" className="px-1 text-xs uppercase tracking-wider text-muted-foreground">Lifetime statistics</h3>
        {started ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cardsFor(stats, results).map((card, index) => <StatTile key={card.type} card={card} index={index} onOpen={(button) => { trigger.current = button; setChart(card); }} />)}
          </div>
        ) : <NoStatsYet own={own} username={user.username} />}
      </section>
      {chart && (
        <Suspense fallback={<p role="status" className="py-6 text-center text-sm text-muted-foreground">Loading chart…</p>}>
          <UserStatsChartModal isOpen onClose={() => setChart(null)} cardType={chart.type} cardValue={chart.format(chart.value)} allResults={[...results]} onCloseAutoFocus={restoreFocus} />
        </Suspense>
      )}
    </div>
  );
}
