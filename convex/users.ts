import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get or create a user when they sign in with Clerk
export const getOrCreateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      // Update the user's info if it has changed (e.g., avatar from OAuth)
      if (
        existingUser.email !== args.email ||
        existingUser.avatarUrl !== args.avatarUrl
      ) {
        await ctx.db.patch(existingUser._id, {
          email: args.email,
          avatarUrl: args.avatarUrl,
          updatedAt: Date.now(),
        });
      }
      return existingUser._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      username: args.username,
      avatarUrl: args.avatarUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

// Get user by Clerk ID
export const getUser = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    return user;
  },
});

// Update user profile (username and/or avatar)
export const updateProfile = mutation({
  args: {
    clerkId: v.string(),
    username: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const updates: { username?: string; avatarUrl?: string; updatedAt: number } = {
      updatedAt: Date.now(),
    };

    if (args.username !== undefined) {
      updates.username = args.username;
    }

    if (args.avatarUrl !== undefined) {
      updates.avatarUrl = args.avatarUrl;
    }

    await ctx.db.patch(user._id, updates);

    return user._id;
  },
});
