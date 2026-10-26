import type { BoardPrefs } from "@/hooks/useConnectBoardPrefs";
import type { ConnectPacing, ConnectResult, ConnectRoomStatus, ConnectStats, ConnectTest } from "@/lib/connect-types";
import { breakEndsAt, isBreakTest, isTimedConnectTest, isWaitingForNextTest } from "@/lib/connect-types";
import { effectiveStep } from "@/lib/connect-settings";

/** The parts of a room the board derives participant state from. */
export type BoardRoom = {
  pacing: ConnectPacing;
  status: ConnectRoomStatus;
  currentIndex: number;
  runVersion: number;
  tests: ConnectTest[];
  stepStartedAt?: number;
  pausedAt?: number;
};

/** The parts of a participant the board derives state from. */
export type BoardParticipant = {
  _id: string;
  name: string;
  isConnected: boolean;
  joinedAt: number;
  leftAt?: number;
  stepIndex: number;
  stats: ConnectStats;
  results: ConnectResult[];
  completedAt?: number;
  stepStartedAt?: number;
  lateForRun?: number;
};

export type BoardStatus = "waiting" | "late" | "typing" | "finished" | "break" | "done" | "paused" | "offline" | "left";

export const BOARD_STATUS_LABELS: Record<BoardStatus, string> = {
  waiting: "Waiting",
  late: "Joins next test",
  typing: "Typing",
  finished: "Finished test",
  break: "On a break",
  done: "All done",
  paused: "Paused",
  offline: "Offline",
  left: "Left",
};

export const hasActivity = (stats: ConnectStats) => stats.timeElapsed > 0 || stats.progress > 0 || stats.wordsTyped > 0;

export const isAway = (participant: Pick<BoardParticipant, "isConnected" | "leftAt">) =>
  participant.leftAt !== undefined || !participant.isConnected;

/** Index of the test this participant is on; `tests.length` once they have finished the list. */
export function effectiveTestIndex(room: BoardRoom, participant: Pick<BoardParticipant, "stepIndex" | "completedAt">) {
  if (room.status === "complete") return room.tests.length;
  if (room.pacing === "participant" && participant.completedAt !== undefined) return room.tests.length;
  const index = effectiveStep(room.pacing, room.currentIndex, participant.stepIndex);
  return Math.max(0, Math.min(index, room.tests.length));
}

export function isAllDone(room: BoardRoom, participant: Pick<BoardParticipant, "stepIndex" | "completedAt">) {
  return room.status !== "lobby" && effectiveTestIndex(room, participant) >= room.tests.length;
}

export function onBreak(room: BoardRoom, participant: Pick<BoardParticipant, "stepIndex" | "completedAt">) {
  return room.status !== "lobby" && isBreakTest(room.tests[effectiveTestIndex(room, participant)]);
}

/** Milliseconds left in the participant's break, frozen while the room is paused. */
export function breakRemaining(room: BoardRoom, participant: Pick<BoardParticipant, "stepIndex" | "completedAt" | "stepStartedAt">, now = Date.now()) {
  const test = room.tests[effectiveTestIndex(room, participant)];
  if (!test) return 0;
  const startedAt = (room.pacing === "host" ? room.stepStartedAt : participant.stepStartedAt) ?? now;
  return Math.max(0, breakEndsAt(test, startedAt, room.status === "paused" ? room.pausedAt : undefined, now) - now);
}

export function participantStatus(room: BoardRoom, participant: BoardParticipant): BoardStatus {
  if (participant.leftAt !== undefined) return "left";
  if (!participant.isConnected) return "offline";
  if (room.status === "lobby") return "waiting";
  if (isAllDone(room, participant)) return "done";
  if (isWaitingForNextTest(room, participant)) return "late";
  if (room.status === "paused") return "paused";
  if (onBreak(room, participant)) return "break";
  if (participant.stats.isFinished) return "finished";
  if (hasActivity(participant.stats)) return "typing";
  return "waiting";
}

export type ProgressDetail = {
  /** 0–100 */
  percent: number;
  label: string;
};

export function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const clamp = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

