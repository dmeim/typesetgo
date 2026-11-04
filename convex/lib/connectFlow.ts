import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  breakEndsAt,
  CONNECT_GOAL_TALLY_MS,
  goalWords,
  isBreakTest,
  isGoalTest,
  isTimedConnectTest,
  isWaitingForNextTest,
  resultsEndAt,
  timedTestEndsAt,
} from "../../src/lib/connect-types";
import { clearedAttempt, hasActivity, listParticipants, withResult } from "./connect";

type Room = Doc<"connectRooms">;
type Participant = Doc<"connectParticipants">;

export async function patchParticipants(ctx: MutationCtx, roomId: Id<"connectRooms">, patch: (p: Participant) => Partial<Participant>) {
  for (const participant of await listParticipants(ctx, roomId)) await ctx.db.patch(participant._id, patch(participant));
}

/**
 * Host pacing: when the room next moves on by itself. A break or a timed test runs out, results give
 * way to the next step, or nothing is due because an untimed test is waiting for everyone to finish.
 */
export function nextRoomEvent(room: Room): number | undefined {
  if (room.pacing !== "host" || room.status !== "running" || room.stepStartedAt === undefined) return undefined;
  const test = room.tests[room.currentIndex];
  if (!test) return undefined;
  if (isBreakTest(test)) return breakEndsAt(test, room.stepStartedAt);
  if (room.stepEndedAt !== undefined) return resultsEndAt(room.tests, room.currentIndex, room.stepEndedAt);
  return isTimedConnectTest(test) ? timedTestEndsAt(test, room.stepStartedAt) : undefined;
}

export async function scheduleRoomTick(ctx: MutationCtx, room: Room) {
  const at = nextRoomEvent(room);
  if (at === undefined) return;
  await ctx.scheduler.runAt(at, internal.connect.tick, { roomId: room._id, runVersion: room.runVersion });
}

/** Host pacing: moves everyone to `index`, keeping any typing on the step they leave as a result. */
export async function moveRoomTo(ctx: MutationCtx, room: Room, index: number) {
  const previous = room.tests[room.currentIndex];
  await patchParticipants(ctx, room._id, (p) => ({
    ...clearedAttempt(),
    stepIndex: index,
    results: previous && !isBreakTest(previous) && hasActivity(p.stats) ? withResult(p.results, room.currentIndex, previous.id, p.stats) : p.results,
  }));
  const next: Room = {
    ...room, currentIndex: index, runVersion: room.runVersion + 1,
    status: index >= room.tests.length ? "complete" : "running", stepStartedAt: Date.now(), pausedAt: undefined, stepEndedAt: undefined,
  };
  await ctx.db.patch(room._id, {
    currentIndex: next.currentIndex, runVersion: next.runVersion, status: next.status,
    stepStartedAt: next.stepStartedAt, pausedAt: undefined, stepEndedAt: undefined,
  });
  await scheduleRoomTick(ctx, next);
}

/** Host pacing: the current test is over for everyone, so results (and any following break) begin. */
export async function endRoomStep(ctx: MutationCtx, room: Room, now = Date.now()) {
  await ctx.db.patch(room._id, { stepEndedAt: now });
  await scheduleRoomTick(ctx, { ...room, stepEndedAt: now });
}

/** Host pacing: an untimed test ends once everyone taking part has finished it. */
export async function endRoomStepIfAllFinished(ctx: MutationCtx, room: Room) {
  if (room.pacing !== "host" || room.status !== "running" || room.stepEndedAt !== undefined) return;
  const test = room.tests[room.currentIndex];
  if (!test || isBreakTest(test) || isGoalTest(test) || isTimedConnectTest(test)) return;
  const taking = (await listParticipants(ctx, room._id)).filter((p) =>
    p.removedAt === undefined && p.leftAt === undefined && p.isConnected && !isWaitingForNextTest(room, p));
  if (taking.length === 0 || !taking.every((p) => p.stats.isFinished)) return;
  await endRoomStep(ctx, room);
}

const dueAtOf = (room: Room) => room.goalTally?.runVersion === room.runVersion ? room.goalTally.dueAt : 0;

/**
 * Word goals: asks for a tally unless one is already due. A due tally reads the room after `dueAt`, so it
 * includes every report before then, and any report after then asks for another. Nothing is lost between them.
 */
export async function scheduleGoalTally(ctx: MutationCtx, room: Room, now = Date.now()) {
  if (!isGoalTest(room.tests[room.currentIndex]) || dueAtOf(room) > now) return;
  const dueAt = now + CONNECT_GOAL_TALLY_MS;
  await ctx.db.patch(room._id, { goalTally: { runVersion: room.runVersion, words: goalWords(room), dueAt } });
  await ctx.scheduler.runAt(dueAt, internal.connect.tallyGoal, { roomId: room._id, runVersion: room.runVersion });
}

/**
 * Word goals: saves a new total and, because a changing total means people are typing, books the next tally in the
 * same write. So a busy room writes once a second, and an unchanged total writes nothing at all.
 */
export async function publishGoalWords(ctx: MutationCtx, room: Room, words: number, now = Date.now()) {
  if (words === goalWords(room)) return room;
  const keepsSlot = dueAtOf(room) > now;
  const dueAt = keepsSlot ? dueAtOf(room) : now + CONNECT_GOAL_TALLY_MS;
  const goalTally = { runVersion: room.runVersion, words, dueAt };
  await ctx.db.patch(room._id, { goalTally });
  if (!keepsSlot) await ctx.scheduler.runAt(dueAt, internal.connect.tallyGoal, { roomId: room._id, runVersion: room.runVersion });
  return { ...room, goalTally };
}

/** Word goals: the room reached its total, so results begin for everyone. A paused room waits until it resumes. */
export async function endRoomStepIfGoalReached(ctx: MutationCtx, room: Room) {
  if (room.pacing !== "host" || room.status !== "running" || room.stepEndedAt !== undefined) return;
  const test = room.tests[room.currentIndex];
  if (!test || !isGoalTest(test) || goalWords(room) < test.wordTarget) return;
  await endRoomStep(ctx, room);
}
