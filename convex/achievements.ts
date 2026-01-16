import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getQualifyingAchievementIds } from "./achievementThresholds";
import { qualifiesForAchievement } from "./streaks";

// Achievement checking logic
// Note: Achievement definitions are in src/lib/achievement-definitions.ts
// This file handles the backend checking and awarding
// Uses tier-based IDs from achievementThresholds.ts for DB stability

// Achievements that are EXEMPT from the test qualification requirements
// (90%+ accuracy AND 30s duration OR 50 words)
// These are "conflicting" achievements where restrictions would be unfair:
// - Quirky: exact WPM targets where users may need to end early
// - Special: time-of-day based or first-time achievements
// - Explorer: just about trying features/modes
// - Time-based: specific times/dates
const EXEMPT_ACHIEVEMENTS = new Set([
  // Quirky achievements (exact WPM targets)
  "quirky-67",
  "quirky-lucky-7",
  "quirky-100-exact",
  "quirky-palindrome",
  "quirky-42",
  "quirky-123",
  "quirky-pi",
  
  // Special moments (first-time / time-of-day based)
  "special-first-test",
  "special-night-owl",
  "special-early-bird",
  "special-weekend-warrior",
  
  // Explorer (just about trying features)
  "explorer-time-mode",
  "explorer-words-mode",
  "explorer-quote-mode",
  "explorer-preset-mode",
  "explorer-punctuation",
  "explorer-numbers",
  "explorer-all-difficulties",
  
  // Time-based (specific times/dates)
  "timebased-lunch",
  "timebased-midnight",
  "timebased-new-year",
  "timebased-friday",
  "timebased-monday",
  "timebased-holiday",
  "timebased-all-weekdays",
  "timebased-all-weekend",
  
  // Endurance duration/word achievements (inherently require long tests, not gaming)
  "special-marathon",       // 120+ seconds
  "endurance-180s-test",    // 180+ seconds
  "endurance-300s-test",    // 300+ seconds (5 min)
  "endurance-500-words-test", // 500+ words
]);

interface TestResultData {
  wpm: number;
  accuracy: number;
  mode: string;
  duration: number;
  wordCount: number;
  difficulty: string;
  punctuation: boolean;
  numbers: boolean;
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
}

/**
 * Check which achievements should be awarded based on test result and aggregate stats
 */
function checkAchievements(ctx: AchievementCheckContext): string[] {
  const newAchievements: string[] = [];
  const { testResult } = ctx;

  // Check if this test qualifies for non-exempt achievements
  // Requirements: 90%+ accuracy AND (30s+ duration OR 50+ words)
  const testQualifies = qualifiesForAchievement(
    testResult.duration,
    testResult.wordsCorrect,
    testResult.accuracy
  );

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

  // === COLLECTION ACHIEVEMENTS ===
  
  // These check the count AFTER potential new achievements are added
  // We add the count of new achievements from this run
  const projectedTotal = ctx.totalAchievementsCount + newAchievements.length;
  
  // Collection achievements - tier-based IDs
  newAchievements.push(...getQualifyingAchievementIds("collection", projectedTotal));
  
  // Category master is complex - skip for now as it requires checking complete categories

  // If the test doesn't qualify (low accuracy or too short/few words),
  // only award exempt achievements (quirky, special, explorer, time-based)
  if (!testQualifies) {
    return newAchievements.filter(id => EXEMPT_ACHIEVEMENTS.has(id));
  }

  return newAchievements;
}

/**
 * Internal mutation to check and award achievements after a test
 * Called from testResults.saveResult
 */
