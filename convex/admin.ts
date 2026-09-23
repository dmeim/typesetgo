import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  ADMIN_REVIEW_WPM_FLOOR,
  ADMIN_SESSION_TTL_MS,
} from "./lib/antiCheatConstants";
import {
  randomToken,
  sha256Hex,
  timingSafeEqualString,
} from "./lib/crypto";

/**
 * Admin login. Password is Convex env ADMIN_PASSWORD (never VITE_).
 * Returns a session token. Rate-limited.
 */
export const login = action({
  args: {
    password: v.string(),
  },
  handler: async (ctx, args): Promise<{ token: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in before using admin review.");
    await ctx.runMutation(internal.sessionCleanup.consumeAdminLoginRateLimit, { subject: identity.subject });

    const adminPassword = convexEnv("ADMIN_PASSWORD");
    const configured =
      typeof adminPassword === "string" && adminPassword.length > 0;
    const expected = configured ? adminPassword : "unconfigured";
    const matches = await timingSafeEqualString(args.password, expected);

    if (!configured) {
      throw new Error("Admin is not configured");
    }
    if (!matches) {
      throw new Error("Invalid password");
    }

    const token = randomToken();
    const now = Date.now();
    await ctx.runMutation(internal.sessionCleanup.createAdminSession, {
      tokenHash: await sha256Hex(token),
      createdAt: now,
      expiresAt: now + ADMIN_SESSION_TTL_MS,
    });

    return { token };
  },
});

/** Vite `tsc -b` has no Node `process` types; Convex still injects env at runtime. */
function convexEnv(name: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process;
  return proc?.env?.[name];
}

async function requireAdminSession(
  ctx: QueryCtx | MutationCtx,
  token: string
) {
  const tokenHash = await sha256Hex(token);
  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Invalid token");
  }

  return session;
}

export const listReview = query({
  args: {
    token: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);
    const limit = Math.min(args.limit ?? 100, 200);

    const highWpm = await ctx.db
      .query("testResults")
      .withIndex("by_wpm", (q) => q.gte("wpm", ADMIN_REVIEW_WPM_FLOOR))
      .order("desc")
      .take(limit);

    const invalid = await ctx.db
      .query("testResults")
      .withIndex("by_validity", (q) => q.eq("isValid", false))
      .take(limit);

    const byId = new Map<string, (typeof highWpm)[number]>();
    for (const row of [...invalid, ...highWpm]) {
      byId.set(row._id, row);
    }

    const merged = [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
    const sliced = merged.slice(0, limit);

    const results = [];
    for (const row of sliced) {
      const user = await ctx.db.get(row.userId);
      results.push({
        _id: row._id,
        resultId: row._id,
        userId: row.userId,
        username: user?.username ?? "unknown",
        wpm: row.wpm,
        accuracy: row.accuracy,
        duration: row.duration,
        wordsCorrect: row.wordsCorrect,
        mode: row.mode,
        isValid: row.isValid,
        invalidReason: row.invalidReason,
        createdAt: row.createdAt,
      });
    }

    return results;
  },
});

export const setValidity = mutation({
  args: {
    token: v.string(),
    resultId: v.id("testResults"),
    isValid: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; userId: Id<"users"> }> => {
    await requireAdminSession(ctx, args.token);

    const result = await ctx.db.get(args.resultId);
    if (!result) {
      throw new Error("Test result not found");
    }

    if (args.isValid) {
      await ctx.db.patch(args.resultId, {
        isValid: true,
      });
    } else {
      await ctx.db.patch(args.resultId, {
        isValid: false,
        invalidReason: args.reason ?? result.invalidReason ?? "admin",
      });
    }

    await ctx.runMutation(internal.statsCache.rebuildUserStatsCacheForUser, {
      userId: result.userId,
    });
    await ctx.runMutation(internal.achievements.recheckAchievementsAfterDeletion, {
      userId: result.userId,
    });

    return { success: true, userId: result.userId };
  },
});
