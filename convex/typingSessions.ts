import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel";
import {
  MAX_WPM,
  MAX_BURST_CHARS,
  MIN_PROGRESS_EVENTS,
  getTimeModeTolerance,
  SESSION_RESUME_GRACE_MS,
} from "./lib/antiCheatConstants";
import {
  computeStats,
  computeWordResults,
  calculateAccuracy,
  calculateWpm,
} from "./lib/computeStats";

/**
 * Validate a session and determine if the test result should be marked valid
 */
interface ValidationResult {
  isValid: boolean;
  invalidReason: string | undefined;
}

function validateSession(
  session: Doc<"typingSessions">,
  serverElapsed: number,
  computedWpm: number,
  typedText: string
): ValidationResult {
  const reasons: string[] = [];
  const { mode, duration, wordTarget } = session.settings;

  // 1. Check minimum progress events (skip for time mode - duration check is sufficient)
  if (mode !== "time") {
    if (session.eventCount < MIN_PROGRESS_EVENTS) {
      reasons.push(`Too few progress events: ${session.eventCount} < ${MIN_PROGRESS_EVENTS}`);
    }
  }

  // 2. Check WPM ceiling
  if (computedWpm > MAX_WPM) {
    reasons.push(`WPM exceeds maximum: ${Math.round(computedWpm)} > ${MAX_WPM}`);
  }

  // 3. Check burst characters (paste detection)
  if (session.maxBurstChars > MAX_BURST_CHARS) {
    reasons.push(`Burst chars exceeded: ${session.maxBurstChars} > ${MAX_BURST_CHARS}`);
  }

  // 4. Mode-specific validation
  if (mode === "time" && duration) {
    const expectedMs = duration * 1000;
    // Use dynamic tolerance based on test duration
    // Short tests (15s, 30s) need more tolerance due to session setup latency being a larger %
    const toleranceMs = getTimeModeTolerance(duration) * 1000;
    if (serverElapsed < expectedMs - toleranceMs) {
      reasons.push(
        `Time mode completed too fast: ${serverElapsed}ms < ${expectedMs - toleranceMs}ms`
      );
    }
  }

  if (mode === "words" && wordTarget) {
    const wordCount = typedText.trim().split(/\s+/).length;
    if (wordCount < wordTarget) {
      reasons.push(`Word count insufficient: ${wordCount} < ${wordTarget}`);
    }
  }

  if (
    (mode === "quote" || mode === "preset") &&
    typedText.length < session.targetText.length
  ) {
    reasons.push(
      `Text incomplete: ${typedText.length} < ${session.targetText.length}`
    );
  }

  return {
    isValid: reasons.length === 0,
    invalidReason: reasons.length > 0 ? reasons.join("; ") : undefined,
  };
}

/**
 * Start a new typing session
 * Returns existing session if one exists and is within grace period (for page refresh)
 */
export const startSession = mutation({
  args: {
    clerkId: v.string(),
    settings: v.object({
      mode: v.string(),
      duration: v.optional(v.number()),
      wordTarget: v.optional(v.number()),
      difficulty: v.string(),
      punctuation: v.boolean(),
      numbers: v.boolean(),
      capitalization: v.optional(v.boolean()),
    }),
    targetText: v.string(),
  },
  handler: async (ctx, args): Promise<{ sessionId: Id<"typingSessions"> }> => {
    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found. Please sign in first.");
    }

    const now = Date.now();

    // Check for existing session (handle page refresh)
    const existingSession = await ctx.db
      .query("typingSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (existingSession) {
      // If session is recent (within grace period), return it for resume
      if (now - existingSession.createdAt < SESSION_RESUME_GRACE_MS) {
        return { sessionId: existingSession._id };
      }
      // Otherwise, delete the old session
      await ctx.db.delete(existingSession._id);
    }

    // Create new session
    // Set startedAt immediately to match frontend timer start
    // This ensures server-side duration validation aligns with frontend timing
    const sessionId = await ctx.db.insert("typingSessions", {
      userId: user._id,
      settings: args.settings,
      targetText: args.targetText,
      createdAt: now,
      startedAt: now, // Set immediately instead of waiting for first progress event
      lastEventAt: now,
      eventCount: 0,
      lastTypedLength: 0,
      maxCharsPerSecond: 0,
      maxBurstChars: 0,
    });

    return { sessionId };
  },
});

/**
 * Record progress during typing session
 * Called periodically to validate real-time typing
 */
export const recordProgress = mutation({
  args: {
    sessionId: v.id("typingSessions"),
    typedTextLength: v.number(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      // Session expired or doesn't exist - fail silently
      return { success: false };
    }

    const now = Date.now();

    // Validate monotonic progress: typedTextLength >= lastTypedLength
    if (args.typedTextLength < session.lastTypedLength) {
      // Text was deleted (backspace) - that's okay, just don't update burst metrics
      await ctx.db.patch(args.sessionId, {
        lastEventAt: now,
        eventCount: session.eventCount + 1,
        lastTypedLength: args.typedTextLength,
      });
      return { success: true };
    }

    // Calculate burst chars (characters typed since last event)
    const charsDelta = args.typedTextLength - session.lastTypedLength;
    const timeDeltaMs = now - session.lastEventAt;
    const timeDeltaSec = timeDeltaMs / 1000;

    // Calculate chars per second for this burst
    const burstCps = timeDeltaSec > 0 ? charsDelta / timeDeltaSec : 0;

    // Update session with metrics
    // Note: startedAt is now set at session creation time for accurate duration tracking
    await ctx.db.patch(args.sessionId, {
      lastEventAt: now,
      eventCount: session.eventCount + 1,
      lastTypedLength: args.typedTextLength,
      maxCharsPerSecond: Math.max(session.maxCharsPerSecond, burstCps),
      maxBurstChars: Math.max(session.maxBurstChars, charsDelta),
    });
    return { success: true };
  },
});