export const checkAndAwardAchievements = internalMutation({
  args: {
    userId: v.id("users"),
    testResult: v.object({
      wpm: v.number(),
      accuracy: v.number(),
      mode: v.string(),
      duration: v.number(),
      wordCount: v.number(),
      difficulty: v.string(),
      punctuation: v.boolean(),
      numbers: v.boolean(),
      wordsCorrect: v.number(),
      wordsIncorrect: v.number(),
      createdAt: v.number(),
    }),
    localHour: v.number(),
    isWeekend: v.boolean(),
    // New time-based fields
    dayOfWeek: v.number(), // 0-6 (Sunday-Saturday)
    month: v.number(), // 0-11
    day: v.number(), // 1-31
  },
  handler: async (
    ctx,
    args
  ): Promise<{ newAchievements: string[]; totalAchievements: number }> => {
    // Get all test results for this user to compute aggregate stats
    const allResults = await ctx.db
      .query("testResults")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get user's streak
    const streak = await ctx.db
      .query("userStreaks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    // Get existing achievements
    const existingAchievementRecord = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const existingAchievements = existingAchievementRecord?.achievements ?? {};

    // Compute aggregate stats
    const totalTests = allResults.length;
    const totalWordsCorrect = allResults.reduce(
      (sum, r) => sum + (r.wordsCorrect ?? 0),
      0
    );
    const totalTimeTyped = allResults.reduce((sum, r) => sum + r.duration, 0);

    // Count tests with 95%+ accuracy
    const testsWithHighAccuracy = allResults.filter(
      (r) => r.accuracy >= 95
    ).length;

    // Count weekend tests (we'll approximate - the current test is marked)
    // For simplicity, just count if current test is weekend
    const weekendTestCount = args.isWeekend
      ? allResults.filter((_, i) => i === allResults.length - 1).length + 
        (existingAchievements["special-weekend-warrior"] ? 10 : 0)
      : 0;
    // Note: This is a simplified approach. A more accurate implementation
    // would track weekend tests separately in the DB.

    // Compute perfect accuracy streak (consecutive 100% tests from most recent)
    let perfectAccuracyStreak = 0;
    const sortedResults = [...allResults].sort(
      (a, b) => b.createdAt - a.createdAt
    );
    for (const result of sortedResults) {
      if (result.accuracy === 100) {
        perfectAccuracyStreak++;
      } else {
        break;
      }
    }

    // Track modes and difficulties covered
    const modesCovered = new Set(allResults.map((r) => r.mode));
    const difficultiesCovered = new Set(allResults.map((r) => r.difficulty));

    // === COMPUTE NEW CONTEXT FIELDS ===

    // Consecutive 90%+ accuracy streak
    let consecutiveHighAccuracyStreak = 0;
    for (const result of sortedResults) {
      if (result.accuracy >= 90) {
        consecutiveHighAccuracyStreak++;
      } else {
        break;
      }
    }

    // WPM variance across last 10 tests
    const last10Results = sortedResults.slice(0, 10);
    let recentWpmVariance = 0;
    let lowVarianceTestCount = 0;
    if (last10Results.length >= 5) {
      const wpms = last10Results.map((r) => r.wpm);
      const mean = wpms.reduce((a, b) => a + b, 0) / wpms.length;
      const variance = wpms.reduce((sum, wpm) => sum + Math.pow(wpm - mean, 2), 0) / wpms.length;
      recentWpmVariance = Math.sqrt(variance); // standard deviation
      if (recentWpmVariance < 5) {
        lowVarianceTestCount = last10Results.length;
      }
    }

    // Count tests with same WPM (rounded)
    const wpmCounts = new Map<number, number>();
    for (const result of allResults) {
      const roundedWpm = Math.round(result.wpm);
      wpmCounts.set(roundedWpm, (wpmCounts.get(roundedWpm) || 0) + 1);
    }
    const sameWpmCount = Math.max(...Array.from(wpmCounts.values()), 0);

    // Personal best tracking
    const allWpms = allResults.map((r) => r.wpm);
    const previousResults = allResults.slice(0, -1); // All except current
    const previousWpms = previousResults.map((r) => r.wpm);
    const personalBestWpm = allWpms.length > 0 ? Math.max(...allWpms) : 0;
    const previousPersonalBest = previousWpms.length > 0 ? Math.max(...previousWpms) : 0;
    const isNewPersonalBest = args.testResult.wpm > previousPersonalBest && previousResults.length > 0;
    const pbImprovement = isNewPersonalBest ? args.testResult.wpm - previousPersonalBest : 0;

    // First test WPM (oldest test)
    const oldestFirst = [...allResults].sort((a, b) => a.createdAt - b.createdAt);
    const firstTestWpm = oldestFirst.length > 0 ? oldestFirst[0].wpm : args.testResult.wpm;

    // Count PB improvements (how many times user beat their previous PB)
    let pbImprovementCount = 0;
    let runningMax = 0;
    for (const result of oldestFirst) {
      if (result.wpm > runningMax) {
        if (runningMax > 0) pbImprovementCount++; // Don't count the first test
        runningMax = result.wpm;
      }
    }

    // Average WPM
    const averageWpm = allWpms.length > 0 
      ? allWpms.reduce((a, b) => a + b, 0) / allWpms.length 
      : 0;

    // First 5 tests average
    const first5 = oldestFirst.slice(0, 5);
    const firstFiveAvgWpm = first5.length > 0 
      ? first5.reduce((sum, r) => sum + r.wpm, 0) / first5.length 
      : 0;

    // Tests today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();
    const testsToday = allResults.filter((r) => r.createdAt >= todayStartMs).length;

    // Best WPM by mode
    const wpmByMode = new Map<string, number>();
    for (const result of allResults) {
      const current = wpmByMode.get(result.mode) || 0;
      if (result.wpm > current) {
        wpmByMode.set(result.mode, result.wpm);
      }
    }

    // Average accuracy
    const accuracies = allResults.map((r) => r.accuracy);
    const averageAccuracy = accuracies.length > 0 
      ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length 
      : 0;

    // Check if user has 100+ WPM on every day of their current streak
    // This is simplified - we just check if current streak exists and current test is 100+
    const has100WpmAllDaysInStreak = (streak?.currentStreak ?? 0) >= 7 && args.testResult.wpm >= 100;

    // Weekdays and weekend days covered
    const weekdaysCovered = new Set<number>();
    const weekendDaysCovered = new Set<number>();
    // We track this based on the current test's day
    const currentDayOfWeek = args.dayOfWeek;
    if (currentDayOfWeek >= 1 && currentDayOfWeek <= 5) {
      weekdaysCovered.add(currentDayOfWeek);
    } else {
      weekendDaysCovered.add(currentDayOfWeek);
    }
    // Check existing achievements to see which days are already covered
    if (existingAchievements["timebased-monday"]) weekdaysCovered.add(1);
    if (existingAchievements["timebased-friday"]) weekdaysCovered.add(5);
    // We'll track Tuesday-Thursday implicitly if weekday warrior is earned
    if (existingAchievements["timebased-all-weekdays"]) {
      weekdaysCovered.add(1).add(2).add(3).add(4).add(5);
    }
    if (existingAchievements["timebased-all-weekend"]) {
      weekendDaysCovered.add(0).add(6);
    }

    // Total achievements count
    const totalAchievementsCount = Object.keys(existingAchievements).length;

    // Check achievements
    const checkContext: AchievementCheckContext = {
      testResult: args.testResult,
      localHour: args.localHour,
      isWeekend: args.isWeekend,
      totalTests,
      totalWordsCorrect,
      totalTimeTyped,
      testsWithHighAccuracy,
      perfectAccuracyStreak,
      weekendTestCount,
      modesCovered,
      difficultiesCovered,
      currentStreak: streak?.currentStreak ?? 0,
      // New fields
      dayOfWeek: args.dayOfWeek,
      monthDay: { month: args.month, day: args.day },
      consecutiveHighAccuracyStreak,
      recentWpmVariance,
      lowVarianceTestCount,
      sameWpmCount,
      personalBestWpm,
      previousPersonalBest,
      firstTestWpm,
      pbImprovementCount,
      averageWpm,
      firstFiveAvgWpm,
      isNewPersonalBest,
      pbImprovement,
      testsToday,
      wpmByMode,
      averageAccuracy,
      has100WpmAllDaysInStreak,
      weekdaysCovered,
      weekendDaysCovered,
      totalAchievementsCount,
    };

    const potentialAchievements = checkAchievements(checkContext);

    // Filter to only new achievements (not already earned)
    const now = Date.now();
    const newAchievements = potentialAchievements.filter(
      (id) => !existingAchievements[id]
    );

    if (newAchievements.length > 0) {
      // Create updated achievements record
      const updatedAchievements = { ...existingAchievements };
      for (const id of newAchievements) {
        updatedAchievements[id] = now;
      }

      if (existingAchievementRecord) {
        // Update existing record
        await ctx.db.patch(existingAchievementRecord._id, {
          achievements: updatedAchievements,
          updatedAt: now,
        });
      } else {
        // Create new record
        await ctx.db.insert("userAchievements", {
          userId: args.userId,
          achievements: updatedAchievements,
          updatedAt: now,
        });
      }
    }

    const totalAchievements = Object.keys(existingAchievements).length + newAchievements.length;

    return {
      newAchievements,
      totalAchievements,
    };
  },
});

/**
 * Query to get a user's achievements
 * Returns a record of achievementId -> earnedAt timestamp
 */
export const getUserAchievements = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args): Promise<Record<string, number>> => {
    // Find the user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return {};
    }

    // Get the user's achievements record
    const achievementRecord = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return achievementRecord?.achievements ?? {};
  },
});

