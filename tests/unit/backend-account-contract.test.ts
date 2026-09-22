// @vitest-environment node
import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { backendContract, resultRow, userRow } from "./fixtures/backend-contract";

const preferences = {
  soundEnabled: false, typingSound: "none", warningSound: "none",
  ghostWriterEnabled: false, ghostWriterSpeed: 40, typingFontSize: 20,
  iconFontSize: 20, helpFontSize: 14, textAlign: "left", defaultMode: "time",
  defaultDuration: 30, defaultWordTarget: 25, defaultDifficulty: "easy",
  defaultQuoteLength: "short", defaultPunctuation: false, defaultNumbers: false,
};

describe("registered account authorization and validators", () => {
  it.each([null, "attacker"])("rejects all account-owned writes for identity %s", async (subject) => {
    const t = backendContract();
    const { userId, resultId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", userRow("owner"));
      await ctx.db.insert("users", userRow("attacker"));
      return { userId, resultId: await ctx.db.insert("testResults", resultRow(userId)) };
    });
    const caller = subject ? t.withIdentity({ subject }) : t;
    await expect(caller.mutation(api.users.getOrCreateUser, { clerkId: "owner", email: "changed@example.test", username: "Changed" })).rejects.toThrow();
    await expect(caller.mutation(api.users.updateProfile, { clerkId: "owner", username: "Changed" })).rejects.toThrow();
    await expect(caller.mutation(api.preferences.savePreferences, { clerkId: "owner", preferences })).rejects.toThrow();
    await expect(caller.mutation(api.testResults.deleteResult, { clerkId: "owner", resultId })).rejects.toThrow();
    await expect(caller.mutation(api.achievements.recheckAllAchievements, { clerkId: "owner" })).rejects.toThrow();
    await expect(caller.query(api.users.getUser, { clerkId: "owner" })).rejects.toThrow();
    await expect(caller.query(api.preferences.getPreferences, { clerkId: "owner" })).rejects.toThrow();
    expect((await t.run((ctx) => ctx.db.get(userId)))?.username).toBe("Same username");
    expect(await t.run((ctx) => ctx.db.get(resultId))).not.toBeNull();
  });

  it("allows the authenticated owner while rejecting a result owned by another account", async () => {
    const t = backendContract();
    const owner = t.withIdentity({ subject: "owner" });
    const userId = await owner.mutation(api.users.getOrCreateUser, { clerkId: "owner", email: "owner@example.test", username: "Owner" });
    await owner.mutation(api.users.updateProfile, { clerkId: "owner", username: "Updated" });
    await owner.mutation(api.preferences.savePreferences, { clerkId: "owner", preferences });
    expect((await owner.query(api.preferences.getPreferences, { clerkId: "owner" }))?.defaultDuration).toBe(30);
    expect((await owner.query(api.users.getUser, { clerkId: "owner" }))?.username).toBe("Updated");
    const otherResult = await t.run(async (ctx) => {
      const other = await ctx.db.insert("users", userRow("other"));
      return ctx.db.insert("testResults", resultRow(other));
    });
    await expect(owner.mutation(api.testResults.deleteResult, { clerkId: "owner", resultId: otherResult })).rejects.toThrow(/own/);
    const resultId = await t.run((ctx) => ctx.db.insert("testResults", resultRow(userId)));
    await expect(owner.mutation(api.testResults.deleteResult, { clerkId: "owner", resultId })).resolves.toMatchObject({ success: true });
  });

  it.each([undefined, "legacy-pack"])("accepts preferences with optional legacy error sound %s", async (errorSound) => {
    const owner = backendContract().withIdentity({ subject: "owner" });
    await owner.mutation(api.users.getOrCreateUser, { clerkId: "owner", email: "owner@example.test", username: "Owner" });
    await owner.mutation(api.preferences.savePreferences, { clerkId: "owner", preferences: {
      ...preferences, ...(errorSound === undefined ? {} : { errorSound }),
    } });
    expect((await owner.query(api.preferences.getPreferences, { clerkId: "owner" }))?.errorSound).toBe(errorSound);
  });

  it("executes actual registered argument and schema validation", async () => {
    const t = backendContract();
    const owner = t.withIdentity({ subject: "owner" });
    // @ts-expect-error Deliberately malformed caller tests runtime argument validation.
    await expect(owner.mutation(api.users.getOrCreateUser, { clerkId: "owner", username: 42, email: "x" })).rejects.toThrow();
    // @ts-expect-error Deliberately malformed stored row tests schema enforcement.
    await expect(t.run((ctx) => ctx.db.insert("users", { clerkId: "owner", username: "Name" }))).rejects.toThrow();
    await expect(owner.mutation(api.users.getOrCreateUser, { clerkId: "someone-else", username: "Name", email: "x" })).rejects.toThrow(/signed-in/);
  });
});
