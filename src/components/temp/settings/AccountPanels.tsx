import { lazy, Suspense, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRightIcon, ChartLineUpIcon, ClockIcon, FlameIcon, GaugeIcon, SignInIcon, TargetIcon, TextAaIcon, TextTIcon, TrophyIcon, type Icon,
} from "@phosphor-icons/react";
import { useAppAuth } from "@/components/layout/useAppAuth";
import { formatDuration } from "@/components/stats/profile-presentation";
import type { StatCardType } from "@/components/stats/UserStatsChartModal";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { toast } from "@/lib/toast-manager";
import { Sparkline } from "./MockCharts";
import { LAB_SPRING } from "./lab-settings";
import { avatarTone } from "@/components/temp/leaderboard/mock-leaderboard";
import { MY_PROFILE, type PublicProfile } from "./mock-players";
import { MOCK_USER } from "./mock-profile";

const UserStatsChartModal = lazy(() => import("@/components/stats/UserStatsChartModal"));

const ease = "transition-[padding,opacity] duration-300";

function Avatar({ username = MOCK_USER.username, size = "size-12", text = "text-lg" }: { username?: string; size?: string; text?: string }) {
  // Your own avatar keeps the gradient; other players use the same colour as on the leaderboard.
  const tone = username === MOCK_USER.username ? "bg-[conic-gradient(from_200deg,var(--primary),var(--accent-emphasis),var(--primary))] text-primary-foreground" : avatarTone(username);
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full font-bold ${tone} ${size} ${text}`}>
      {username[0].toUpperCase()}
    </span>
  );
}

/** Signed in: who you are, one tap from your stats. */
export function AccountCard({ collapsed, fade, selected, onOpen }: { collapsed: boolean; fade: string; selected: boolean; onOpen: () => void }) {
  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={LAB_SPRING}
      onClick={onOpen}
      aria-label={`Your profile: ${MOCK_USER.username}`}
      title={collapsed ? MOCK_USER.username : undefined}
      className={`flex items-center gap-3 rounded-2xl py-3 text-left ring-primary/60 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring ${ease} ${selected ? "bg-accent ring-2" : "bg-card"} ${collapsed ? "px-3 md:px-0 md:ring-0" : "px-3"}`}
    >
      <Avatar />
      <span className={`flex min-w-0 flex-1 flex-col whitespace-nowrap ${ease} ${fade}`}>
        <span className="truncate font-semibold">{MOCK_USER.username}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <FlameIcon weight="fill" className="size-3.5 text-warning" aria-hidden="true" />{MOCK_USER.streak}-day streak
        </span>
      </span>
    </motion.button>
  );
}

/** Signed out: one big, obvious way in. Opens the real Clerk sign-in modal where auth is available. */
export function SignInButton({ collapsed, fade }: { collapsed: boolean; fade: string }) {
  const { openSignIn } = useAppAuth();
  const signIn = async () => {
    if (!await openSignIn()) toast.add({ type: "info", title: "Sign-in isn’t available here", description: "On the live site this opens the sign-in window." });
  };
  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={LAB_SPRING}
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

interface StatCard {
  type: StatCardType;
  label: string;
  value: number;
  format: (value: number) => string;
  Icon: Icon;
  trend?: number[];
  note: string;
}

function cardsFor({ stats, joined }: PublicProfile): StatCard[] {
  const since = joined.split(" ")[0];
  const gain = stats.trend[stats.trend.length - 1] - stats.trend[0];
  const accuracyGain = stats.accuracyTrend[stats.accuracyTrend.length - 1] - stats.accuracyTrend[0];
  return [
    { type: "bestWpm", label: "Best WPM", value: stats.bestWpm, format: String, Icon: TrophyIcon, note: "Personal best" },
    { type: "avgWpm", label: "Average WPM", value: stats.averageWpm, format: String, Icon: GaugeIcon, trend: stats.trend, note: `${gain >= 0 ? "+" : ""}${gain} since ${since}` },
    { type: "avgAccuracy", label: "Average accuracy", value: stats.averageAccuracy, format: (value) => `${value}%`, Icon: TargetIcon, trend: stats.accuracyTrend, note: `${accuracyGain >= 0 ? "Up" : "Down"} ${Math.abs(accuracyGain)}% since ${since}` },
    { type: "typingTime", label: "Typing time", value: stats.totalTimeTyped, format: formatDuration, Icon: ClockIcon, note: `${stats.totalTests} tests` },
    { type: "wordsTyped", label: "Words typed", value: stats.totalWordsTyped, format: (value) => value.toLocaleString(), Icon: TextAaIcon, note: "Correct words, all time" },
    { type: "characters", label: "Characters", value: stats.totalCharactersTyped, format: (value) => value.toLocaleString(), Icon: TextTIcon, note: "Estimated as words × 5" },
  ];
}

function StatTile({ card, index, onOpen }: { card: StatCard; index: number; onOpen: () => void }) {
  const counted = useAnimatedCounter(card.label === "Average accuracy" ? card.value * 10 : card.value, 1000, index * 60);
  const shown = card.label === "Average accuracy" ? counted / 10 : counted;
  const { Icon } = card;
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...LAB_SPRING, delay: index * 0.04 }}
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`${card.label}: ${card.format(card.value)}. View chart`}
      className="group flex min-w-0 flex-col gap-3 rounded-3xl border border-border bg-card p-5 text-left hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-ring motion-safe:transition-[transform,border-color] motion-safe:hover:-translate-y-0.5"
    >
      <span className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary"><Icon weight="fill" className="size-4" aria-hidden="true" /></span>{card.label}</span>
        <ArrowRightIcon className="size-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
      </span>
      <span className="text-4xl font-bold tabular-nums tracking-tight">{card.format(shown)}</span>
      {card.trend ? <Sparkline values={card.trend} /> : <span className="h-10" aria-hidden="true" />}
      <span className="text-xs text-muted-foreground">{card.note}</span>
    </motion.button>
  );
}

/** Stats tab and public profile: name, picture and lifetime cards; each card opens its chart. */
export function StatsPanel({ profile = MY_PROFILE }: { profile?: PublicProfile }) {
  const [chart, setChart] = useState<StatCard | null>(null);
  const { stats } = profile;
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-center gap-5 rounded-3xl border border-border bg-card p-6">
        <Avatar username={profile.username} size="size-20" text="text-3xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="truncate text-3xl font-bold">{profile.username}</h2>
          <p className="text-sm text-muted-foreground">Typing since {profile.joined} · {stats.totalTests} tests</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-2 rounded-2xl bg-warning/15 px-4 py-2 text-sm font-semibold text-warning">
            <FlameIcon weight="fill" className="size-5" aria-hidden="true" />{profile.streak}-day streak
          </span>
          <span className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">
            <ChartLineUpIcon className="size-5" aria-hidden="true" />Best streak {profile.bestStreak} days
          </span>
        </div>
      </section>
      <section aria-labelledby="lab-lifetime" className="flex flex-col gap-3">
        <h3 id="lab-lifetime" className="px-1 text-xs uppercase tracking-wider text-muted-foreground">Lifetime stats</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cardsFor(profile).map((card, index) => <StatTile key={card.label} card={card} index={index} onOpen={() => setChart(card)} />)}
        </div>
      </section>
      {chart && (
        <Suspense fallback={<p role="status" className="py-6 text-center text-sm text-muted-foreground">Loading chart…</p>}>
          <UserStatsChartModal isOpen onClose={() => setChart(null)} cardType={chart.type} cardValue={chart.format(chart.value)} allResults={profile.chartResults} />
        </Suspense>
      )}
    </div>
  );
}

const PROMPTS: Record<"stats" | "history" | "achievements", { title: string; body: string }> = {
  stats: { title: "Sign in to see your profile", body: "Your speed, accuracy and typing time, saved after every test." },
  history: { title: "Sign in to see your history", body: "Every test you finish is saved here, grouped by day." },
  achievements: { title: "Sign in to collect achievements", body: "Earn cards for speed, streaks and words typed, and see every level ahead." },
};

/** What an account tab shows to someone signed out, e.g. at /profile/history. */
export function SignInPrompt({ pane }: { pane: keyof typeof PROMPTS }) {
  const { openSignIn } = useAppAuth();
  const prompt = PROMPTS[pane];
  const signIn = async () => {
    if (!await openSignIn()) toast.add({ type: "info", title: "Sign-in isn’t available here", description: "On the live site this opens the sign-in window. In this mockup, use Preview signed in." });
  };
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
