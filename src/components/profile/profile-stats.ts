// Pure helpers that turn the profile queries (stats, latest results, earned achievements) into what the
// Stats, History and Achievements tabs draw.
import {
  ACHIEVEMENT_CATEGORIES, ALL_ACHIEVEMENTS, type Achievement, type AchievementCategory, type AchievementTier,
} from "@/lib/achievement-definitions";
import { profileResultVerification, type ProfileTestResult, type ResultVerification, type VerifiedProfileTestResult } from "@/components/stats/profile-presentation";

const DAY = 86_400_000;
const WEEK = 7 * DAY;

export const countsTowardStats = (verification: ResultVerification) => verification === "valid" || verification === "verified";

export function withVerification(results: readonly (ProfileTestResult & { verification?: ResultVerification })[]): VerifiedProfileTestResult[] {
  return results.map((result) => ({ ...result, verification: profileResultVerification(result) }));
}

/** Weekly averages of counted tests, oldest first; empty weeks are skipped. */
export function weeklyTrend(results: readonly VerifiedProfileTestResult[], key: "wpm" | "accuracy", now = Date.now(), weeks = 16) {
  const buckets = new Map<number, number[]>();
  for (const result of results) {
    if (!countsTowardStats(result.verification)) continue;
    const age = Math.floor((now - result.createdAt) / WEEK);
    if (age < 0 || age >= weeks) continue;
    (buckets.get(age) ?? buckets.set(age, []).get(age)!).push(result[key]);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => b - a)
    .map(([, values]) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10);
}

function startOfDay(timestamp: number) {
  return new Date(timestamp).setHours(0, 0, 0, 0);
}

