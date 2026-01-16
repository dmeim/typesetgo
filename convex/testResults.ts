import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Save a test result
export const saveResult = mutation({
  args: {
    clerkId: v.string(),
    wpm: v.number(),
    accuracy: v.number(),
    mode: v.string(),
    duration: v.number(),
    wordCount: v.number(),
    difficulty: v.string(),
    punctuation: v.boolean(),
    numbers: v.boolean(),
    // Additional stats
    wordsCorrect: v.number(),
    wordsIncorrect: v.number(),
    charsMissed: v.number(),
    charsExtra: v.number(),
  },
  handler: async (ctx, args) => {
    // Find the user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found. Please sign in first.");
    }

    // Insert the test result
    const resultId = await ctx.db.insert("testResults", {
      userId: user._id,
      wpm: args.wpm,
      accuracy: args.accuracy,
      mode: args.mode,
      duration: args.duration,
      wordCount: args.wordCount,
      difficulty: args.difficulty,
      punctuation: args.punctuation,
      numbers: args.numbers,
      wordsCorrect: args.wordsCorrect,
      wordsIncorrect: args.wordsIncorrect,
      charsMissed: args.charsMissed,
      charsExtra: args.charsExtra,
      createdAt: Date.now(),
    });

    return resultId;
  },
});

// Get user's test results (most recent first)
export const getUserResults = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Find the user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return [];
    }

    const limit = args.limit ?? 50;

    // Get results ordered by creation date (descending)
    const results = await ctx.db
      .query("testResults")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    return results;
  },
});

// Get aggregated stats for a user
export const getUserStats = query({
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

    // Get all results for this user
    const results = await ctx.db
      .query("testResults")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (results.length === 0) {
      return {
        totalTests: 0,
        averageWpm: 0,
        bestWpm: 0,
        averageAccuracy: 0,
        totalTimeTyped: 0,
        totalWordsTyped: 0,
        totalCharactersTyped: 0,
        allResults: [],
      };
    }

    // Calculate stats
    const totalTests = results.length;
    const totalWpm = results.reduce((sum, r) => sum + r.wpm, 0);
    const averageWpm = Math.round(totalWpm / totalTests);
    const bestWpm = Math.max(...results.map((r) => r.wpm));
    const totalAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0);
    const averageAccuracy = Math.round((totalAccuracy / totalTests) * 10) / 10;
    const totalTimeTyped = results.reduce((sum, r) => sum + r.duration, 0);
    const totalWordsTyped = results.reduce((sum, r) => sum + r.wordCount, 0);
    // Characters typed (5 characters per word, standard WPM calculation)
    const totalCharactersTyped = totalWordsTyped * 5;

    // Get all results sorted by date (most recent first)
    const allResults = results.sort((a, b) => b.createdAt - a.createdAt);

    return {
      totalTests,
      averageWpm,
      bestWpm,
      averageAccuracy,
      totalTimeTyped,
      totalWordsTyped,
      totalCharactersTyped,
      allResults,
    };
  },
});

// Get leaderboard data for top WPM scores
export const getLeaderboard = query({
  args: {
    timeRange: v.union(
      v.literal("all-time"),
      v.literal("week"),
      v.literal("today")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 25;

    // Calculate time cutoff based on range
    const now = Date.now();
    let timeCutoff = 0;

    if (args.timeRange === "today") {
      // Start of today (midnight UTC)
      const today = new Date(now);
      today.setUTCHours(0, 0, 0, 0);
      timeCutoff = today.getTime();
    } else if (args.timeRange === "week") {
      // 7 days ago
      timeCutoff = now - 7 * 24 * 60 * 60 * 1000;
    }
    // For "all-time", timeCutoff stays 0

    // Fetch all test results (we'll filter and group in memory)
    const allResults = await ctx.db.query("testResults").collect();

    // Filter by time range
    const filteredResults =
      args.timeRange === "all-time"
        ? allResults
        : allResults.filter((r) => r.createdAt >= timeCutoff);

    // Group by user and find best WPM for each user
    // Use a Map keyed by the string representation of userId
    const userBestMap = new Map<
      string,
      { wpm: number; createdAt: number; userId: typeof filteredResults[0]["userId"] }
    >();

    for (const result of filteredResults) {
      const userIdStr = result.userId as unknown as string;
      const existing = userBestMap.get(userIdStr);

      if (!existing || result.wpm > existing.wpm) {
        userBestMap.set(userIdStr, {
          wpm: result.wpm,
          createdAt: result.createdAt,
          userId: result.userId,
        });
      }
    }

    // Convert to array and sort by WPM descending
    const sortedBests = Array.from(userBestMap.values()).sort(
      (a, b) => b.wpm - a.wpm
    );

    // Take top N
    const topBests = sortedBests.slice(0, limit);

    // Fetch user details for each entry
    const leaderboard = await Promise.all(
      topBests.map(async (entry, index) => {
        // Get user by ID directly
        const user = await ctx.db.get(entry.userId);

        return {
          rank: index + 1,
          username: user?.username ?? "Unknown",
          avatarUrl: user?.avatarUrl ?? null,
          wpm: entry.wpm,
          createdAt: entry.createdAt,
        };
      })
    );

    return leaderboard;
  },
});
