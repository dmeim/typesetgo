import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

// Achievement checking logic
// Note: Achievement definitions are in src/lib/achievement-definitions.ts
// This file handles the backend checking and awarding

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
}

/**
 * Check which achievements should be awarded based on test result and aggregate stats
 */
function checkAchievements(ctx: AchievementCheckContext): string[] {
  const newAchievements: string[] = [];
  const { testResult } = ctx;

  // === SPEED ACHIEVEMENTS (WPM milestones) ===
  const wpmMilestones = [
    10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170,
    180, 190, 200,
  ];
  for (const wpm of wpmMilestones) {
    if (testResult.wpm >= wpm) {
      newAchievements.push(`wpm-${wpm}`);
    }
  }

  // === WORD ACHIEVEMENTS (cumulative words) ===
  const wordMilestones = [
    100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
    ...Array.from({ length: 49 }, (_, i) => (i + 2) * 1000), // 2000-50000
    100000,
  ];
  for (const words of wordMilestones) {
    if (ctx.totalWordsCorrect >= words) {
      newAchievements.push(`words-${words}`);
    }
  }

  // === ACCURACY ACHIEVEMENTS ===
  // Perfect accuracy on this test
  if (testResult.accuracy === 100) {
    newAchievements.push("accuracy-perfect-1");
  }

  // Tests with 95%+ accuracy
  const accuracyMilestones = [
    { count: 5, id: "accuracy-95-5" },
    { count: 25, id: "accuracy-95-25" },
    { count: 100, id: "accuracy-95-100" },
  ];
  for (const { count, id } of accuracyMilestones) {
    if (ctx.testsWithHighAccuracy >= count) {
      newAchievements.push(id);
    }
  }

  // Perfect accuracy streak
  const accuracyStreakMilestones = [
    { count: 2, id: "accuracy-streak-2" },
    { count: 5, id: "accuracy-streak-5" },
    { count: 10, id: "accuracy-streak-10" },
    { count: 25, id: "accuracy-streak-25" },
  ];
  for (const { count, id } of accuracyStreakMilestones) {
    if (ctx.perfectAccuracyStreak >= count) {
      newAchievements.push(id);
    }
  }

  // === TIME ACHIEVEMENTS (cumulative time in ms) ===
  const timeMilestones = [
    { minutes: 10, id: "time-10m" },
    { minutes: 30, id: "time-30m" },
    { minutes: 60, id: "time-1h" },
    { minutes: 300, id: "time-5h" },
    { minutes: 600, id: "time-10h" },
    { minutes: 1440, id: "time-24h" },
    { minutes: 3000, id: "time-50h" },
    { minutes: 6000, id: "time-100h" },
  ];
  for (const { minutes, id } of timeMilestones) {
    if (ctx.totalTimeTyped >= minutes * 60 * 1000) {
      newAchievements.push(id);
    }
  }

  // === STREAK ACHIEVEMENTS ===
  const streakMilestones = [3, 7, 14, 30, 60, 100, 365];
  for (const days of streakMilestones) {
    if (ctx.currentStreak >= days) {
      newAchievements.push(`streak-${days}`);
    }
  }

  // === TEST COUNT ACHIEVEMENTS ===
  const testMilestones = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
  for (const count of testMilestones) {
    if (ctx.totalTests >= count) {
      newAchievements.push(`tests-${count}`);
    }
  }

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