/** Progress through the current test: time remaining, words typed, or percent. */
export function progressDetail(room: BoardRoom, participant: BoardParticipant, now = Date.now()): ProgressDetail {
  if (room.status === "lobby") return { percent: 0, label: "Not started" };
  if (isAllDone(room, participant)) return { percent: 100, label: "All tests done" };
  if (isWaitingForNextTest(room, participant)) return { percent: 0, label: "Joins next test" };
  const test = room.tests[effectiveTestIndex(room, participant)];
  if (isBreakTest(test)) {
    const remaining = breakRemaining(room, participant, now);
    const total = test!.duration * 1000;
    return { percent: clamp(((total - remaining) / total) * 100), label: `Break · ${formatClock(remaining)} left` };
  }
  const { stats } = participant;
  if (!test) return { percent: clamp(stats.progress), label: `${Math.round(clamp(stats.progress))}%` };
  if (isTimedConnectTest(test)) {
    const total = test.duration * 1000;
    if (stats.isFinished) return { percent: 100, label: "Time's up" };
    return { percent: clamp((stats.timeElapsed / total) * 100), label: `${formatClock(total - stats.timeElapsed)} left` };
  }
  if (test.mode === "words") {
    const typed = Math.min(stats.wordsTyped, test.wordTarget);
    const percent = stats.isFinished ? 100 : clamp((typed / test.wordTarget) * 100);
    return { percent, label: `${stats.isFinished ? test.wordTarget : typed}/${test.wordTarget} words` };
  }
  const percent = stats.isFinished ? 100 : clamp(stats.progress);
  return { percent, label: `${Math.round(percent)}%` };
}

/** Average over results that recorded any typing. */
export function averageResults(results: ConnectResult[]) {
  const counted = results.filter((result) => result.timeElapsed > 0 || result.progress > 0);
  if (counted.length === 0) return null;
  const sum = counted.reduce((total, result) => ({ wpm: total.wpm + result.wpm, accuracy: total.accuracy + result.accuracy }), { wpm: 0, accuracy: 0 });
  return { wpm: sum.wpm / counted.length, accuracy: sum.accuracy / counted.length, count: counted.length };
}

/** The headline stats: the live attempt, or the run average once the participant is done. */
export function headlineStats(room: BoardRoom, participant: BoardParticipant) {
  if ((isAllDone(room, participant) || onBreak(room, participant)) && !hasActivity(participant.stats)) {
    const average = averageResults(participant.results);
    if (average) return { wpm: average.wpm, accuracy: average.accuracy, isAverage: true };
  }
  return { wpm: participant.stats.wpm, accuracy: participant.stats.accuracy, isAverage: false };
}

export type SegmentState = "done" | "current" | "upcoming";

/** One state per test for the progress strip. */
export function testSegments(room: BoardRoom, participant: Pick<BoardParticipant, "stepIndex" | "completedAt">): SegmentState[] {
  const current = room.status === "lobby" ? -1 : effectiveTestIndex(room, participant);
  return room.tests.map((_, index) => index < current ? "done" : index === current ? "current" : "upcoming");
}

function sortValue(room: BoardRoom, participant: BoardParticipant, sort: BoardPrefs["sort"]) {
  if (sort === "wpm") return headlineStats(room, participant).wpm;
  if (sort === "accuracy") return headlineStats(room, participant).accuracy;
  if (sort === "progress") return effectiveTestIndex(room, participant) * 1000 + progressDetail(room, participant).percent;
  return participant.joinedAt;
}

/**
 * Board order: present participants first (offline/left always last), then the chosen sort.
 * Custom order follows `customOrder`; unknown participants keep join order after it.
 */
export function sortParticipants<T extends BoardParticipant>(room: BoardRoom, participants: T[], prefs: Pick<BoardPrefs, "sort" | "descending" | "customOrder">) {
  const custom = new Map(prefs.customOrder.map((id, index) => [id, index]));
  const direction = prefs.descending && prefs.sort !== "custom" ? -1 : 1;
  const compare = (a: T, b: T) => {
    if (prefs.sort === "name") return a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
    if (prefs.sort === "custom") {
      const left = custom.get(a._id) ?? Number.MAX_SAFE_INTEGER;
      const right = custom.get(b._id) ?? Number.MAX_SAFE_INTEGER;
      return left - right;
    }
    return sortValue(room, a, prefs.sort) - sortValue(room, b, prefs.sort);
  };
  return [...participants].sort((a, b) =>
    Number(isAway(a)) - Number(isAway(b)) || direction * compare(a, b) || a.joinedAt - b.joinedAt);
}

export function visibleParticipants<T extends BoardParticipant>(room: BoardRoom, participants: T[], prefs: Pick<BoardPrefs, "sort" | "descending" | "customOrder" | "showOffline">) {
  const shown = prefs.showOffline ? participants : participants.filter((participant) => !isAway(participant));
  return sortParticipants(room, shown, prefs);
}

/** Moves `activeId` to `overId`'s position and returns the full id order to persist. */
export function reorderIds(ids: string[], activeId: string, overId: string) {
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from === -1 || to === -1 || from === to) return ids;
  const next = [...ids];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

/** Room-wide counts for the board header. */
export function boardCounts(room: BoardRoom, participants: BoardParticipant[]) {
  let online = 0;
  let finished = 0;
  let typing = 0;
  let done = 0;
  for (const participant of participants) {
    if (isAway(participant)) continue;
    online += 1;
    const status = participantStatus(room, participant);
    if (status === "finished" || status === "done") finished += 1;
    if (status === "typing") typing += 1;
    if (status === "done") done += 1;
  }
  return { online, finished, typing, done, total: participants.length };
}
