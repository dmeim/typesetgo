import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const emptyParticipantStats = () => ({
  wpm: 0, accuracy: 0, progress: 0, wordsTyped: 0, timeElapsed: 0, isFinished: false,
});

// Compatibility check for session-owned room controls. This is not authentication.
export function checkRoomHost(room: Doc<"rooms">, hostSessionId?: string) {
  if (hostSessionId !== undefined && room.hostId !== hostSessionId) {
    throw new Error("Only the room host can change this room");
  }
}

/** Persist the current race snapshot in the same transaction that ends the race. */
export async function saveRaceSnapshot(ctx: MutationCtx, room: Doc<"rooms">) {
  const existing = await ctx.db.query("raceResults")
    .withIndex("by_race", (q) => q.eq("raceId", room._id)).first();
  if (existing) return existing._id;
  const participants = await ctx.db.query("participants")
    .withIndex("by_room", (q) => q.eq("roomId", room._id)).collect();
  const sorted = [...participants].sort((a, b) => {
    if (a.stats.isFinished !== b.stats.isFinished) return a.stats.isFinished ? -1 : 1;
    if (a.stats.isFinished) return (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity);
    return b.stats.progress - a.stats.progress;
  });
  return await ctx.db.insert("raceResults", {
    raceId: room._id,
    rankings: sorted.map((p, index) => ({
      sessionId: p.sessionId, name: p.name, emoji: p.emoji, position: index + 1,
      wpm: p.stats.wpm, accuracy: p.stats.accuracy, finishTime: p.finishTime,
      didFinish: p.stats.isFinished,
    })),
    targetText: room.targetText ?? "",
    totalRacers: participants.length,
    createdAt: Date.now(),
  });
}

export type AttemptVersion = { runVersion?: number; resetVersion?: number; raceStartTime?: number };

/** Guards delayed client emissions after stop, reset, departure, or another run. */
export function acceptsAttempt(
  room: Doc<"rooms"> | null,
  participant: Doc<"participants">,
  version: AttemptVersion,
) {
  if (!room || room.status !== "active" || !participant.isConnected) return false;
  if ((participant.resetVersion ?? 0) !== (version.resetVersion ?? 0)) return false;
  if (room.gameMode === "race") {
    return room.raceEndTime === undefined && room.raceStartTime !== undefined &&
      room.raceStartTime <= Date.now() && version.raceStartTime === room.raceStartTime;
  }
  return (room.runVersion ?? 0) === (version.runVersion ?? 0);
}

export function validateParticipantStats(stats: Doc<"participants">["stats"]) {
  for (const value of [stats.wpm, stats.accuracy, stats.progress, stats.wordsTyped, stats.timeElapsed]) {
    if (!Number.isFinite(value) || value < 0) throw new Error("Invalid participant progress");
  }
  if (stats.accuracy > 100 || stats.progress > 100) throw new Error("Invalid participant progress");
}

/** Resolve host-led plans before validating the configuration of the selected attempt. */
export function validatePracticeSettings(settings: Doc<"rooms">["settings"]) {
  let selected = settings;
  if (settings.mode === "plan") {
    const plan: unknown = settings.plan;
    const index = settings.planIndex ?? 0;
    if (!Array.isArray(plan) || !plan.length || !Number.isInteger(index) || index < 0 || index >= plan.length) {
      throw new Error("Choose a valid plan step before starting");
    }
    const item = plan[index] as { mode?: unknown; settings?: unknown } | null;
    if (!item || typeof item.mode !== "string" || item.mode === "plan" ||
      !item.settings || typeof item.settings !== "object") {
      throw new Error("This plan step is not supported");
    }
    selected = { ...settings, ...item.settings, mode: item.mode };
  }
  if (!["time", "words", "quote", "zen", "preset"].includes(selected.mode)) {
    throw new Error("Choose a supported test mode");
  }
  const timed = selected.mode === "time" || (selected.mode === "preset" && selected.presetModeType === "time");
  if (timed && (!Number.isFinite(selected.duration) || selected.duration <= 0)) {
    throw new Error("Choose a duration greater than zero");
  }
  if (selected.mode === "words" && (!Number.isInteger(selected.wordTarget) || selected.wordTarget <= 0)) {
    throw new Error("Choose a positive word count");
  }
  if (selected.mode === "preset" && !selected.presetText?.trim()) {
    throw new Error("Enter preset text before starting");
  }
}

export async function resetParticipantAttempt(ctx: MutationCtx, participant: Doc<"participants">) {
  await ctx.db.patch(participant._id, {
    resetVersion: (participant.resetVersion ?? 0) + 1,
    stats: emptyParticipantStats(),
    typedText: undefined,
    targetText: undefined,
    typedProgress: undefined,
    finishTime: undefined,
    position: undefined,
  });
}