/**
 * Recheck achievements after a test result is deleted
 * Removes achievements the user no longer qualifies for
 */
export const recheckAchievementsAfterDeletion = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ removedAchievements: string[] }> => {
    // Get all remaining test results for this user
    const allResults = await ctx.db
      .query("testResults")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get user's streak
    const streak = await ctx.db
      .query("userStreaks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    // Get existing achievements
    const existingAchievementRecord = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!existingAchievementRecord) {
      return { removedAchievements: [] };
    }

    const existingAchievements = existingAchievementRecord.achievements ?? {};

    // Filter to only qualifying tests for non-exempt achievements
    // Qualifying: 90%+ accuracy AND (30s+ duration OR 50+ words)
    const qualifyingResults = allResults.filter(r => 
      qualifiesForAchievement(r.duration, r.wordsCorrect ?? 0, r.accuracy)
    );

    // Compute current stats from QUALIFYING results only (for non-exempt achievements)
    const totalQualifyingTests = qualifyingResults.length;
    const totalWordsCorrect = qualifyingResults.reduce(
      (sum, r) => sum + (r.wordsCorrect ?? 0),
      0
    );
    const totalTimeTyped = qualifyingResults.reduce((sum, r) => sum + r.duration, 0);
    const totalMinutesTyped = totalTimeTyped / (60 * 1000);

    // Count qualifying tests with 95%+ accuracy
    const testsWithHighAccuracy = qualifyingResults.filter(
      (r) => r.accuracy >= 95
    ).length;

    // Best WPM from qualifying tests only
    const bestWpm = qualifyingResults.length > 0 ? Math.max(...qualifyingResults.map(r => r.wpm)) : 0;

    // Perfect accuracy streak (consecutive 100% from most recent qualifying tests)
    const sortedQualifyingResults = [...qualifyingResults].sort((a, b) => b.createdAt - a.createdAt);
    let perfectAccuracyStreak = 0;
    for (const result of sortedQualifyingResults) {
      if (result.accuracy === 100) {
        perfectAccuracyStreak++;
      } else {
        break;
      }
    }

    // Consecutive 90%+ accuracy streak (from qualifying tests)
    let consecutiveHighAccuracyStreak = 0;
    for (const result of sortedQualifyingResults) {
      if (result.accuracy >= 90) {
        consecutiveHighAccuracyStreak++;
      } else {
        break;
      }
    }

    // WPM variance for consistency (from qualifying tests)
    const last10QualifyingResults = sortedQualifyingResults.slice(0, 10);
    let lowVarianceTestCount = 0;
    if (last10QualifyingResults.length >= 5) {
      const wpms = last10QualifyingResults.map((r) => r.wpm);
      const mean = wpms.reduce((a, b) => a + b, 0) / wpms.length;
      const variance = wpms.reduce((sum, wpm) => sum + Math.pow(wpm - mean, 2), 0) / wpms.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 5) {
        lowVarianceTestCount = last10QualifyingResults.length;
      }
    }

    // PB improvement count (from qualifying tests only)
    const oldestFirstQualifying = [...qualifyingResults].sort((a, b) => a.createdAt - b.createdAt);
    let pbImprovementCount = 0;
    let runningMax = 0;
    for (const result of oldestFirstQualifying) {
      if (result.wpm > runningMax) {
        if (runningMax > 0) pbImprovementCount++;
        runningMax = result.wpm;
      }
    }

    // Qualifying tests today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const testsToday = qualifyingResults.filter((r) => r.createdAt >= todayStart.getTime()).length;

    // Now determine which achievements the user should still have
    const stillQualifies: Set<string> = new Set();

    // Helper to add multiple IDs to set
    const addAll = (ids: string[]) => ids.forEach(id => stillQualifies.add(id));

    // Progressive achievements - use thresholds (based on QUALIFYING tests)
    addAll(getQualifyingAchievementIds("speed", bestWpm));
    addAll(getQualifyingAchievementIds("words", totalWordsCorrect));
    addAll(getQualifyingAchievementIds("time", totalMinutesTyped));
    addAll(getQualifyingAchievementIds("streak", streak?.currentStreak ?? 0));
    addAll(getQualifyingAchievementIds("tests", totalQualifyingTests));
    addAll(getQualifyingAchievementIds("accuracy-95", testsWithHighAccuracy));
    addAll(getQualifyingAchievementIds("accuracy-streak", perfectAccuracyStreak));
    addAll(getQualifyingAchievementIds("consistency-90plus", consecutiveHighAccuracyStreak));
    addAll(getQualifyingAchievementIds("consistency-variance", lowVarianceTestCount));
    addAll(getQualifyingAchievementIds("improvement-pb", pbImprovementCount));
    addAll(getQualifyingAchievementIds("endurance-daily", testsToday));

    // Non-progressive achievements that depend on test data (qualifying tests only)
    // Perfect accuracy on any qualifying test
    if (qualifyingResults.some(r => r.accuracy === 100)) {
      stillQualifies.add("accuracy-perfect-1");
    }

    // Same WPM 3 times (from qualifying tests)
    const wpmCounts = new Map<number, number>();
    for (const result of qualifyingResults) {
      const roundedWpm = Math.round(result.wpm);
      wpmCounts.set(roundedWpm, (wpmCounts.get(roundedWpm) || 0) + 1);
    }
    if (Math.max(...Array.from(wpmCounts.values()), 0) >= 3) {
      stillQualifies.add("consistency-same-wpm-3");
    }

    // First test (EXEMPT - keep if they have any tests at all)
    if (allResults.length >= 1) {
      stillQualifies.add("special-first-test");
    }

    // Endurance test durations
    if (allResults.some(r => r.duration >= 120000)) {
      stillQualifies.add("special-marathon");
    }
    if (allResults.some(r => r.duration >= 180000)) {
      stillQualifies.add("endurance-180s-test");
    }
    if (allResults.some(r => r.duration >= 300000)) {
      stillQualifies.add("endurance-300s-test");
    }
    if (allResults.some(r => r.wordCount >= 500)) {
      stillQualifies.add("endurance-500-words-test");
    }

    // Explorer achievements (modes/features tried)
    const modesCovered = new Set(allResults.map(r => r.mode));
    if (modesCovered.has("time")) stillQualifies.add("explorer-time-mode");
    if (modesCovered.has("words")) stillQualifies.add("explorer-words-mode");
    if (modesCovered.has("quote")) stillQualifies.add("explorer-quote-mode");
    if (modesCovered.has("preset")) stillQualifies.add("explorer-preset-mode");
    if (allResults.some(r => r.punctuation)) stillQualifies.add("explorer-punctuation");
    if (allResults.some(r => r.numbers)) stillQualifies.add("explorer-numbers");

    const difficultiesCovered = new Set(allResults.map(r => r.difficulty));
    if (difficultiesCovered.has("easy") && difficultiesCovered.has("medium") && difficultiesCovered.has("hard")) {
      stillQualifies.add("explorer-all-difficulties");
    }

    // Challenge mode achievements (from qualifying tests only)
    const hardQualifyingTests = qualifyingResults.filter(r => r.difficulty === "hard");
    if (hardQualifyingTests.some(r => r.punctuation)) stillQualifies.add("challenge-hard-punctuation");
    if (hardQualifyingTests.some(r => r.numbers)) stillQualifies.add("challenge-hard-numbers");
    if (hardQualifyingTests.some(r => r.punctuation && r.numbers)) stillQualifies.add("challenge-hard-both");
    if (hardQualifyingTests.some(r => r.wpm >= 80)) stillQualifies.add("challenge-hard-80wpm");
    if (hardQualifyingTests.some(r => r.punctuation && r.numbers && r.wpm >= 80)) stillQualifies.add("challenge-hard-both-80wpm");
    if (hardQualifyingTests.some(r => r.accuracy === 100)) stillQualifies.add("challenge-hard-100-accuracy");

    // Speed and precision (from qualifying tests)
    if (qualifyingResults.some(r => r.wpm >= 100 && r.accuracy >= 95)) {
      stillQualifies.add("special-speed-accuracy");
    }

    // Milestone achievements (from qualifying tests only)
    if (qualifyingResults.some(r => r.wpm >= 100 && r.accuracy === 100)) {
      stillQualifies.add("milestone-100wpm-100acc");
    }
    if (qualifyingResults.some(r => r.wpm >= 80 && r.accuracy >= 98)) {
      stillQualifies.add("milestone-80wpm-98acc");
    }
    if (hardQualifyingTests.some(r => r.wpm >= 50 && r.accuracy === 100)) {
      stillQualifies.add("milestone-50wpm-100acc-hard");
    }
    if (qualifyingResults.some(r => r.wpm >= 100 && r.wordCount >= 100 && r.duration >= 100000)) {
      stillQualifies.add("milestone-triple-digits");
    }
    if (qualifyingResults.some(r => r.wpm >= 80 && r.duration >= 120000)) {
      stillQualifies.add("milestone-speed-endurance");
    }

    // Average accuracy check (from qualifying tests)
    const avgAccuracy = qualifyingResults.length > 0 
      ? qualifyingResults.reduce((sum, r) => sum + r.accuracy, 0) / qualifyingResults.length 
      : 0;
    if (totalWordsCorrect >= 1000 && avgAccuracy >= 95) {
      stillQualifies.add("milestone-1000-words-95acc");
    }

    // Mode master (80+ WPM in multiple modes from qualifying tests)
    const wpmByMode = new Map<string, number>();
    for (const result of qualifyingResults) {
      const current = wpmByMode.get(result.mode) || 0;
      if (result.wpm > current) {
        wpmByMode.set(result.mode, result.wpm);
      }
    }
    if ((wpmByMode.get("time") || 0) >= 80 && 
        (wpmByMode.get("words") || 0) >= 80 && 
        (wpmByMode.get("quote") || 0) >= 80) {
      stillQualifies.add("milestone-all-modes-80wpm");
    }

    // Improvement achievements (standalone, from qualifying tests)
    const firstQualifyingTestWpm = oldestFirstQualifying.length > 0 ? oldestFirstQualifying[0].wpm : 0;
    if (firstQualifyingTestWpm > 0 && bestWpm >= firstQualifyingTestWpm * 2) {
      stillQualifies.add("improvement-double-wpm");
    }

    const first5Qualifying = oldestFirstQualifying.slice(0, 5);
    const firstFiveAvgWpm = first5Qualifying.length > 0 
      ? first5Qualifying.reduce((sum, r) => sum + r.wpm, 0) / first5Qualifying.length 
      : 0;
    const currentAvgWpm = qualifyingResults.length > 0 
      ? qualifyingResults.reduce((sum, r) => sum + r.wpm, 0) / qualifyingResults.length 
      : 0;
    if (firstFiveAvgWpm > 0 && currentAvgWpm >= firstFiveAvgWpm + 20) {
      stillQualifies.add("improvement-avg-increase");
    }

    // Time-based achievements should be kept (they were earned at a specific time)
    // These are permanent once earned: night-owl, early-bird, lunch, midnight, holidays, etc.
    const permanentAchievements = [
      "special-night-owl", "special-early-bird", "special-weekend-warrior",
      "timebased-lunch", "timebased-midnight", "timebased-new-year",
      "timebased-friday", "timebased-monday", "timebased-holiday",
      "timebased-all-weekdays", "timebased-all-weekend",
      "quirky-67", "quirky-lucky-7", "quirky-100-exact", "quirky-palindrome",
      "quirky-42", "quirky-123", "quirky-pi",
      "improvement-pb-by-10", "improvement-pb-by-20",
      "milestone-week-streak-100wpm",
    ];
    for (const id of permanentAchievements) {
      if (existingAchievements[id]) {
        stillQualifies.add(id);
      }
    }

    // Collection achievements - recalculate based on what they still have
    const projectedCount = stillQualifies.size;
    const collectionIds = getQualifyingAchievementIds("collection", projectedCount);
    for (const id of collectionIds) {
      stillQualifies.add(id);
    }

    // Find achievements to remove
    const removedAchievements: string[] = [];
    const updatedAchievements: Record<string, number> = {};

    for (const [id, timestamp] of Object.entries(existingAchievements)) {
      if (stillQualifies.has(id)) {
        updatedAchievements[id] = timestamp;
      } else {
        removedAchievements.push(id);
      }
    }

    // Update the database if there are changes
    if (removedAchievements.length > 0) {
      await ctx.db.patch(existingAchievementRecord._id, {
        achievements: updatedAchievements,
        updatedAt: Date.now(),
      });
    }

    return { removedAchievements };
  },
});

