import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Theme object validator
const themeValidator = v.object({
  backgroundColor: v.string(),
  surfaceColor: v.string(),
  cursor: v.string(),
  ghostCursor: v.string(),
  defaultText: v.string(),
  upcomingText: v.string(),
  correctText: v.string(),
  incorrectText: v.string(),
  buttonSelected: v.string(),
  buttonUnselected: v.string(),
});

// Full preferences object validator
const preferencesValidator = v.object({
  // Theme
  themeName: v.string(),
  customTheme: v.optional(themeValidator),

  // Sound settings
  soundEnabled: v.boolean(),
  typingSound: v.string(),
  warningSound: v.string(),
  errorSound: v.string(),

  // Ghost writer
  ghostWriterEnabled: v.boolean(),
  ghostWriterSpeed: v.number(),

  // Display settings
  typingFontSize: v.number(),
  iconFontSize: v.number(),
  helpFontSize: v.number(),
  textAlign: v.string(),

  // Test defaults
  defaultMode: v.string(),
  defaultDuration: v.number(),
  defaultWordTarget: v.number(),
  defaultDifficulty: v.string(),
  defaultQuoteLength: v.string(),
  defaultPunctuation: v.boolean(),
  defaultNumbers: v.boolean(),
});

// Save or update user preferences
export const savePreferences = mutation({
  args: {
    clerkId: v.string(),
    preferences: preferencesValidator,
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

    // Check if preferences already exist for this user
    const existingPrefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const prefsData = {
      userId: user._id,
      ...args.preferences,
      updatedAt: Date.now(),
    };

    if (existingPrefs) {
      // Update existing preferences
      await ctx.db.patch(existingPrefs._id, prefsData);
      return existingPrefs._id;
    } else {
      // Create new preferences
      const prefsId = await ctx.db.insert("userPreferences", prefsData);
      return prefsId;
    }
  },
});

// Get user preferences
export const getPreferences = query({
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

    // Get preferences for this user
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return preferences;
  },
});
