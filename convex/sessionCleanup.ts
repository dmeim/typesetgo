import { v } from "convex/values";
import { SOLO_PREPARED_SESSION_TTL_MS } from "../src/lib/practice-limits";
import { internalMutation } from "./_generated/server";
import { SESSION_TTL_MS } from "./lib/antiCheatConstants";
import { consumeRateLimit } from "./lib/consumeRateLimit";
import { ADMIN_LOGIN_RATE_LIMIT } from "./lib/rateLimit";

/**
 * Clean up expired typing sessions
 * Runs every 5 minutes via cron job
 */
export const cleanupExpiredSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - SESSION_TTL_MS;

    const expiredSessions = await ctx.db
      .query("typingSessions")
      .withIndex("by_last_event", (q) => q.lt("lastEventAt", cutoff))
      .filter((q) => q.or(
        q.and(q.eq(q.field("startedAt"), undefined), q.lt(q.field("createdAt"), now - SOLO_PREPARED_SESSION_TTL_MS)),
        q.and(q.neq(q.field("startedAt"), undefined),
          q.or(q.neq(q.field("settings.mode"), "time"),
            q.lt(q.add(q.field("startedAt"), q.mul(q.field("settings.duration"), 1000)), cutoff)))
      ))
      .take(100);

    let deleted = 0;
    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
      deleted++;
    }

    // Log cleanup stats (visible in Convex dashboard)
    if (deleted > 0) {
      console.log(`Session cleanup: deleted ${deleted} expired sessions`);
    }

    return { deleted };
  },
});

/**
 * Clean up expired admin review sessions
 */
export const cleanupExpiredAdminSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sessions = await ctx.db.query("adminSessions").collect();
    let deleted = 0;
    for (const session of sessions) {
      if (session.expiresAt < now) {
        await ctx.db.delete(session._id);
        deleted++;
      }
    }
    return { deleted };
  },
});

export const consumeAdminLoginRateLimit = internalMutation({
  args: {},
  handler: async (ctx) => {
    await consumeRateLimit(ctx, "admin_login", ADMIN_LOGIN_RATE_LIMIT);
  },
});

export const createAdminSession = internalMutation({
  args: {
    tokenHash: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("adminSessions", {
      tokenHash: args.tokenHash,
      createdAt: args.createdAt,
      expiresAt: args.expiresAt,
    });
  },
});
