// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users for authentication
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // Test results for saving typing stats
  testResults: defineTable({
    userId: v.id("users"),
    wpm: v.number(),
    accuracy: v.number(),
    mode: v.string(),
    duration: v.number(),
    wordCount: v.number(),
    difficulty: v.string(),
    punctuation: v.boolean(),
    numbers: v.boolean(),
    // Additional stats (optional for backwards compatibility with existing data)
    wordsCorrect: v.optional(v.number()),
    wordsIncorrect: v.optional(v.number()),
    charsMissed: v.optional(v.number()),
    charsExtra: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "createdAt"]),

  // Rooms for multiplayer Connect mode
  rooms: defineTable({
    code: v.string(),
    hostId: v.string(),
    hostName: v.string(),
    status: v.union(v.literal("waiting"), v.literal("active")),
    settings: v.object({
      mode: v.string(),
      duration: v.number(),
      wordTarget: v.number(),
      difficulty: v.string(),
      punctuation: v.boolean(),
      numbers: v.boolean(),
      quoteLength: v.string(),
      presetText: v.optional(v.string()),
      presetModeType: v.optional(v.string()),
      ghostWriterEnabled: v.boolean(),
      ghostWriterSpeed: v.number(),
      soundEnabled: v.boolean(),
      typingFontSize: v.number(),
      textAlign: v.string(),
      theme: v.optional(v.any()),
      plan: v.optional(v.any()),
      planIndex: v.optional(v.number()),
    }),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_host", ["hostId"]),

  // Participants in rooms
  participants: defineTable({
    roomId: v.id("rooms"),
    sessionId: v.string(),
    name: v.string(),
    isConnected: v.boolean(),
    stats: v.object({
      wpm: v.number(),
      accuracy: v.number(),
      progress: v.number(),
      wordsTyped: v.number(),
      timeElapsed: v.number(),
      isFinished: v.boolean(),
    }),
    typedText: v.optional(v.string()),
    targetText: v.optional(v.string()),
    joinedAt: v.number(),
    lastSeen: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_session", ["sessionId"]),

  // User preferences for syncing settings across devices
  userPreferences: defineTable({
    userId: v.id("users"),

    // Theme
    themeName: v.string(),
    customTheme: v.optional(
      v.object({
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
      })
    ),

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

    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
