import { activityCalendar, utcDate } from "./lib/activityCalendar";
/**
 * Solo typing session API (frontend teammate should match these names).
 *
 * api.typingSessions.startSession
 *   Current clients send flat mode/settings fields and optional targetText.
 *   Older open clients may still send the same fields inside `settings`;
 *   conflicting copies are rejected during that compatibility period.
 *   returns: { sessionId, targetText }
 *   Auth: ctx.auth (ConvexProviderWithClerk). clerkId is ignored. startedAt is
 *   set on first recordProgress.
 *   Time/words/zen: client targetText is ignored; server always generateSoloPrompt.
 *   Quote/preset require targetText.
 *
 * api.typingSessions.recordProgress
 *   args: sessionId, typedLength
 *
 * api.typingSessions.finalizeSession
 *   args: sessionId, typedText, clientElapsedMs, localDate, localHour,
 *         dayOfWeek, month, day
 *   returns: { resultId, isValid, invalidReason?, wpm, accuracy, duration, ... }
 *   Ranked WPM/duration from server elapsed + computeStats/calculateWpm.
 *   clientElapsedMs is accepted but not stored as ranked WPM.
 *
 * api.typingSessions.cancelSession
 *   args: sessionId
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { SESSION_RESUME_GRACE_MS } from "./lib/antiCheatConstants";
import { burstCharsPerSecond } from "./lib/burst";
import {
  computeStats,
  computeWordResults,
  calculateAccuracy,
  calculateWpm,
} from "./lib/computeStats";
import { validateTypingSession } from "./lib/validateSession";
import { requireAuthedUser, getAuthedUser } from "./lib/identity";
import { resolveSessionTargetText } from "./lib/soloPrompt";
import {
  allowedFinalizeLengthJump,
  finalizeIntervalBurstCps,
  isFinalizeLengthJumpInvalid,
} from "./lib/finalizeLength";
import { consumeRateLimit } from "./lib/consumeRateLimit";
import { RESULT_WRITE_RATE_LIMIT } from "./lib/rateLimit";
import { MAX_DURATION_SECONDS, MAX_PRESET_TEXT_LENGTH, MAX_WORD_TARGET } from "../src/lib/practice-limits";

const SOLO_RANKED_MODES = ["time", "words", "quote", "preset"];
const DIFFICULTIES = ["beginner", "easy", "medium", "hard", "expert"];

export const startSession = mutation({
  args: {
    mode: v.optional(v.string()),
    duration: v.optional(v.number()),
    wordTarget: v.optional(v.number()),
    difficulty: v.optional(v.string()),
    punctuation: v.optional(v.boolean()),
    numbers: v.optional(v.boolean()),
    capitalization: v.optional(v.boolean()),
    quoteId: v.optional(v.string()),
    presetId: v.optional(v.string()),
    targetText: v.optional(v.string()),
    // Ignored; identity comes from ctx.auth. Kept so current frontend calls typecheck.
    clerkId: v.optional(v.string()),
    settings: v.optional(
      v.object({
        mode: v.string(),
        duration: v.optional(v.number()),
        wordTarget: v.optional(v.number()),
        difficulty: v.string(),
        punctuation: v.boolean(),
        numbers: v.boolean(),
        capitalization: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args): Promise<{ sessionId: Id<"typingSessions">; targetText: string }> => {
    const user = await requireAuthedUser(ctx);
    const now = Date.now();
    if (args.settings) {
      for (const key of ["mode", "duration", "wordTarget", "difficulty", "punctuation", "numbers", "capitalization"] as const) {
        if (args[key] !== undefined && args.settings[key] !== undefined && args[key] !== args.settings[key]) {
          throw new Error(`Conflicting ${key} settings`);
        }
      }
    }
    const mode = args.settings?.mode ?? args.mode;
    const difficulty = args.settings?.difficulty ?? args.difficulty;
    const punctuation = args.settings?.punctuation ?? args.punctuation ?? false;
    const numbers = args.settings?.numbers ?? args.numbers ?? false;
    const capitalization =
      args.settings?.capitalization ?? args.capitalization ?? false;
    const duration = args.settings?.duration ?? args.duration;
    const wordTarget = args.settings?.wordTarget ?? args.wordTarget;

    if (!mode || !SOLO_RANKED_MODES.includes(mode)) throw new Error("Unsupported ranked practice mode");
    if (!difficulty || !DIFFICULTIES.includes(difficulty)) throw new Error("Unsupported difficulty");
    if (duration !== undefined && (!Number.isInteger(duration) || duration < 1 || duration > MAX_DURATION_SECONDS)) {
      throw new Error(`Choose a whole duration from 1 to ${MAX_DURATION_SECONDS} seconds`);
    }
    if (wordTarget !== undefined && (!Number.isInteger(wordTarget) || wordTarget < 1 || wordTarget > MAX_WORD_TARGET)) {
      throw new Error(`Choose a whole word count from 1 to ${MAX_WORD_TARGET}`);
    }
    if (mode === "time" && duration === undefined) throw new Error("Duration is required for time mode");
    if (mode === "words" && wordTarget === undefined) throw new Error("Word count is required for words mode");
    if (args.targetText !== undefined && args.targetText.length > MAX_PRESET_TEXT_LENGTH) {
      throw new Error(`Prompt text must be at most ${MAX_PRESET_TEXT_LENGTH} characters`);
    }

    const targetText = resolveSessionTargetText({
      mode,
      clientTargetText: args.targetText,
      duration,
      wordTarget,
      difficulty,
      punctuation,
      numbers,
      capitalization,
    });

    const existingSession = await ctx.db
      .query("typingSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (existingSession) {
      const isRecent = now - existingSession.createdAt < SESSION_RESUME_GRACE_MS;
      const sameTargetText = existingSession.targetText === targetText;
      if (isRecent && sameTargetText) {
        return { sessionId: existingSession._id, targetText: existingSession.targetText };
      }
      await ctx.db.delete(existingSession._id);
    }

    const sessionId = await ctx.db.insert("typingSessions", {
      userId: user._id,
      settings: {
        mode,
        duration,
        wordTarget,
        difficulty,
        punctuation,
        numbers,
        capitalization,
      },
      targetText,
      createdAt: now,
      lastEventAt: now,
      eventCount: 0,
      lastTypedLength: 0,
      maxCharsPerSecond: 0,
      maxBurstChars: 0,
    });

    return { sessionId, targetText };
  },
});

export const recordProgress = mutation({
  args: {
    sessionId: v.id("typingSessions"),
    typedLength: v.number(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return { success: false };
    }

    const user = await getAuthedUser(ctx);
    if (!user || session.userId !== user._id) {
      return { success: false };
    }

    const now = Date.now();
    const startedAt = session.startedAt ?? now;

    if (args.typedLength < session.lastTypedLength) {
      await ctx.db.patch(args.sessionId, {
        startedAt,
        lastEventAt: now,
        eventCount: session.eventCount + 1,
        lastTypedLength: args.typedLength,
      });
      return { success: true };
    }

    const charsDelta = args.typedLength - session.lastTypedLength;
    const timeDeltaMs = now - session.lastEventAt;
    const burstCps = burstCharsPerSecond(charsDelta, timeDeltaMs);

    await ctx.db.patch(args.sessionId, {
      startedAt,
      lastEventAt: now,
      eventCount: session.eventCount + 1,
      lastTypedLength: args.typedLength,
      maxCharsPerSecond: Math.max(session.maxCharsPerSecond, burstCps),
      maxBurstChars: Math.max(session.maxBurstChars, charsDelta),
    });
    return { success: true };
  },
});

export const finalizeSession = mutation({
  args: {
    sessionId: v.id("typingSessions"),
    typedText: v.string(),
    clientElapsedMs: v.number(),
    localDate: v.string(),
    localHour: v.number(),
    dayOfWeek: v.number(),
    month: v.number(),
    day: v.number(),
    isWeekend: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    resultId: Id<"testResults">;
    wpm: number;
    accuracy: number;
    duration: number;
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

    const user = await requireAuthedUser(ctx);
    if (session.userId !== user._id) {
      throw new Error("Session does not belong to the signed-in user.");
    }

    await consumeRateLimit(
      ctx,
      `finalize:${user._id}`,
      RESULT_WRITE_RATE_LIMIT
    );

    const now = Date.now();
    const serverElapsed = session.startedAt
      ? now - session.startedAt
      : now - session.createdAt;
    const timeSinceLastProgressMs = now - session.lastEventAt;
    const typedLength = args.typedText.length;
    const lengthJumpInvalid = isFinalizeLengthJumpInvalid(
      typedLength,
      session.lastTypedLength,
      timeSinceLastProgressMs
    );
    const finalizeBurstCps = finalizeIntervalBurstCps(
      typedLength,
      session.lastTypedLength,
      timeSinceLastProgressMs
    );
    const maxCharsPerSecond = Math.max(
      session.maxCharsPerSecond,
      finalizeBurstCps
    );

    const stats = computeStats(args.typedText, session.targetText);
    const wordResults = computeWordResults(args.typedText, session.targetText);
    const accuracy = calculateAccuracy(stats, args.typedText.length);
    const wpm = calculateWpm(args.typedText.length, serverElapsed);
    const roundedWpm = Math.round(wpm);
    const roundedAccuracy = Math.round(accuracy * 10) / 10;
    const wordsCorrect = wordResults.correctWords.length;

    const validation = validateTypingSession(
      {
        mode: session.settings.mode,
        duration: session.settings.duration,
        wordTarget: session.settings.wordTarget,
        targetText: session.targetText,
        eventCount: session.eventCount,
        maxCharsPerSecond,
      },
      {
        serverElapsedMs: serverElapsed,
        computedWpm: wpm,
        typedText: args.typedText,
      }
    );

    let isValid = validation.isValid;
    let invalidReason = validation.invalidReason;
    if (lengthJumpInvalid) {
      isValid = false;
      const jump = typedLength - session.lastTypedLength;
      const allowed = allowedFinalizeLengthJump(timeSinceLastProgressMs);
      const reason = `Typed length jumped ${jump} vs last heartbeat (allowed ${allowed})`;
      invalidReason = invalidReason ? `${invalidReason}; ${reason}` : reason;
    }

    const resultId = await ctx.db.insert("testResults", {
      userId: session.userId,
      wpm: roundedWpm,
      accuracy: roundedAccuracy,
      mode: session.settings.mode,
      duration: serverElapsed,
      wordCount: Math.floor(args.typedText.length / 5),
      difficulty: session.settings.difficulty,
      punctuation: session.settings.punctuation,
      numbers: session.settings.numbers,
      capitalization: session.settings.capitalization,
      wordsCorrect,
      wordsIncorrect: wordResults.incorrectWords.length,
      charsMissed: stats.missed,
      charsExtra: stats.extra,
      isValid,
      invalidReason,
      rankedEligible: true,
      localCalendar: activityCalendar(args, now),
      createdAt: now,
    });

    let newAchievements: string[] = [];
    if (isValid) {
      await ctx.runMutation(internal.streaks.updateStreak, {
        userId: session.userId,
        localDate: utcDate(now),
        duration: serverElapsed,
        wordsCorrect,
      });

      const achievementResult = await ctx.runMutation(
        internal.achievements.checkAndAwardAchievements,
        {
          userId: session.userId,
          resultId,
        }
      );
      newAchievements = achievementResult.newAchievements;

      await ctx.runMutation(internal.statsCache.updateUserStatsCache, {
        userId: session.userId,
        wpm: roundedWpm,
        accuracy: roundedAccuracy,
        duration: serverElapsed,
        wordCount: Math.floor(args.typedText.length / 5),
        isValid: true,
      });

    }

    await ctx.db.delete(args.sessionId);

    return {
      resultId,
      wpm: roundedWpm,
      accuracy: roundedAccuracy,
      duration: serverElapsed,
      isValid,
      invalidReason,
      wordsCorrect,
      wordsIncorrect: wordResults.incorrectWords.length,
      charsMissed: stats.missed,
      charsExtra: stats.extra,
      newAchievements,
    };
  },
});

export const getCurrentSession = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthedUser(ctx);
    if (!user) {
      return null;
    }

    return await ctx.db
      .query("typingSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
  },
});

export const cancelSession = mutation({
  args: {
    sessionId: v.id("typingSessions"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return { success: true };
    }

    const user = await getAuthedUser(ctx);
    if (!user || session.userId !== user._id) {
      return { success: false };
    }

    await ctx.db.delete(args.sessionId);
    return { success: true };
  },
});