export function relativeDay(timestamp: number, now = Date.now()) {
  const days = Math.round((startOfDay(now) - startOfDay(timestamp)) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return new Date(timestamp).toLocaleDateString([], { weekday: "long" });
  const sameYear = new Date(timestamp).getFullYear() === new Date(now).getFullYear();
  return new Date(timestamp).toLocaleDateString([], sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

/** "earned yesterday", "earned on Monday", "earned Oct 17". */
export function earnedPhrase(timestamp: number, now = Date.now()) {
  const day = relativeDay(timestamp, now);
  if (day === "Today" || day === "Yesterday") return `earned ${day.toLowerCase()}`;
  return /\d/.test(day) ? `earned ${day}` : `earned on ${day}`;
}

export const clock = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export interface HistoryDay {
  key: number;
  label: string;
  results: VerifiedProfileTestResult[];
}

/** Results grouped by calendar day, newest day and newest test first. */
export function groupByDay(results: readonly VerifiedProfileTestResult[], now = Date.now()): HistoryDay[] {
  const days = new Map<number, VerifiedProfileTestResult[]>();
  for (const result of [...results].sort((a, b) => b.createdAt - a.createdAt)) {
    const key = startOfDay(result.createdAt);
    (days.get(key) ?? days.set(key, []).get(key)!).push(result);
  }
  return [...days.entries()].map(([key, dayResults]) => ({ key, label: relativeDay(key, now), results: dayResults }));
}

export const testsSince = (results: readonly VerifiedProfileTestResult[], since: number) => results.filter((result) => result.createdAt >= since).length;

/** The newest counted test that set the lifetime best, if it is among the latest results. */
export function personalBestId(results: readonly VerifiedProfileTestResult[], bestWpm: number) {
  if (bestWpm <= 0) return undefined;
  return [...results].sort((a, b) => b.createdAt - a.createdAt).find((result) => countsTowardStats(result.verification) && result.wpm === bestWpm)?._id;
}

export function joinedPhrase(createdAt: number | undefined) {
  return createdAt ? new Date(createdAt).toLocaleDateString([], { month: "long", year: "numeric" }) : undefined;
}

// --- Achievements ---

export const ACHIEVEMENT_ORDER: AchievementCategory[] = [
  "speed", "words", "accuracy", "time", "streak", "tests", "explorer", "special", "consistency", "improvement",
  "challenge", "endurance", "timebased", "milestone", "quirky", "collection",
];

/** Lifetime numbers the progressive ladders measure. Leave a value out when it is not known. */
export interface AchievementProgress {
  bestWpm?: number;
  totalWordsTyped?: number;
  totalTimeTypedMs?: number;
  totalTests?: number;
  longestStreak?: number;
}

export interface LadderStep {
  achievement: Achievement;
  earned: boolean;
  earnedAt?: number;
}

export interface Ladder {
  category: AchievementCategory;
  title: string;
  icon: Achievement["icon"];
  /** A single measured value (best speed, words, …) when the category has one. */
  current?: { value: number; unit: string; label: string };
  steps: LadderStep[];
  /** Long ladders summarise by tier; short ones get a segment per badge. */
  byTier: boolean;
}

function measured(category: AchievementCategory, progress: AchievementProgress): Ladder["current"] {
  const value = (amount: number | undefined, unit: string, label: string) => amount === undefined ? undefined : { value: amount, unit, label };
  switch (category) {
    case "speed": return value(progress.bestWpm, "WPM", "Best speed");
    case "words": return value(progress.totalWordsTyped, "words", "Correct words");
    case "time": return value(progress.totalTimeTypedMs === undefined ? undefined : Math.floor(progress.totalTimeTypedMs / 60_000), "minutes", "Typing time");
    case "tests": return value(progress.totalTests, "tests", "Tests finished");
    case "streak": return value(progress.longestStreak, "days", "Longest streak");
    default: return undefined;
  }
}

/** One ladder per achievement category, in catalogue order, from the earned map (id → earned time). */
export function buildLadders(earned: Record<string, number>, progress: AchievementProgress = {}): Ladder[] {
  return ACHIEVEMENT_ORDER.map((category) => {
    const steps = ALL_ACHIEVEMENTS.filter((achievement) => achievement.category === category).map((achievement) => {
      const earnedAt = earned[achievement.id];
      return { achievement, earned: earnedAt !== undefined, earnedAt };
    });
    const info = ACHIEVEMENT_CATEGORIES[category];
    return { category, title: info.name, icon: info.icon, current: measured(category, progress), steps, byTier: steps.length > 12 };
  }).filter((ladder) => ladder.steps.length > 0);
}

export const LADDER_TIERS = ["copper", "silver", "gold", "diamond", "emerald"] as const satisfies readonly AchievementTier[];

export interface TierSummary {
  tier: AchievementTier;
  steps: LadderStep[];
  earned: number;
}

/** Levels split by tier; tiers a ladder never uses are left out. */
export function tiersOf(ladder: Ladder): TierSummary[] {
  return LADDER_TIERS
    .map((tier) => {
      const steps = ladder.steps.filter((step) => step.achievement.tier === tier);
      return { tier, steps, earned: steps.filter((step) => step.earned).length };
    })
    .filter((summary) => summary.steps.length > 0);
}

/** The first level still to earn, or undefined once everything is unlocked. */
export const nextStep = (ladder: Ladder) => ladder.steps.find((step) => !step.earned);
export const earnedCount = (ladder: Ladder) => ladder.steps.filter((step) => step.earned).length;

/** The highest tier earned (latest level within it), or the first level when nothing is earned yet. */
export function headlineStep(ladder: Ladder): LadderStep {
  const earned = ladder.steps.filter((step) => step.earned);
  if (!earned.length) return ladder.steps[0];
  const rank = (step: LadderStep) => LADDER_TIERS.indexOf(step.achievement.tier);
  return earned.reduce((best, step) => (rank(step) >= rank(best) ? step : best));
}

/** How far the measured value is from a level's target, e.g. "6,598 words to go". */
export function toGo(ladder: Ladder, step: LadderStep) {
  if (!ladder.current || step.achievement.target === undefined) return "Not yet";
  const gap = Math.max(0, step.achievement.target - ladder.current.value);
  if (gap === 0) return "Almost there";
  const unit = gap === 1 && ladder.current.unit !== "WPM" ? ladder.current.unit.replace(/s$/, "") : ladder.current.unit;
  return `${gap.toLocaleString()} ${unit} to go`;
}
