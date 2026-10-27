// Plain-language status lines shared by the host panel, board and student view.
import { RESULTS_TICKS, average, formatClock, type Kid } from "./connect-mock";
import type { MockRoom } from "./use-mock-room";

export type KidPhase = "waiting" | "typing" | "finished" | "break" | "done" | "offline";

export function kidPhase(room: MockRoom, kid: Kid): KidPhase {
  if (!kid.online) return "offline";
  if (room.status === "lobby") return "waiting";
  const test = room.tests[room.stepOf(kid)];
  if (room.status === "complete" || !test) return "done";
  if (test.mode === "break") return "break";
  return kid.finished ? "finished" : "typing";
}

export const PHASE_LABELS: Record<KidPhase, string> = {
  waiting: "Ready",
  typing: "Typing",
  finished: "Finished",
  break: "On a break",
  done: "All done",
  offline: "Offline",
};

/** Live numbers while typing, the run average otherwise. */
export function kidStats(room: MockRoom, kid: Kid) {
  const phase = kidPhase(room, kid);
  if ((phase === "typing" || phase === "finished") && kid.wpm > 0) return { wpm: kid.wpm, accuracy: kid.accuracy, isAverage: false };
  const avg = average(kid.results);
  return avg ? { ...avg, isAverage: true } : null;
}

/** How far through the current test a player is, as 0–100. */
export function kidProgress(room: MockRoom, kid: Kid) {
  const phase = kidPhase(room, kid);
  if (phase === "done") return 100;
  if (phase === "break") {
    const test = room.tests[room.stepOf(kid)];
    const ticks = room.pacing === "host" ? room.stepTicks : kid.stepTicks;
    return Math.min(100, (ticks / (test?.seconds ?? 10)) * 100);
  }
  return kid.progress;
}

/** Host-led: what the room is waiting on before it moves on by itself. */
export function stepLine(room: MockRoom) {
  const test = room.tests[room.index];
  if (!test) return "";
  if (test.mode === "break") return `Break, next test in ${formatClock((test.seconds ?? 10) - room.stepTicks)}`;
  if (room.resultsTicks !== null) return `Results, ${room.index + 1 >= room.tests.length ? "finishing" : "next test"} in ${formatClock(RESULTS_TICKS - room.resultsTicks)}`;
  if (test.mode === "time") return `Ends in ${formatClock((test.seconds ?? 30) - room.stepTicks)}`;
  const online = room.kids.filter((kid) => kid.online);
  return `${online.filter((kid) => kid.finished).length} of ${online.length} finished`;
}

/** Self-paced: how many players are on each test, plus how many finished everything. */
export function selfPacedCounts(room: MockRoom) {
  const perTest = room.tests.map(() => 0);
  let done = 0;
  for (const kid of room.kids) {
    if (!kid.online) continue;
    if (kid.step >= room.tests.length) done += 1;
    else perTest[kid.step] += 1;
  }
  return { perTest, done };
}

export type BoardSort = "join" | "wpm" | "accuracy" | "progress" | "name";

/** Board order; offline players always sink to the bottom. */
export function sortKids(room: MockRoom, sort: BoardSort): Kid[] {
  const score = (kid: Kid) => {
    const stats = kidStats(room, kid);
    if (sort === "wpm") return stats?.wpm ?? -1;
    if (sort === "accuracy") return stats?.accuracy ?? -1;
    if (sort === "progress") return room.stepOf(kid) * 100 + kidProgress(room, kid);
    return 0;
  };
  const order = room.kids.map((kid, index) => ({ kid, index, score: score(kid) }));
  order.sort((a, b) => {
    if (a.kid.online !== b.kid.online) return a.kid.online ? -1 : 1;
    if (sort === "name") return a.kid.name.localeCompare(b.kid.name);
    if (sort === "join") return a.index - b.index;
    return b.score - a.score || a.index - b.index;
  });
  return order.map((entry) => entry.kid);
}

/** The fastest player with live or average numbers, if anyone has typed yet. */
export function leaderId(room: MockRoom) {
  let best: { id: string; wpm: number } | null = null;
  for (const kid of room.kids) {
    const stats = kid.online ? kidStats(room, kid) : null;
    if (stats && (!best || stats.wpm > best.wpm)) best = { id: kid.id, wpm: stats.wpm };
  }
  return best?.id ?? null;
}
