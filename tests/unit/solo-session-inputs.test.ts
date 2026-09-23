// @vitest-environment node
import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { MAX_DURATION_SECONDS, MAX_PRESET_TEXT_LENGTH, MAX_WORD_TARGET } from "../../src/lib/practice-limits";
import { backendContract, userRow } from "./fixtures/backend-contract";

describe("ranked session request bounds", () => {
  it("accepts normal flat settings and rejects oversized prompt work", async () => {
    const t = backendContract();
    await t.run((ctx) => ctx.db.insert("users", userRow("owner")));
    const owner = t.withIdentity({ subject: "owner" });

    const normal = await owner.mutation(api.typingSessions.startSession, {
      mode: "time", difficulty: "easy", duration: 30,
    });
    expect(normal.targetText.split(" ").length).toBeGreaterThan(50);
    const maximum = await owner.mutation(api.typingSessions.startSession, {
      mode: "time", difficulty: "easy", duration: MAX_DURATION_SECONDS,
    });
    expect(maximum.targetText.split(" ").length).toBe(3750);

    await expect(owner.mutation(api.typingSessions.startSession, {
      mode: "time", difficulty: "easy", duration: MAX_DURATION_SECONDS + 1,
    })).rejects.toThrow(/duration/);
    await expect(owner.mutation(api.typingSessions.startSession, {
      mode: "words", difficulty: "easy", wordTarget: MAX_WORD_TARGET + 1,
    })).rejects.toThrow(/word count/);
    await expect(owner.mutation(api.typingSessions.startSession, {
      mode: "preset", difficulty: "easy", targetText: "x".repeat(MAX_PRESET_TEXT_LENGTH + 1),
    })).rejects.toThrow(/prompt text/i);
  });

  it("rejects malformed modes, counts, and conflicting old settings", async () => {
    const t = backendContract();
    await t.run((ctx) => ctx.db.insert("users", userRow("owner")));
    const owner = t.withIdentity({ subject: "owner" });

    await expect(owner.mutation(api.typingSessions.startSession, {
      mode: "plan", difficulty: "easy",
    })).rejects.toThrow(/mode/);
    await expect(owner.mutation(api.typingSessions.startSession, {
      mode: "time", difficulty: "unknown", duration: 30,
    })).rejects.toThrow(/difficulty/);
    await expect(owner.mutation(api.typingSessions.startSession, {
      mode: "time", difficulty: "easy", duration: 1.5,
    })).rejects.toThrow(/duration/);
    await expect(owner.mutation(api.typingSessions.startSession, {
      mode: "time", difficulty: "easy", duration: Number.POSITIVE_INFINITY,
    })).rejects.toThrow(/duration/);
    await expect(owner.mutation(api.typingSessions.startSession, {
      mode: "words", difficulty: "easy", wordTarget: Number.NaN,
    })).rejects.toThrow(/word count/);
    await expect(owner.mutation(api.typingSessions.startSession, {
      mode: "words", difficulty: "easy", wordTarget: -1,
    })).rejects.toThrow(/word count/);
    await expect(owner.mutation(api.typingSessions.startSession, {
      mode: "words", difficulty: "easy", wordTarget: 25,
      settings: { mode: "words", difficulty: "easy", wordTarget: 30, punctuation: false, numbers: false },
    })).rejects.toThrow(/conflicting wordTarget/i);
  });
});
