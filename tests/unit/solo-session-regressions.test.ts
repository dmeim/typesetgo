// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { getTestTypeLabels } from "../../src/components/stats/profile-presentation";
import { getLocalCalendarFields } from "../../src/lib/activity-calendar";
import { backendContract, userRow } from "./fixtures/backend-contract";

const prompt = "alpha bravo charlie delta echo foxtrot golf hotel india juliet";
afterEach(() => vi.useRealTimers());

async function setup(mode = "preset", duration?: number, wordTarget?: number) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-22T15:00:00Z"));
  const t = backendContract();
  await t.run((ctx) => ctx.db.insert("users", userRow("owner")));
  const owner = t.withIdentity({ subject: "owner" });
  const session = await owner.mutation(api.typingSessions.startSession, {
    mode, difficulty: "hard", punctuation: true, numbers: true, capitalization: true,
    duration, wordTarget, targetText: prompt,
  });
  return { t, owner, session };
}

type Setup = Awaited<ReturnType<typeof setup>>;
async function typePrompt({ owner, session }: Setup, typedText = session.targetText, elapsed = 30000) {
  await owner.mutation(api.typingSessions.recordProgress, { sessionId: session.sessionId, typedLength: 0 });
  for (let i = 1; i <= 3; i++) {
    vi.setSystemTime(Date.now() + elapsed / 3);
    await owner.mutation(api.typingSessions.recordProgress, {
      sessionId: session.sessionId, typedLength: Math.floor(typedText.length * i / 3),
    });
  }
}

function finalizeArgs(session: Setup["session"], typedText = session.targetText) {
  return { sessionId: session.sessionId, typedText, clientElapsedMs: 1, ...getLocalCalendarFields() };
}

