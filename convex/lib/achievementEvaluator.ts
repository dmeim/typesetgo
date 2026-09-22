import { v, type Infer } from "convex/values";
import { ALL_ACHIEVEMENTS } from "../../src/lib/achievement-definitions";
import type { Doc } from "../_generated/dataModel";
import { getQualifyingAchievementIds } from "../achievementThresholds";
import { selectAwardableAchievements } from "./achievementGate";
import { qualifiesForAchievement, qualifiesForStreak } from "./qualification";
import { utcDate } from "./activityCalendar";

interface TestResultData {
  wpm: number;
  accuracy: number;
  mode: string;
  duration: number;
  wordCount: number;
  difficulty: string;
  punctuation: boolean;
  numbers: boolean;
  capitalization?: boolean;
  wordsCorrect: number;
  wordsIncorrect: number;
  createdAt: number;
}

interface AchievementCheckContext {
  testResult: TestResultData;
  localHour: number;
  isWeekend: boolean;
  // Aggregate stats
  totalTests: number;
  totalWordsCorrect: number;
  totalTimeTyped: number;
  testsWithHighAccuracy: number; // 95%+
  perfectAccuracyStreak: number;
  weekendTestCount: number;
  // Mode tracking
  modesCovered: Set<string>;
  difficultiesCovered: Set<string>;
  // Current streak
  currentStreak: number;

  // === NEW FIELDS FOR NEW ACHIEVEMENT CATEGORIES ===

  // Time-based
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  monthDay: { month: number; day: number }; // 0-11 for month, 1-31 for day

  // Consistency
  consecutiveHighAccuracyStreak: number; // 90%+ accuracy consecutive
  recentWpmVariance: number; // variance in WPM across last N tests
  lowVarianceTestCount: number; // count of tests with low variance
  sameWpmCount: number; // count of tests with exact same WPM

  // Improvement
  personalBestWpm: number;
  previousPersonalBest: number; // PB before this test
  firstTestWpm: number;
  pbImprovementCount: number; // how many times user has set a new PB
  averageWpm: number;
  firstFiveAvgWpm: number; // average of first 5 tests
  isNewPersonalBest: boolean;
  pbImprovement: number; // how much the PB improved by (0 if not a PB)

  // Endurance
  testsToday: number;

  // Milestone
  wpmByMode: Map<string, number>; // best WPM per mode
  averageAccuracy: number;
  has100WpmAllDaysInStreak: boolean; // for week streak with 100+ WPM

  // Weekday tracking
  weekdaysCovered: Set<number>; // 1-5 (Mon-Fri)
  weekendDaysCovered: Set<number>; // 0, 6 (Sun, Sat)

  // Collection
  totalAchievementsCount: number;
  /** false = saveResult: exempt badges only */
  rankedEligible?: boolean;
}

/**
 * Check which achievements should be awarded based on test result and aggregate stats
 */
