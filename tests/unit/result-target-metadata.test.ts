// @vitest-environment node
import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { backendContract, userRow } from "./fixtures/backend-contract";
import { getTestTypeLabels } from "@/components/stats/profile-presentation";
import { getLocalCalendarFields } from "@/lib/activity-calendar";

const metrics = {
  wpm: 60, accuracy: 100, duration: 30000, wordCount: 30,
  difficulty: "hard", punctuation: true, numbers: true, capitalization: true,
  wordsCorrect: 10, wordsIncorrect: 0, charsMissed: 0, charsExtra: 0,
  ...getLocalCalendarFields(Date.now()),
};

describe("result word-target metadata", () => {
  it("retains the actual Words target in unranked history and its public projection", async () => {
    const t = backendContract();
    const userId = await t.run((ctx) => ctx.db.insert("users", userRow("owner")));
    const owner = t.withIdentity({ subject: "owner" });
    await owner.mutation(api.testResults.saveResult, { ...metrics, mode: "words", wordTarget: 10 });
    const stats = await t.query(api.testResults.getUserStatsByUserId, { userId });
    expect(stats.allResults[0]).toMatchObject({ wordCount: 30, wordTarget: 10 });
    expect(getTestTypeLabels(stats.allResults[0])).toContain("10 words");
    expect(getTestTypeLabels(stats.allResults[0])).not.toContain("30 words");
  });

  it("does not infer a legacy test target from five-character word equivalents", async () => {
    const t = backendContract();
    const userId = await t.run((ctx) => ctx.db.insert("users", userRow("owner")));
    const owner = t.withIdentity({ subject: "owner" });
    await owner.mutation(api.testResults.saveResult, { ...metrics, mode: "words" });
    const stats = await t.query(api.testResults.getUserStatsByUserId, { userId });
    expect(getTestTypeLabels(stats.allResults[0])).toContain("Target not recorded");
    expect(getTestTypeLabels(stats.allResults[0])).not.toContain("30 words");
  });

  it.each(["quote", "preset"])("does not label %s history with inapplicable generated modifiers", async (mode) => {
    const t = backendContract();
    const userId = await t.run((ctx) => ctx.db.insert("users", userRow("owner")));
    await t.withIdentity({ subject: "owner" }).mutation(api.testResults.saveResult, { ...metrics, mode });
    const stats = await t.query(api.testResults.getUserStatsByUserId, { userId });
    expect(stats.allResults[0]).toMatchObject({ punctuation: false, numbers: false, capitalization: false });
    expect(getTestTypeLabels(stats.allResults[0])).toEqual([mode === "quote" ? "Quote" : "Preset"]);
  });

  it.each([0, -1, 1.5, 10001])("rejects invalid configured word target %s", async (wordTarget) => {
    const t = backendContract();
    await t.run((ctx) => ctx.db.insert("users", userRow("owner")));
    await expect(t.withIdentity({ subject: "owner" }).mutation(api.testResults.saveResult, { ...metrics, mode: "words", wordTarget })).rejects.toThrow(/word target/);
  });
});