describe("independent solo attempts and server completion timing", () => {
  it("never reuses or deletes another tab's same-prompt or different-prompt attempt", async () => {
    const { t, owner, session } = await setup();
    await owner.mutation(api.typingSessions.recordProgress, { sessionId: session.sessionId, typedLength: 1 });
    const second = await owner.mutation(api.typingSessions.startSession, { mode: "preset", difficulty: "hard", targetText: prompt });
    const third = await owner.mutation(api.typingSessions.startSession, { mode: "preset", difficulty: "easy", targetText: "another prompt" });
    expect(new Set([session.sessionId, second.sessionId, third.sessionId]).size).toBe(3);
    expect(await t.run((ctx) => ctx.db.get(session.sessionId))).toMatchObject({ lastTypedLength: 1 });
    await owner.mutation(api.typingSessions.cancelSession, { sessionId: second.sessionId });
    expect(await t.run((ctx) => ctx.db.get(session.sessionId))).not.toBeNull();
    expect(await t.run((ctx) => ctx.db.get(third.sessionId))).not.toBeNull();
  });

  it("freezes completion idempotently, rejects later progress, and excludes save/retry delay", async () => {
    const fixture = await setup();
    const { t, owner, session } = fixture;
    await typePrompt(fixture);
    expect(await owner.mutation(api.typingSessions.recordProgress, {
      sessionId: session.sessionId, typedLength: prompt.length, completed: true,
    })).toEqual({ success: true });
    const snapshot = await t.run((ctx) => ctx.db.get(session.sessionId));
    vi.setSystemTime(Date.now() + 120000);
    expect(await owner.mutation(api.typingSessions.recordProgress, {
      sessionId: session.sessionId, typedLength: prompt.length, completed: true,
    })).toEqual({ success: true });
    expect(await owner.mutation(api.typingSessions.recordProgress, {
      sessionId: session.sessionId, typedLength: prompt.length + 1,
    })).toEqual({ success: false });
    expect(await t.run((ctx) => ctx.db.get(session.sessionId))).toEqual(snapshot);
    // A failed finalization leaves the frozen snapshot available for retry.
    await expect(t.withIdentity({ subject: "other" }).mutation(api.typingSessions.finalizeSession, finalizeArgs(session))).rejects.toThrow();
    const result = await owner.mutation(api.typingSessions.finalizeSession, finalizeArgs(session));
    expect(result).toMatchObject({ isValid: true, duration: 30000, wpm: Math.round(prompt.length / 5 * 2) });
  });

  it("uses the server deadline for late Time completion, not completion/save latency", async () => {
    const fixture = await setup("time", 30);
    const { owner, session } = fixture;
    const typedText = session.targetText.slice(0, 60);
    await typePrompt(fixture, typedText);
    vi.setSystemTime(Date.now() + 5000);
    await owner.mutation(api.typingSessions.recordProgress, { sessionId: session.sessionId, typedLength: 60, completed: true });
    vi.setSystemTime(Date.now() + 90000);
    expect(await owner.mutation(api.typingSessions.finalizeSession, finalizeArgs(session, typedText))).toMatchObject({ isValid: true, duration: 30000, wpm: 24 });
  });

  it("rejects late Time heartbeats instead of granting extra typing beyond the ranked deadline", async () => {
    const fixture = await setup("time", 30);
    const { owner, session, t } = fixture;
    await typePrompt(fixture, session.targetText.slice(0, 60));
    vi.setSystemTime(Date.now() + 120000);
    expect(await owner.mutation(api.typingSessions.recordProgress, { sessionId: session.sessionId, typedLength: 300 })).toEqual({ success: false });
    expect(await t.run((ctx) => ctx.db.get(session.sessionId))).toMatchObject({ lastTypedLength: 60 });
    await owner.mutation(api.typingSessions.recordProgress, { sessionId: session.sessionId, typedLength: 300, completed: true });
    const result = await owner.mutation(api.typingSessions.finalizeSession, finalizeArgs(session, session.targetText.slice(0, 300)));
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toMatch(/Burst CPS/);
  });

  it("does not let waiting until the Time deadline rehabilitate an early completion", async () => {
    const fixture = await setup("time", 30);
    const { owner, session } = fixture;
    const typedText = session.targetText.slice(0, 30);
    await typePrompt(fixture, typedText, 6000);
    await owner.mutation(api.typingSessions.recordProgress, { sessionId: session.sessionId, typedLength: 30, completed: true });
    vi.setSystemTime(Date.now() + 90000);
    const result = await owner.mutation(api.typingSessions.finalizeSession, finalizeArgs(session, typedText));
    expect(result.duration).toBe(6000);
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toMatch(/too fast/);
  });

  it.each([false, true])("a delayed final paste stays invalid (completion signal: %s)", async (completed) => {
    const fixture = await setup("preset");
    const { owner, session } = fixture;
    await typePrompt(fixture, prompt.slice(0, 3));
    vi.setSystemTime(Date.now() + 120000);
    const pasted = prompt + " extra".repeat(100);
    if (completed) await owner.mutation(api.typingSessions.recordProgress, { sessionId: session.sessionId, typedLength: pasted.length, completed: true });
    const result = await owner.mutation(api.typingSessions.finalizeSession, finalizeArgs(session, pasted));
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toMatch(completed ? /Burst CPS/ : /jumped/);
  });

  it("invalidates changed final text length after the completion snapshot", async () => {
    const fixture = await setup();
    await typePrompt(fixture);
    await fixture.owner.mutation(api.typingSessions.recordProgress, { sessionId: fixture.session.sessionId, typedLength: prompt.length, completed: true });
    const result = await fixture.owner.mutation(api.typingSessions.finalizeSession, finalizeArgs(fixture.session, prompt.slice(0, -1)));
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toMatch(/changed after completion/);
  });

  it.each(["preset", "time"])("old %s clients use server progress/deadline, never client elapsed or save delay", async (mode) => {
    const fixture = await setup(mode, mode === "time" ? 30 : undefined);
    const text = mode === "time" ? fixture.session.targetText.slice(0, 60) : prompt;
    await typePrompt(fixture, text);
    vi.setSystemTime(Date.now() + 120000);
    const result = await fixture.owner.mutation(api.typingSessions.finalizeSession, finalizeArgs(fixture.session, text));
    expect(result).toMatchObject({ isValid: true, duration: 30000 });
  });

  it("stores configured Words target separately from WPM units and labels legacy targets honestly", async () => {
    const fixture = await setup("words", undefined, 25);
    await typePrompt(fixture);
    await fixture.owner.mutation(api.typingSessions.recordProgress, { sessionId: fixture.session.sessionId, typedLength: fixture.session.targetText.length, completed: true });
    const result = await fixture.owner.mutation(api.typingSessions.finalizeSession, finalizeArgs(fixture.session));
    const row = await fixture.t.run((ctx) => ctx.db.get(result.resultId));
    expect(row).toMatchObject({ wordTarget: 25, wordCount: Math.floor(fixture.session.targetText.length / 5) });
    expect(getTestTypeLabels(row!)).toContain("25 words");
    const legacy = { ...row!, wordTarget: undefined };
    expect(getTestTypeLabels(legacy)).toContain("Target not recorded");
    expect(getTestTypeLabels(legacy)).not.toContain(`${row!.wordCount} words`);
  });

  it.each(["quote", "preset"])("normalizes generated modifiers on new %s results", async (mode) => {
    const fixture = await setup(mode);
    await typePrompt(fixture);
    await fixture.owner.mutation(api.typingSessions.recordProgress, { sessionId: fixture.session.sessionId, typedLength: prompt.length, completed: true });
    const result = await fixture.owner.mutation(api.typingSessions.finalizeSession, finalizeArgs(fixture.session));
    expect(result.isValid).toBe(true);
    const row = await fixture.t.run((ctx) => ctx.db.get(result.resultId));
    expect(row).toMatchObject({ punctuation: false, numbers: false, capitalization: false });
    expect(result.newAchievements.some((id) => id.startsWith("challenge-"))).toBe(false);
    expect(getTestTypeLabels(row!)).toEqual([mode === "quote" ? "Quote" : "Preset"]);
  });
});
