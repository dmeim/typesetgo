// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
});