function checkAchievements(ctx: AchievementCheckContext): string[] {
  const newAchievements: string[] = [];
  const { testResult } = ctx;

  // === SPEED ACHIEVEMENTS (WPM milestones) ===
  // Uses tier-based IDs: speed-copper-1, speed-silver-5, etc.
  newAchievements.push(...getQualifyingAchievementIds("speed", testResult.wpm));

  // === WORD ACHIEVEMENTS (cumulative words) ===
  // Uses tier-based IDs: words-copper-1, words-silver-5, etc.
  newAchievements.push(...getQualifyingAchievementIds("words", ctx.totalWordsCorrect));

  // === ACCURACY ACHIEVEMENTS ===
  // Perfect accuracy on this test (standalone)
  if (testResult.accuracy === 100) {
    newAchievements.push("accuracy-perfect-1");
  }

  // Tests with 95%+ accuracy - tier-based IDs
  newAchievements.push(...getQualifyingAchievementIds("accuracy-95", ctx.testsWithHighAccuracy));

  // Perfect accuracy streak - tier-based IDs
  newAchievements.push(...getQualifyingAchievementIds("accuracy-streak", ctx.perfectAccuracyStreak));

  // === TIME ACHIEVEMENTS (cumulative time) ===
  // Convert from milliseconds to minutes for threshold check
  const totalMinutesTyped = ctx.totalTimeTyped / (60 * 1000);
  newAchievements.push(...getQualifyingAchievementIds("time", totalMinutesTyped));

  // === STREAK ACHIEVEMENTS ===
  newAchievements.push(...getQualifyingAchievementIds("streak", ctx.currentStreak));

  // === TEST COUNT ACHIEVEMENTS ===
  newAchievements.push(...getQualifyingAchievementIds("tests", ctx.totalTests));

  // === EXPLORER ACHIEVEMENTS (modes/features) ===
  const modeAchievements: Record<string, string> = {
    time: "explorer-time-mode",
    words: "explorer-words-mode",
    quote: "explorer-quote-mode",
    preset: "explorer-preset-mode",
  };
  for (const [mode, id] of Object.entries(modeAchievements)) {
    if (ctx.modesCovered.has(mode)) {
      newAchievements.push(id);
    }
  }

  if (testResult.punctuation) {
    newAchievements.push("explorer-punctuation");
  }
  if (testResult.numbers) {
    newAchievements.push("explorer-numbers");
  }

  // All difficulties covered
  if (
    ctx.difficultiesCovered.has("easy") &&
    ctx.difficultiesCovered.has("medium") &&
    ctx.difficultiesCovered.has("hard")
  ) {
    newAchievements.push("explorer-all-difficulties");
  }

  // === SPECIAL ACHIEVEMENTS ===
  // First test
  if (ctx.totalTests === 1) {
    newAchievements.push("special-first-test");
  }

  // Night owl (midnight to 5am)
  if (ctx.localHour >= 0 && ctx.localHour < 5) {
    newAchievements.push("special-night-owl");
  }

  // Early bird (5am to 7am)
  if (ctx.localHour >= 5 && ctx.localHour < 7) {
    newAchievements.push("special-early-bird");
  }

  // Weekend warrior (10 tests on weekends)
  if (ctx.weekendTestCount >= 10) {
    newAchievements.push("special-weekend-warrior");
  }

  // Marathon (120+ seconds)
  if (testResult.duration >= 120000) {
    newAchievements.push("special-marathon");
  }

  // Speed and precision (100+ WPM with 95%+ accuracy)
  if (testResult.wpm >= 100 && testResult.accuracy >= 95) {
    newAchievements.push("special-speed-accuracy");
  }

  // === CONSISTENCY ACHIEVEMENTS ===

  // Low variance achievements - tier-based IDs
  newAchievements.push(...getQualifyingAchievementIds("consistency-variance", ctx.lowVarianceTestCount));

  // Same WPM achievement (standalone)
  if (ctx.sameWpmCount >= 3) {
    newAchievements.push("consistency-same-wpm-3");
  }

  // Consecutive 90%+ accuracy - tier-based IDs
  newAchievements.push(...getQualifyingAchievementIds("consistency-90plus", ctx.consecutiveHighAccuracyStreak));

  // === IMPROVEMENT ACHIEVEMENTS ===

  // Personal best count - tier-based IDs
  newAchievements.push(...getQualifyingAchievementIds("improvement-pb", ctx.pbImprovementCount));

  // PB improvement amount (standalone)
  if (ctx.isNewPersonalBest && ctx.pbImprovement >= 10) {
    newAchievements.push("improvement-pb-by-10");
  }
  if (ctx.isNewPersonalBest && ctx.pbImprovement >= 20) {
    newAchievements.push("improvement-pb-by-20");
  }

  // Double first test WPM (standalone)
  if (ctx.firstTestWpm > 0 && testResult.wpm >= ctx.firstTestWpm * 2) {
    newAchievements.push("improvement-double-wpm");
  }

  // Rising average (standalone)
  if (ctx.firstFiveAvgWpm > 0 && ctx.averageWpm >= ctx.firstFiveAvgWpm + 20) {
    newAchievements.push("improvement-avg-increase");
  }

  // === CHALLENGE MODE ACHIEVEMENTS ===

  const isHard = testResult.difficulty === "hard";

  if (isHard && testResult.punctuation) {
    newAchievements.push("challenge-hard-punctuation");
  }
  if (isHard && testResult.numbers) {
    newAchievements.push("challenge-hard-numbers");
  }
  if (isHard && testResult.punctuation && testResult.numbers) {
    newAchievements.push("challenge-hard-both");
  }
  if (isHard && testResult.wpm >= 80) {
    newAchievements.push("challenge-hard-80wpm");
  }
  if (isHard && testResult.punctuation && testResult.numbers && testResult.wpm >= 80) {
    newAchievements.push("challenge-hard-both-80wpm");
  }
  if (isHard && testResult.accuracy === 100) {
    newAchievements.push("challenge-hard-100-accuracy");
  }

  // === ENDURANCE ACHIEVEMENTS ===

  // Tests in one day - tier-based IDs
  newAchievements.push(...getQualifyingAchievementIds("endurance-daily", ctx.testsToday));

  // Long test duration (standalone)
  if (testResult.duration >= 180000) { // 180 seconds
    newAchievements.push("endurance-180s-test");
  }
  if (testResult.duration >= 300000) { // 300 seconds (5 min)
    newAchievements.push("endurance-300s-test");
  }

  // High word count test (standalone)
  if (testResult.wordCount >= 500) {
    newAchievements.push("endurance-500-words-test");
  }

  // === TIME-BASED ACHIEVEMENTS ===

  // Lunch break (12pm-2pm)
  if (ctx.localHour >= 12 && ctx.localHour < 14) {
    newAchievements.push("timebased-lunch");
  }

  // Midnight (12am hour)
  if (ctx.localHour === 0) {
    newAchievements.push("timebased-midnight");
  }

  // New Year (January 1st)
  if (ctx.monthDay.month === 0 && ctx.monthDay.day === 1) {
    newAchievements.push("timebased-new-year");
  }

  // Friday
  if (ctx.dayOfWeek === 5) {
    newAchievements.push("timebased-friday");
  }

  // Monday
  if (ctx.dayOfWeek === 1) {
    newAchievements.push("timebased-monday");
  }

  // Major holidays
  const { month, day } = ctx.monthDay;
  const isHoliday =
    (month === 11 && day === 25) || // Christmas
    (month === 11 && day === 31) || // New Year's Eve
    (month === 6 && day === 4) ||   // July 4th
    (month === 9 && day === 31) ||  // Halloween
    (month === 1 && day === 14) ||  // Valentine's Day
    (month === 2 && day === 17);    // St. Patrick's Day
  if (isHoliday) {
    newAchievements.push("timebased-holiday");
  }

  // All weekdays (check if this test completes the set)
  if (ctx.weekdaysCovered.size >= 5) {
    newAchievements.push("timebased-all-weekdays");
  }

  // Weekend complete
  if (ctx.weekendDaysCovered.size >= 2) {
    newAchievements.push("timebased-all-weekend");
  }

  // === MILESTONE COMBINATIONS ===

  // Perfect century (100+ WPM, 100% accuracy)
  if (testResult.wpm >= 100 && testResult.accuracy === 100) {
    newAchievements.push("milestone-100wpm-100acc");
  }

  // Elite typist (80+ WPM, 98%+ accuracy)
  if (testResult.wpm >= 80 && testResult.accuracy >= 98) {
    newAchievements.push("milestone-80wpm-98acc");
  }

  // Hard perfection (50+ WPM, 100% accuracy on hard)
  if (isHard && testResult.wpm >= 50 && testResult.accuracy === 100) {
    newAchievements.push("milestone-50wpm-100acc-hard");
  }

  // Triple threat (100+ WPM, 100+ words, 100+ seconds)
  if (testResult.wpm >= 100 && testResult.wordCount >= 100 && testResult.duration >= 100000) {
    newAchievements.push("milestone-triple-digits");
  }

  // Speed marathoner (80+ WPM on 120+ second test)
  if (testResult.wpm >= 80 && testResult.duration >= 120000) {
    newAchievements.push("milestone-speed-endurance");
  }

  // Accurate thousand (1000 words with 95%+ avg accuracy)
  if (ctx.totalWordsCorrect >= 1000 && ctx.averageAccuracy >= 95) {
    newAchievements.push("milestone-1000-words-95acc");
  }

  // Mode master (80+ WPM in time, words, and quote modes)
  const timeWpm = ctx.wpmByMode.get("time") || 0;
  const wordsWpm = ctx.wpmByMode.get("words") || 0;
  const quoteWpm = ctx.wpmByMode.get("quote") || 0;
  if (timeWpm >= 80 && wordsWpm >= 80 && quoteWpm >= 80) {
    newAchievements.push("milestone-all-modes-80wpm");
  }

  // Consistent speed (7-day streak with 100+ WPM each day)
  if (ctx.has100WpmAllDaysInStreak) {
    newAchievements.push("milestone-week-streak-100wpm");
  }

  // === FUN/QUIRKY ACHIEVEMENTS ===

  const roundedWpm = Math.round(testResult.wpm);

  // The Meme (67 WPM)
  if (roundedWpm === 67) {
    newAchievements.push("quirky-67");
  }

  // Lucky sevens (77 WPM)
  if (roundedWpm === 77) {
    newAchievements.push("quirky-lucky-7");
  }

  // Perfectly round (100 WPM exact)
  if (roundedWpm === 100) {
    newAchievements.push("quirky-100-exact");
  }

  // Palindrome (11, 22, 33, 44, 55, 66, 77, 88, 99, 111, 121, 131, etc.)
  const wpmStr = roundedWpm.toString();
  const isPalindrome = wpmStr === wpmStr.split("").reverse().join("");
  if (isPalindrome && roundedWpm >= 11) {
    newAchievements.push("quirky-palindrome");
  }

  // Answer to everything (42 WPM)
  if (roundedWpm === 42) {
    newAchievements.push("quirky-42");
  }

  // Easy as 123 (123 WPM)
  if (roundedWpm === 123) {
    newAchievements.push("quirky-123");
  }

  // Pi day (31 WPM on March 14th)
  if (roundedWpm === 31 && ctx.monthDay.month === 2 && ctx.monthDay.day === 14) {
    newAchievements.push("quirky-pi");
  }

  // isValid is enforced by the caller (skip this mutation on invalid tests).
  // Non-exempt IDs still require qualifiesForAchievement; exempt IDs do not.
  return selectAwardableAchievements(newAchievements, {
    isValid: true,
    duration: testResult.duration,
    wordsCorrect: testResult.wordsCorrect,
    accuracy: testResult.accuracy,
    rankedEligible: ctx.rankedEligible,
  });
}


