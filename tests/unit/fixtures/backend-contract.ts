import { convexTest } from "convex-test";
import schema from "../../../convex/schema";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

export function backendContract() {
  return convexTest(schema, import.meta.glob("../../../convex/**/*.ts"));
}

export function userRow(clerkId: string) {
  return { clerkId, email: `${clerkId}@example.test`, username: "Same username", createdAt: 1, updatedAt: 1 };
}

export function resultRow(userId: Id<"users">, overrides: Partial<Doc<"testResults">> = {}) {
  return {
    userId, wpm: 100, accuracy: 99, mode: "time", duration: 30000,
    wordCount: 50, difficulty: "easy", punctuation: false, numbers: false,
    wordsCorrect: 50, wordsIncorrect: 0, isValid: true, rankedEligible: true,
    createdAt: Date.now(), ...overrides,
  };
}