/**
 * Finalize a typing session and save the result
 * Computes server-side stats and runs anti-cheat validation
 */
export const finalizeSession = mutation({
  args: {
    sessionId: v.id("typingSessions"),
    typedText: v.string(),
    // For streak and achievement tracking
    localDate: v.string(),
    localHour: v.number(),
    isWeekend: v.boolean(),
    dayOfWeek: v.number(),
    month: v.number(),
    day: v.number(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    resultId: Id<"testResults">;
    wpm: number;
    accuracy: number;
    isValid: boolean;
    invalidReason: string | undefined;
    wordsCorrect: number;
    wordsIncorrect: number;
    charsMissed: number;
    charsExtra: number;
    newAchievements: string[];
  }> => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found or expired");
    }

    const now = Date.now();

    // Compute server elapsed time
    const serverElapsed = session.startedAt
      ? now - session.startedAt
      : now - session.createdAt;

    // Compute stats server-side
    const stats = computeStats(args.typedText, session.targetText);
    const wordResults = computeWordResults(args.typedText, session.targetText);
    const accuracy = calculateAccuracy(stats, args.typedText.length);
    const wpm = calculateWpm(args.typedText.length, serverElapsed);

    // Run anti-cheat validation
    const validation = validateSession(session, serverElapsed, wpm, args.typedText);

    // Get user for saving result
    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Save to testResults with isValid flag
    const resultId = await ctx.db.insert("testResults", {
      userId: session.userId,
      wpm: Math.round(wpm),
      accuracy: Math.round(accuracy * 10) / 10,
      mode: session.settings.mode,
      duration: serverElapsed,
      wordCount: Math.floor(args.typedText.length / 5),
      difficulty: session.settings.difficulty,
      punctuation: session.settings.punctuation,
      numbers: session.settings.numbers,
      capitalization: session.settings.capitalization,
      wordsCorrect: wordResults.correctWords.length,
      wordsIncorrect: wordResults.incorrectWords.length,
      charsMissed: stats.missed,
      charsExtra: stats.extra,
      isValid: validation.isValid,
      invalidReason: validation.invalidReason,
      createdAt: now,
    });

    // Only update streak and check achievements if valid
    let newAchievements: string[] = [];
    if (validation.isValid) {
      // Update streak
      await ctx.runMutation(internal.streaks.updateStreak, {
        userId: session.userId,
        localDate: args.localDate,
        duration: serverElapsed,
        wordsCorrect: wordResults.correctWords.length,
      });

      // Check and award achievements
      const achievementResult = await ctx.runMutation(
        internal.achievements.checkAndAwardAchievements,
        {
          userId: session.userId,
          testResult: {
            wpm: Math.round(wpm),
            accuracy: Math.round(accuracy * 10) / 10,
            mode: session.settings.mode,
            duration: serverElapsed,
            wordCount: Math.floor(args.typedText.length / 5),
            difficulty: session.settings.difficulty,
            punctuation: session.settings.punctuation,
            numbers: session.settings.numbers,
            capitalization: session.settings.capitalization,
            wordsCorrect: wordResults.correctWords.length,
            wordsIncorrect: wordResults.incorrectWords.length,
            createdAt: now,
          },
          localHour: args.localHour,
          isWeekend: args.isWeekend,
          dayOfWeek: args.dayOfWeek,
          month: args.month,
          day: args.day,
        }
      );
      newAchievements = achievementResult.newAchievements;
    }

    // Delete the session
    await ctx.db.delete(args.sessionId);

    return {
      resultId,
      wpm: Math.round(wpm),
      accuracy: Math.round(accuracy * 10) / 10,
      isValid: validation.isValid,
      invalidReason: validation.invalidReason,
      wordsCorrect: wordResults.correctWords.length,
      wordsIncorrect: wordResults.incorrectWords.length,
      charsMissed: stats.missed,
      charsExtra: stats.extra,
      newAchievements,
    };
  },
});

/**
 * Get current session for a user (if exists)
 * Used to check if there's an active session on page load
 */
export const getCurrentSession = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return null;
    }

    const session = await ctx.db
      .query("typingSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    return session;
  },
});

/**
 * Cancel/delete a session (user abandoned test)
 */
export const cancelSession = mutation({
  args: {
    sessionId: v.id("typingSessions"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const session = await ctx.db.get(args.sessionId);
    if (session) {
      await ctx.db.delete(args.sessionId);
    }
    return { success: true };
  },
});