// The UI catalog is pure data; derive category completion from the same IDs users see.
const categoryIds = new Map<string, string[]>();
for (const achievement of ALL_ACHIEVEMENTS) {
  if (achievement.category === "collection") continue;
  const ids = categoryIds.get(achievement.category) ?? [];
  ids.push(achievement.id);
  categoryIds.set(achievement.category, ids);
}

// Bounded state: scalar counters, seven calendar days, five initial WPMs, ten
// recent WPMs, known modes/difficulties, and at most 301 rounded speed buckets.
export const achievementStateValidator = v.object({
  totalTests: v.number(), totalWordsCorrect: v.number(), totalTimeTyped: v.number(),
  competitiveTests: v.number(), totalWpm: v.number(), totalAccuracy: v.number(),
  highAccuracy: v.number(), perfectStreak: v.number(), accuracyStreak: v.number(),
  weekendTests: v.number(), modes: v.array(v.string()), difficulties: v.array(v.string()),
  daysCovered: v.array(v.number()), firstWpms: v.array(v.number()), recentWpms: v.array(v.number()),
  wpmCounts: v.record(v.string(), v.number()), lowVarianceTests: v.number(),
  bestWpm: v.number(), pbCount: v.number(), modeBest: v.record(v.string(), v.number()),
  activityDate: v.string(), activityStreak: v.number(), longestStreak: v.number(),
  speedDate: v.string(), speedStreak: v.number(),
  dailyDate: v.string(), dailyTests: v.number(),
  awards: v.record(v.string(), v.number()),
});
export type AchievementState = Infer<typeof achievementStateValidator>;

