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
import { MOCK_CHART_RESULTS, MOCK_STATS, MOCK_USER } from "./mock-profile";

const UserStatsChartModal = lazy(() => import("@/components/stats/UserStatsChartModal"));

const ease = "transition-[padding,opacity] duration-300";

function Avatar({ size = "size-12", text = "text-lg" }: { size?: string; text?: string }) {
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-[conic-gradient(from_200deg,var(--primary),var(--accent-emphasis),var(--primary))] font-bold text-primary-foreground ${size} ${text}`}>
      {MOCK_USER.username[0].toUpperCase()}
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

const CARDS: StatCard[] = [
  { type: "bestWpm", label: "Best WPM", value: MOCK_STATS.bestWpm, format: String, Icon: TrophyIcon, note: "Quote · yesterday" },
  { type: "avgWpm", label: "Average WPM", value: MOCK_STATS.averageWpm, format: String, Icon: GaugeIcon, trend: MOCK_STATS.trend, note: "+17 since March" },
  { type: "avgAccuracy", label: "Average accuracy", value: MOCK_STATS.averageAccuracy, format: (value) => `${value}%`, Icon: TargetIcon, trend: MOCK_STATS.accuracyTrend, note: "Up 5% since March" },
  { type: "typingTime", label: "Typing time", value: MOCK_STATS.totalTimeTyped, format: formatDuration, Icon: ClockIcon, note: `${MOCK_STATS.totalTests} tests` },
  { type: "wordsTyped", label: "Words typed", value: MOCK_STATS.totalWordsTyped, format: (value) => value.toLocaleString(), Icon: TextAaIcon, note: "Correct words, all time" },
  { type: "characters", label: "Characters", value: MOCK_STATS.totalCharactersTyped, format: (value) => value.toLocaleString(), Icon: TextTIcon, note: "Estimated as words × 5" },
];

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

/** Stats tab: the header and lifetime cards from today’s profile page. */
export function StatsPanel() {
  const [chart, setChart] = useState<StatCard | null>(null);
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-center gap-5 rounded-3xl border border-border bg-card p-6">
        <Avatar size="size-20" text="text-3xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="truncate text-3xl font-bold">{MOCK_USER.username}</h2>
          <p className="text-sm text-muted-foreground">Typing since {MOCK_USER.joined} · {MOCK_STATS.totalTests} tests</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-2 rounded-2xl bg-warning/15 px-4 py-2 text-sm font-semibold text-warning">
            <FlameIcon weight="fill" className="size-5" aria-hidden="true" />{MOCK_USER.streak}-day streak
          </span>
          <span className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">
            <ChartLineUpIcon className="size-5" aria-hidden="true" />Best streak {MOCK_USER.bestStreak} days
          </span>
        </div>
      </section>
      <section aria-labelledby="lab-lifetime" className="flex flex-col gap-3">
        <h3 id="lab-lifetime" className="px-1 text-xs uppercase tracking-wider text-muted-foreground">Lifetime stats</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CARDS.map((card, index) => <StatTile key={card.label} card={card} index={index} onOpen={() => setChart(card)} />)}
        </div>
      </section>
      {chart && (
        <Suspense fallback={<p role="status" className="py-6 text-center text-sm text-muted-foreground">Loading chart…</p>}>
          <UserStatsChartModal isOpen onClose={() => setChart(null)} cardType={chart.type} cardValue={chart.format(chart.value)} allResults={MOCK_CHART_RESULTS} />
        </Suspense>
      )}
    </div>
  );
}
