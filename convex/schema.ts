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
    capitalization: v.optional(v.boolean()),
    // Additional stats (optional for backwards compatibility with existing data)
    wordsCorrect: v.optional(v.number()),
    wordsIncorrect: v.optional(v.number()),
    charsMissed: v.optional(v.number()),
    charsExtra: v.optional(v.number()),
    // Anti-cheat validity fields
    isValid: v.optional(v.boolean()), // undefined = legacy (treated as valid)
    invalidReason: v.optional(v.string()), // For debugging/admin review
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "createdAt"]),

  // Typing sessions for anti-cheat validation
  typingSessions: defineTable({
    userId: v.id("users"),
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
    createdAt: v.number(),
    startedAt: v.optional(v.number()), // Set on first recordProgress
    lastEventAt: v.number(),
    eventCount: v.number(),
    lastTypedLength: v.number(), // For monotonic validation
    maxCharsPerSecond: v.number(),
    maxBurstChars: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_created_at", ["createdAt"]),

  // Rooms for multiplayer Connect mode
  rooms: defineTable({
    code: v.string(),
    hostId: v.string(),
    hostName: v.string(),
    status: v.union(v.literal("waiting"), v.literal("active")),
    // Game mode: practice (existing), race, or lesson
    gameMode: v.optional(
      v.union(v.literal("practice"), v.literal("race"), v.literal("lesson"))
    ),
    settings: v.object({
      mode: v.string(),
      duration: v.number(),
      wordTarget: v.number(),
      difficulty: v.string(),
      punctuation: v.boolean(),
      numbers: v.boolean(),
      capitalization: v.optional(v.boolean()),
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
    // Race-specific fields
    readyParticipants: v.optional(v.array(v.string())), // sessionIds that are ready
    raceStartTime: v.optional(v.number()), // timestamp when race actually starts
    targetText: v.optional(v.string()), // shared text all racers type (for fairness)
    raceEndTime: v.optional(v.number()), // timestamp when race ends (for 10-second timer)
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
    // Race-specific fields
    isReady: v.optional(v.boolean()), // ready status for countdown
    emoji: v.optional(v.string()), // chosen emoji avatar
    finishTime: v.optional(v.number()), // when they finished (for ranking)
    position: v.optional(v.number()), // their race position (1st, 2nd, etc.)
    disconnectedAt: v.optional(v.number()), // timestamp when disconnected (for rejoin window)
    typedProgress: v.optional(v.number()), // characters correctly typed (for rejoin restore)
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
    defaultCapitalization: v.optional(v.boolean()),

    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // User achievements tracking - one row per user
  // achievements is a map from achievementId to earnedAt timestamp (0 = not earned)
  userAchievements: defineTable({
    userId: v.id("users"),
    achievements: v.record(v.string(), v.number()), // { "wpm-40": 1234567890, "words-100": 1234567890, ... }
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // User streak tracking
  userStreaks: defineTable({
    userId: v.id("users"),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastActivityDate: v.string(), // "YYYY-MM-DD" in user's local time
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Pre-computed user stats cache (one row per user)
  // Stores aggregated stats to avoid scanning all testResults
  userStatsCache: defineTable({
    userId: v.id("users"),
    totalTests: v.number(),
    totalWpm: v.number(), // Sum for computing average
    bestWpm: v.number(),
    totalAccuracy: v.number(), // Sum for computing average
    totalTimeTyped: v.number(),
    totalWordsTyped: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Pre-computed leaderboard entries (one row per user per time range)
  // Avoids scanning entire testResults table for leaderboard queries
  leaderboardCache: defineTable({
    userId: v.id("users"),
    timeRange: v.union(
      v.literal("all-time"),
      v.literal("week"),
      v.literal("today")
    ),
    bestWpm: v.number(),
    bestWpmAt: v.number(), // Timestamp of when this score was achieved
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_time_range_wpm", ["timeRange", "bestWpm"])
    .index("by_user_time_range", ["userId", "timeRange"]),

  // Race results - stores final race results for podium/stats display
  raceResults: defineTable({
    raceId: v.id("rooms"), // reference to the race room
    rankings: v.array(
      v.object({
        sessionId: v.string(),
        name: v.string(),
        emoji: v.optional(v.string()),
        position: v.number(), // 1st, 2nd, 3rd, etc.
        wpm: v.number(),
        accuracy: v.number(),
        finishTime: v.optional(v.number()), // ms from race start to finish
        didFinish: v.boolean(), // false if timed out or disconnected
      })
    ),
    targetText: v.string(), // the text that was raced
    totalRacers: v.number(),
    createdAt: v.number(),
  }).index("by_race", ["raceId"]),
});