export function emptyAchievementState(): AchievementState {
  return {
    totalTests: 0, totalWordsCorrect: 0, totalTimeTyped: 0, competitiveTests: 0,
    totalWpm: 0, totalAccuracy: 0, highAccuracy: 0, perfectStreak: 0, accuracyStreak: 0,
    weekendTests: 0, modes: [], difficulties: [], daysCovered: [], firstWpms: [], recentWpms: [],
    wpmCounts: {}, lowVarianceTests: 0, bestWpm: 0, pbCount: 0, modeBest: {},
    activityDate: "", activityStreak: 0, longestStreak: 0, speedDate: "", speedStreak: 0,
    dailyDate: "", dailyTests: 0, awards: {},
  };
}

function consecutive(previous: string, current: string): boolean {
  return Date.parse(`${current}T00:00:00Z`) - Date.parse(`${previous}T00:00:00Z`) === 86400000;
}

/** All entry points replay exactly this transition, in server result order.
 * Valid activity contributes totals and exempt exploration/calendar badges.
 * Only ranked, qualified results contribute competitive accuracy/speed facts.
 * Historical rows without local calendar facts cannot earn local-time badges.
 */
export function advanceAchievementState(state: AchievementState, result: Doc<"testResults">): void {
  if (result.isValid === false) return;
  const wordsCorrect = result.wordsCorrect ?? 0;
  const eligible = result.rankedEligible !== false &&
    qualifiesForAchievement(result.duration, wordsCorrect, result.accuracy);
  const date = utcDate(result.createdAt);
  const calendar = result.localCalendar;
  state.totalTests++;
  state.totalWordsCorrect += wordsCorrect;
  state.totalTimeTyped += result.duration;
  state.dailyTests = state.dailyDate === date ? state.dailyTests + 1 : 1;
  state.dailyDate = date;
  if (["time", "words", "quote", "preset", "zen"].includes(result.mode) && !state.modes.includes(result.mode)) state.modes.push(result.mode);
  if (["easy", "medium", "hard"].includes(result.difficulty) && !state.difficulties.includes(result.difficulty)) state.difficulties.push(result.difficulty);
  if (calendar) {
    if (!state.daysCovered.includes(calendar.dayOfWeek)) state.daysCovered.push(calendar.dayOfWeek);
    if (calendar.dayOfWeek === 0 || calendar.dayOfWeek === 6) state.weekendTests++;
  }
  if (qualifiesForStreak(result.duration, wordsCorrect) && state.activityDate !== date) {
    state.activityStreak = consecutive(state.activityDate, date) ? state.activityStreak + 1 : 1;
    state.activityDate = date;
    state.longestStreak = Math.max(state.longestStreak, state.activityStreak);
  }
  const previousBest = state.bestWpm;
  if (eligible) {
    state.competitiveTests++;
    state.totalWpm += result.wpm;
    state.totalAccuracy += result.accuracy;
    if (result.accuracy >= 95) state.highAccuracy++;
    state.perfectStreak = result.accuracy === 100 ? state.perfectStreak + 1 : 0;
    state.accuracyStreak++;
    if (state.firstWpms.length < 5) state.firstWpms.push(result.wpm);
    state.recentWpms.push(result.wpm);
    state.recentWpms = state.recentWpms.slice(-10);
    const mean = state.recentWpms.reduce((a, b) => a + b, 0) / state.recentWpms.length;
    const deviation = Math.sqrt(state.recentWpms.reduce((sum, wpm) => sum + (wpm - mean) ** 2, 0) / state.recentWpms.length);
    if (state.recentWpms.length >= 5 && deviation < 5) {
      state.lowVarianceTests += state.competitiveTests === 5 ? 5 : 1;
    }
    const rounded = Math.round(result.wpm);
    if (rounded >= 0 && rounded <= 300) state.wpmCounts[String(rounded)] = Math.min(3, (state.wpmCounts[String(rounded)] ?? 0) + 1);
    if (previousBest > 0 && result.wpm > previousBest) state.pbCount++;
    state.bestWpm = Math.max(previousBest, result.wpm);
    if (["time", "words", "quote", "preset", "zen"].includes(result.mode)) state.modeBest[result.mode] = Math.max(state.modeBest[result.mode] ?? 0, result.wpm);
    if (result.wpm >= 100 && state.speedDate !== date) {
      state.speedStreak = consecutive(state.speedDate, date) ? state.speedStreak + 1 : 1;
      state.speedDate = date;
    }
  } else {
    // Ineligible attempts cannot extend a competitive consecutive sequence.
    state.perfectStreak = 0;
    state.accuracyStreak = 0;
  }
  const candidates = checkAchievements({
    testResult: { ...result, wordsCorrect, wordsIncorrect: result.wordsIncorrect ?? 0 },
    localHour: calendar?.localHour ?? -1,
    isWeekend: calendar?.dayOfWeek === 0 || calendar?.dayOfWeek === 6,
    dayOfWeek: calendar?.dayOfWeek ?? -1,
    monthDay: { month: calendar?.month ?? -1, day: calendar?.day ?? -1 },
    totalTests: state.totalTests, totalWordsCorrect: state.totalWordsCorrect, totalTimeTyped: state.totalTimeTyped,
    testsWithHighAccuracy: state.highAccuracy, perfectAccuracyStreak: state.perfectStreak,
    weekendTestCount: state.weekendTests, modesCovered: new Set(state.modes), difficultiesCovered: new Set(state.difficulties),
    currentStreak: state.activityStreak, consecutiveHighAccuracyStreak: state.accuracyStreak,
    recentWpmVariance: 0, lowVarianceTestCount: state.lowVarianceTests, sameWpmCount: Math.max(0, ...Object.values(state.wpmCounts)),
    personalBestWpm: state.bestWpm, previousPersonalBest: previousBest,
    firstTestWpm: state.firstWpms[0] ?? 0, pbImprovementCount: state.pbCount,
    averageWpm: state.totalWpm / Math.max(1, state.competitiveTests),
    firstFiveAvgWpm: state.firstWpms.length === 5 ? state.firstWpms.reduce((a, b) => a + b, 0) / 5 : 0,
    isNewPersonalBest: previousBest > 0 && result.wpm > previousBest,
    pbImprovement: result.wpm - previousBest, testsToday: state.dailyTests,
    wpmByMode: new Map(Object.entries(state.modeBest)),
    averageAccuracy: state.totalAccuracy / Math.max(1, state.competitiveTests),
    has100WpmAllDaysInStreak: state.speedStreak >= 7 && state.speedDate === date,
    weekdaysCovered: new Set(state.daysCovered.filter((day) => day >= 1 && day <= 5)),
    weekendDaysCovered: new Set(state.daysCovered.filter((day) => day === 0 || day === 6)),
    totalAchievementsCount: Object.keys(state.awards).length,
    rankedEligible: result.rankedEligible,
  });
  for (const id of candidates) state.awards[id] ??= result.createdAt;
  // Count unique earned IDs, including previously earned collection badges.
  // Iterate to a fixed point so save and replay never depend on extra refreshes.
  if (eligible) {
    if ([...categoryIds.values()].some((ids) => ids.every((id) => state.awards[id]))) {
      state.awards["collection-category-complete"] ??= result.createdAt;
    }
    let previousCount = -1;
    while (previousCount !== Object.keys(state.awards).length) {
      previousCount = Object.keys(state.awards).length;
      for (const id of getQualifyingAchievementIds("collection", previousCount)) state.awards[id] ??= result.createdAt;
    }
  }
}