/**
 * Public mutation to recheck all achievements for a user
 * Can be called from the frontend to force a full recheck
 * Adds any missing achievements and removes ones the user no longer qualifies for
 */
export const recheckAllAchievements = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args): Promise<{ addedAchievements: string[]; removedAchievements: string[] }> => {
    // Find the user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return { addedAchievements: [], removedAchievements: [] };
    }

    // Get all test results for this user
    const allResults = await ctx.db
      .query("testResults")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get user's streak
    const streak = await ctx.db
      .query("userStreaks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    // Get existing achievements
    const existingAchievementRecord = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const existingAchievements = existingAchievementRecord?.achievements ?? {};

    // Filter to only qualifying tests for non-exempt achievements
    // Qualifying: 90%+ accuracy AND (30s+ duration OR 50+ words)
    const qualifyingResults = allResults.filter(r => 
      qualifiesForAchievement(r.duration, r.wordsCorrect ?? 0, r.accuracy)
    );

    // Compute current stats from QUALIFYING results only (for non-exempt achievements)
    const totalQualifyingTests = qualifyingResults.length;
    const totalWordsCorrect = qualifyingResults.reduce(
      (sum, r) => sum + (r.wordsCorrect ?? 0),
      0
    );
    const totalTimeTyped = qualifyingResults.reduce((sum, r) => sum + r.duration, 0);
    const totalMinutesTyped = totalTimeTyped / (60 * 1000);

    // Count qualifying tests with 95%+ accuracy
    const testsWithHighAccuracy = qualifyingResults.filter(
      (r) => r.accuracy >= 95
    ).length;

    // Best WPM from qualifying tests only
    const bestWpm = qualifyingResults.length > 0 ? Math.max(...qualifyingResults.map(r => r.wpm)) : 0;

    // Perfect accuracy streak (consecutive 100% from most recent qualifying tests)
    const sortedQualifyingResults = [...qualifyingResults].sort((a, b) => b.createdAt - a.createdAt);
    let perfectAccuracyStreak = 0;
    for (const result of sortedQualifyingResults) {
      if (result.accuracy === 100) {
        perfectAccuracyStreak++;
      } else {
        break;
      }
    }

    // Consecutive 90%+ accuracy streak (from qualifying tests)
    let consecutiveHighAccuracyStreak = 0;
    for (const result of sortedQualifyingResults) {
      if (result.accuracy >= 90) {
        consecutiveHighAccuracyStreak++;
      } else {
        break;
      }
    }

    // WPM variance for consistency (from qualifying tests)
    const last10QualifyingResults = sortedQualifyingResults.slice(0, 10);
    let lowVarianceTestCount = 0;
    if (last10QualifyingResults.length >= 5) {
      const wpms = last10QualifyingResults.map((r) => r.wpm);
      const mean = wpms.reduce((a, b) => a + b, 0) / wpms.length;
      const variance = wpms.reduce((sum, wpm) => sum + Math.pow(wpm - mean, 2), 0) / wpms.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 5) {
        lowVarianceTestCount = last10QualifyingResults.length;
      }
    }

    // PB improvement count (from qualifying tests only)
    const oldestFirstQualifying = [...qualifyingResults].sort((a, b) => a.createdAt - b.createdAt);
    let pbImprovementCount = 0;
    let runningMax = 0;
    for (const result of oldestFirstQualifying) {
      if (result.wpm > runningMax) {
        if (runningMax > 0) pbImprovementCount++;
        runningMax = result.wpm;
      }
    }

    // Qualifying tests today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const testsToday = qualifyingResults.filter((r) => r.createdAt >= todayStart.getTime()).length;

    // Now determine which achievements the user should have
    const shouldHave: Set<string> = new Set();

    // Helper to add multiple IDs to set
    const addAll = (ids: string[]) => ids.forEach(id => shouldHave.add(id));

    // Progressive achievements - use thresholds (based on QUALIFYING tests)
    addAll(getQualifyingAchievementIds("speed", bestWpm));
    addAll(getQualifyingAchievementIds("words", totalWordsCorrect));
    addAll(getQualifyingAchievementIds("time", totalMinutesTyped));
    addAll(getQualifyingAchievementIds("streak", streak?.currentStreak ?? 0));
    addAll(getQualifyingAchievementIds("tests", totalQualifyingTests));
    addAll(getQualifyingAchievementIds("accuracy-95", testsWithHighAccuracy));
    addAll(getQualifyingAchievementIds("accuracy-streak", perfectAccuracyStreak));
    addAll(getQualifyingAchievementIds("consistency-90plus", consecutiveHighAccuracyStreak));
    addAll(getQualifyingAchievementIds("consistency-variance", lowVarianceTestCount));
    addAll(getQualifyingAchievementIds("improvement-pb", pbImprovementCount));
    addAll(getQualifyingAchievementIds("endurance-daily", testsToday));

    // Non-progressive achievements that depend on test data (qualifying tests only)
    // Perfect accuracy on any qualifying test
    if (qualifyingResults.some(r => r.accuracy === 100)) {
      shouldHave.add("accuracy-perfect-1");
    }

    // Same WPM 3 times (from qualifying tests)
    const wpmCounts = new Map<number, number>();
    for (const result of qualifyingResults) {
      const roundedWpm = Math.round(result.wpm);
      wpmCounts.set(roundedWpm, (wpmCounts.get(roundedWpm) || 0) + 1);
    }
    if (Math.max(...Array.from(wpmCounts.values()), 0) >= 3) {
      shouldHave.add("consistency-same-wpm-3");
    }

    // First test (EXEMPT - keep if they have any tests at all)
    if (allResults.length >= 1) {
      shouldHave.add("special-first-test");
    }

    // Endurance test durations
    if (allResults.some(r => r.duration >= 120000)) {
      shouldHave.add("special-marathon");
    }
    if (allResults.some(r => r.duration >= 180000)) {
      shouldHave.add("endurance-180s-test");
    }
    if (allResults.some(r => r.duration >= 300000)) {
      shouldHave.add("endurance-300s-test");
    }
    if (allResults.some(r => r.wordCount >= 500)) {
      shouldHave.add("endurance-500-words-test");
    }

    // Explorer achievements (modes/features tried)
    const modesCovered = new Set(allResults.map(r => r.mode));
    if (modesCovered.has("time")) shouldHave.add("explorer-time-mode");
    if (modesCovered.has("words")) shouldHave.add("explorer-words-mode");
    if (modesCovered.has("quote")) shouldHave.add("explorer-quote-mode");
    if (modesCovered.has("preset")) shouldHave.add("explorer-preset-mode");
    if (allResults.some(r => r.punctuation)) shouldHave.add("explorer-punctuation");
    if (allResults.some(r => r.numbers)) shouldHave.add("explorer-numbers");

    const difficultiesCovered = new Set(allResults.map(r => r.difficulty));
    if (difficultiesCovered.has("easy") && difficultiesCovered.has("medium") && difficultiesCovered.has("hard")) {
      shouldHave.add("explorer-all-difficulties");
    }

    // Challenge mode achievements (from qualifying tests only)
    const hardQualifyingTests = qualifyingResults.filter(r => r.difficulty === "hard");
    if (hardQualifyingTests.some(r => r.punctuation)) shouldHave.add("challenge-hard-punctuation");
    if (hardQualifyingTests.some(r => r.numbers)) shouldHave.add("challenge-hard-numbers");
    if (hardQualifyingTests.some(r => r.punctuation && r.numbers)) shouldHave.add("challenge-hard-both");
    if (hardQualifyingTests.some(r => r.wpm >= 80)) shouldHave.add("challenge-hard-80wpm");
    if (hardQualifyingTests.some(r => r.punctuation && r.numbers && r.wpm >= 80)) shouldHave.add("challenge-hard-both-80wpm");
    if (hardQualifyingTests.some(r => r.accuracy === 100)) shouldHave.add("challenge-hard-100-accuracy");

    // Speed and precision (from qualifying tests)
    if (qualifyingResults.some(r => r.wpm >= 100 && r.accuracy >= 95)) {
      shouldHave.add("special-speed-accuracy");
    }

    // Milestone achievements (from qualifying tests only)
    if (qualifyingResults.some(r => r.wpm >= 100 && r.accuracy === 100)) {
      shouldHave.add("milestone-100wpm-100acc");
    }
    if (qualifyingResults.some(r => r.wpm >= 80 && r.accuracy >= 98)) {
      shouldHave.add("milestone-80wpm-98acc");
    }
    if (hardQualifyingTests.some(r => r.wpm >= 50 && r.accuracy === 100)) {
      shouldHave.add("milestone-50wpm-100acc-hard");
    }
    if (qualifyingResults.some(r => r.wpm >= 100 && r.wordCount >= 100 && r.duration >= 100000)) {
      shouldHave.add("milestone-triple-digits");
    }
    if (qualifyingResults.some(r => r.wpm >= 80 && r.duration >= 120000)) {
      shouldHave.add("milestone-speed-endurance");
    }

    // Average accuracy check (from qualifying tests)
    const avgAccuracy = qualifyingResults.length > 0 
      ? qualifyingResults.reduce((sum, r) => sum + r.accuracy, 0) / qualifyingResults.length 
      : 0;
    if (totalWordsCorrect >= 1000 && avgAccuracy >= 95) {
      shouldHave.add("milestone-1000-words-95acc");
    }

    // Mode master (80+ WPM in multiple modes from qualifying tests)
    const wpmByMode = new Map<string, number>();
    for (const result of qualifyingResults) {
      const current = wpmByMode.get(result.mode) || 0;
      if (result.wpm > current) {
        wpmByMode.set(result.mode, result.wpm);
      }
    }
    if ((wpmByMode.get("time") || 0) >= 80 && 
        (wpmByMode.get("words") || 0) >= 80 && 
        (wpmByMode.get("quote") || 0) >= 80) {
      shouldHave.add("milestone-all-modes-80wpm");
    }

    // Improvement achievements (standalone, from qualifying tests)
    const firstQualifyingTestWpm = oldestFirstQualifying.length > 0 ? oldestFirstQualifying[0].wpm : 0;
    if (firstQualifyingTestWpm > 0 && bestWpm >= firstQualifyingTestWpm * 2) {
      shouldHave.add("improvement-double-wpm");
    }

    const first5Qualifying = oldestFirstQualifying.slice(0, 5);
    const firstFiveAvgWpm = first5Qualifying.length > 0 
      ? first5Qualifying.reduce((sum, r) => sum + r.wpm, 0) / first5Qualifying.length 
      : 0;
    const currentAvgWpm = qualifyingResults.length > 0 
      ? qualifyingResults.reduce((sum, r) => sum + r.wpm, 0) / qualifyingResults.length 
      : 0;
    if (firstFiveAvgWpm > 0 && currentAvgWpm >= firstFiveAvgWpm + 20) {
      shouldHave.add("improvement-avg-increase");
    }

    // Time-based achievements should be kept (they were earned at a specific time)
    // These are permanent once earned: night-owl, early-bird, lunch, midnight, holidays, etc.
    const permanentAchievements = [
      "special-night-owl", "special-early-bird", "special-weekend-warrior",
      "timebased-lunch", "timebased-midnight", "timebased-new-year",
      "timebased-friday", "timebased-monday", "timebased-holiday",
      "timebased-all-weekdays", "timebased-all-weekend",
      "quirky-67", "quirky-lucky-7", "quirky-100-exact", "quirky-palindrome",
      "quirky-42", "quirky-123", "quirky-pi",
      "improvement-pb-by-10", "improvement-pb-by-20",
      "milestone-week-streak-100wpm",
    ];
    for (const id of permanentAchievements) {
      if (existingAchievements[id]) {
        shouldHave.add(id);
      }
    }

    // Collection achievements - recalculate based on what they should have
    const projectedCount = shouldHave.size;
    const collectionIds = getQualifyingAchievementIds("collection", projectedCount);
    for (const id of collectionIds) {
      shouldHave.add(id);
    }

    // Determine what to add and what to remove
    const addedAchievements: string[] = [];
    const removedAchievements: string[] = [];
    const now = Date.now();

    // Build the final achievements record
    const finalAchievements: Record<string, number> = {};

    // Keep achievements that should still be there
    for (const [id, timestamp] of Object.entries(existingAchievements)) {
      if (shouldHave.has(id)) {
        finalAchievements[id] = timestamp;
      } else {
        removedAchievements.push(id);
      }
    }

    // Add new achievements
    for (const id of shouldHave) {
      if (!existingAchievements[id]) {
        finalAchievements[id] = now;
        addedAchievements.push(id);
      }
    }

    // Update the database if there are changes
    if (addedAchievements.length > 0 || removedAchievements.length > 0) {
      if (existingAchievementRecord) {
        await ctx.db.patch(existingAchievementRecord._id, {
          achievements: finalAchievements,
          updatedAt: now,
        });
      } else if (Object.keys(finalAchievements).length > 0) {
        await ctx.db.insert("userAchievements", {
          userId: user._id,
          achievements: finalAchievements,
          updatedAt: now,
        });
      }
    }

    return { addedAchievements, removedAchievements };
  },
});
