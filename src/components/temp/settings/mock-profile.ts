// Mock signed-in profile for the /temp-settings1 Stats, History and Achievements tabs. Nothing here is fetched or saved.
import { ACHIEVEMENT_CATEGORIES, ALL_ACHIEVEMENTS, getAchievementById, type Achievement } from "@/lib/achievement-definitions";
import type { ProfileTestResult, ResultVerification } from "@/components/stats/profile-presentation";

const now = Date.now();
const DAY = 86_400_000;
const at = (daysAgo: number, hour: number, minute: number) => {
  const date = new Date(now - daysAgo * DAY);
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
};

export const MOCK_USER = { username: "pixelpenguin", joined: "March 2026", streak: 6, bestStreak: 35 };

export const MOCK_STATS = {
  totalTests: 342,
  totalTimeTyped: 18_720_000,
  bestWpm: 74,
  averageWpm: 58,
  averageAccuracy: 95.6,
  totalWordsTyped: 18_402,
  totalCharactersTyped: 92_010,
  /** Average WPM per week, oldest first, for the stat card sparklines. */
  trend: [41, 44, 43, 47, 49, 48, 52, 51, 54, 55, 53, 57, 58, 58, 61, 60],
  accuracyTrend: [91, 92, 92, 93, 93, 94, 94, 95, 94, 95, 96, 95, 96, 96, 95, 96],
};

export type MockResult = ProfileTestResult & {
  verification: ResultVerification;
  /** WPM per second, like the results page timeline. */
  timeline: number[];
  personalBest?: boolean;
};

function wave(base: number, length: number, seed: number) {
  return Array.from({ length }, (_, index) => Math.round(base + Math.sin(index * 0.9 + seed) * 6 + Math.cos(index * 0.37 + seed * 2) * 4 + (index < 3 ? (index - 3) * 7 : 0)));
}

const result = (fields: Partial<MockResult> & Pick<MockResult, "wpm" | "accuracy" | "mode" | "createdAt">, seed: number): MockResult => ({
  _id: `mock-${seed}` as ProfileTestResult["_id"],
  duration: 30_000,
  wordCount: Math.round(fields.wpm / 2),
  difficulty: "beginner",
  punctuation: false,
  numbers: false,
  capitalization: false,
  wordsCorrect: Math.round(fields.wpm / 2) - 1,
  wordsIncorrect: 1,
  charsMissed: 2,
  charsExtra: 0,
  isValid: true,
  verification: "verified",
  timeline: wave(fields.wpm, Math.round((fields.duration ?? 30_000) / 1000), seed),
  ...fields,
});

export const MOCK_RESULTS: MockResult[] = [
  result({ wpm: 71, accuracy: 97.2, mode: "time", createdAt: at(0, 14, 12) }, 1),
  result({ wpm: 64, accuracy: 94.1, mode: "words", wordTarget: 25, difficulty: "intermediate", punctuation: true, duration: 23_400, createdAt: at(0, 13, 58), wordsIncorrect: 2, charsMissed: 4 }, 2),
  result({ wpm: 74, accuracy: 98.5, mode: "quote", duration: 41_000, createdAt: at(1, 19, 31), personalBest: true, charsMissed: 0 }, 3),
  result({ wpm: 52, accuracy: 91.3, mode: "time", duration: 60_000, capitalization: true, numbers: true, difficulty: "advanced", createdAt: at(1, 8, 5), wordsIncorrect: 4, charsMissed: 7, charsExtra: 2 }, 4),
  result({ wpm: 23, accuracy: 62.4, mode: "time", createdAt: at(3, 21, 47), isValid: false, invalidReason: "Left the page", verification: "invalid", wordsIncorrect: 9, charsMissed: 15, charsExtra: 6 }, 5),
];

export interface MockAchievement {
  achievement: Achievement;
  category: string;
  earnedAt?: number;
  /** Position in a 40-level progressive group, when it belongs to one. */
  level?: { index: number; total: number };
  progress?: { current: number; target: number; unit: string };
}

function levelOf(achievement: Achievement) {
  if (!achievement.progressiveGroup) return undefined;
  const group = ALL_ACHIEVEMENTS.filter((candidate) => candidate.progressiveGroup === achievement.progressiveGroup);
  return { index: group.findIndex((candidate) => candidate.id === achievement.id) + 1, total: group.length };
}

function mock(id: string, extra: Partial<MockAchievement>): MockAchievement {
  const achievement = getAchievementById(id);
  if (!achievement) throw new Error(`Unknown mock achievement: ${id}`);
  return { achievement, category: ACHIEVEMENT_CATEGORIES[achievement.category].name, level: levelOf(achievement), ...extra };
}

const nextWords = ALL_ACHIEVEMENTS.find((achievement) => achievement.progressiveGroup === "words" && (achievement.target ?? 0) > MOCK_STATS.totalWordsTyped);

export const MOCK_ACHIEVEMENTS: MockAchievement[] = [
  mock("speed-emerald-2", { earnedAt: at(1, 19, 31) }),
  mock("streak-gold-1", { earnedAt: at(9, 18, 0) }),
  mock("special-night-owl", { earnedAt: at(22, 0, 41) }),
  mock(nextWords?.id ?? "words-diamond-1", { progress: { current: MOCK_STATS.totalWordsTyped, target: nextWords?.target ?? 3000, unit: "words" } }),
];

export const MOCK_ACHIEVEMENT_TOTALS = { earned: 187, total: ALL_ACHIEVEMENTS.length };

export function relativeDay(timestamp: number) {
  const days = Math.floor((new Date(now).setHours(0, 0, 0, 0) - new Date(timestamp).setHours(0, 0, 0, 0)) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return new Date(timestamp).toLocaleDateString([], { weekday: "long" });
  return new Date(timestamp).toLocaleDateString([], { month: "short", day: "numeric" });
}

/** "earned yesterday", "earned on Monday", "earned Oct 17". */
export function earnedPhrase(timestamp: number) {
  const day = relativeDay(timestamp);
  if (day === "Today" || day === "Yesterday") return `earned ${day.toLowerCase()}`;
  return /\d/.test(day) ? `earned ${day}` : `earned on ${day}`;
}

export const clock = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
