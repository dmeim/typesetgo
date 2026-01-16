import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

// Minimum requirements to count towards a streak
const MIN_DURATION_MS = 30000; // 30 seconds
const MIN_CORRECT_WORDS = 50;

/**
 * Check if a test qualifies for streak counting
 * Qualification: duration >= 30s OR wordsCorrect >= 50
 */
export function qualifiesForStreak(
  duration: number,
  wordsCorrect: number
): boolean {
  return duration >= MIN_DURATION_MS || wordsCorrect >= MIN_CORRECT_WORDS;
}

/**
 * Get the next day's date string (YYYY-MM-DD format)
 */
function getNextDay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().split("T")[0];
}

/**
 * Internal mutation to update a user's streak
 * Called from testResults.saveResult after a qualifying test
 */
export const updateStreak = internalMutation({
  args: {
    userId: v.id("users"),
    localDate: v.string(), // "YYYY-MM-DD" in user's local time
    duration: v.number(),
    wordsCorrect: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if test qualifies for streak
    if (!qualifiesForStreak(args.duration, args.wordsCorrect)) {
      return null;
    }

    // Get existing streak record
    const existingStreak = await ctx.db
      .query("userStreaks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (!existingStreak) {
      // First qualifying test - create streak record
      const streakId = await ctx.db.insert("userStreaks", {
        userId: args.userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: args.localDate,
        updatedAt: now,
      });
      return { streakId, currentStreak: 1, longestStreak: 1, isNew: true };
    }

    // Check if this is the same day, consecutive day, or gap
    const lastDate = existingStreak.lastActivityDate;
    const expectedNextDay = getNextDay(lastDate);

    if (args.localDate === lastDate) {
      // Same day - no change to streak, just update timestamp
      await ctx.db.patch(existingStreak._id, { updatedAt: now });
      return {
        streakId: existingStreak._id,
        currentStreak: existingStreak.currentStreak,
        longestStreak: existingStreak.longestStreak,
        isNew: false,
      };
    }

    if (args.localDate === expectedNextDay) {
      // Consecutive day - increment streak
      const newCurrentStreak = existingStreak.currentStreak + 1;
      const newLongestStreak = Math.max(
        existingStreak.longestStreak,
        newCurrentStreak
      );

      await ctx.db.patch(existingStreak._id, {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastActivityDate: args.localDate,
        updatedAt: now,
      });

      return {
        streakId: existingStreak._id,
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        isNew: false,
      };
    }

    // Gap of more than 1 day - reset streak to 1
    // But first check if the new date is actually after the last date
    const lastDateObj = new Date(lastDate + "T00:00:00Z");
    const newDateObj = new Date(args.localDate + "T00:00:00Z");

    if (newDateObj <= lastDateObj) {
      // Date is before or same as last activity (shouldn't happen normally)
      // Just update timestamp without changing streak
      await ctx.db.patch(existingStreak._id, { updatedAt: now });
      return {
        streakId: existingStreak._id,
        currentStreak: existingStreak.currentStreak,
        longestStreak: existingStreak.longestStreak,
        isNew: false,
      };
    }

    // Gap detected - reset streak
    await ctx.db.patch(existingStreak._id, {
      currentStreak: 1,
      lastActivityDate: args.localDate,
      updatedAt: now,
    });

    return {
      streakId: existingStreak._id,
      currentStreak: 1,
      longestStreak: existingStreak.longestStreak,
      isNew: false,
    };
  },
});

/**
 * Query to get a user's current streak information
 */
export const getUserStreak = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return null;
    }

    // Get the user's streak record
    const streak = await ctx.db
      .query("userStreaks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!streak) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
      };
    }

    // Check if streak is still valid (not broken by missed days)
    // This is computed at read time to show accurate current streak
    const today = new Date().toISOString().split("T")[0];
    const lastDate = streak.lastActivityDate;
    const expectedNextDay = getNextDay(lastDate);

    // If today is after the expected next day, streak is broken
    const todayDate = new Date(today + "T00:00:00Z");
    const expectedDate = new Date(expectedNextDay + "T00:00:00Z");

    let currentStreak = streak.currentStreak;
    if (todayDate > expectedDate) {
      // Streak is broken - show 0 but don't update DB
      // (it will be reset to 1 when they complete another test)
      currentStreak = 0;
    }

    return {
      currentStreak,
      longestStreak: streak.longestStreak,
      lastActivityDate: streak.lastActivityDate,
    };
  },
});
