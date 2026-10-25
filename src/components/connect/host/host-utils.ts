import type { HostParticipant, HostRoom } from "@/components/connect/types";
import type { ConnectRoomStatus } from "@/lib/connect-types";

/** Highest test index that can't be edited (mirrors the server's locked-prefix rule). */
export function lockedThrough(room: Pick<HostRoom, "status" | "pacing" | "currentIndex">, participants: Pick<HostParticipant, "stepIndex">[]) {
  if (room.status === "lobby") return -1;
  if (room.pacing === "host") return room.currentIndex;
  return participants.reduce((max, p) => Math.max(max, p.stepIndex), -1);
}

export type TestState = "done" | "current" | "upcoming";

/** List highlighting for host pacing; self-paced rooms show per-test counts instead. */
export function hostPacedTestState(index: number, status: ConnectRoomStatus, currentIndex: number): TestState {
  if (status === "lobby") return "upcoming";
  if (status === "complete" || index < currentIndex) return "done";
  return index === currentIndex ? "current" : "upcoming";
}

/** How many participants are on each test, plus how many have finished every test. */
export function selfPacedCounts(testCount: number, participants: Pick<HostParticipant, "stepIndex" | "completedAt">[]) {
  const perTest = Array.from({ length: testCount }, () => 0);
  let done = 0;
  for (const participant of participants) {
    if (participant.completedAt !== undefined || participant.stepIndex >= testCount) done += 1;
    else if (participant.stepIndex >= 0) perTest[participant.stepIndex] += 1;
  }
  return { perTest, done };
}

export const STATUS_LABELS: Record<ConnectRoomStatus, string> = {
  lobby: "Lobby",
  running: "Running",
  paused: "Paused",
  complete: "Complete",
};

/** "1:30" for 90 seconds; whole minutes keep the ":00". */
export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** Accepts "90", "1:30", or "1m 30s"; returns null when unparseable. */
export function parseDuration(value: string): number | null {
  const text = value.trim().toLowerCase();
  if (!text) return null;
  const clock = /^(\d{1,3}):([0-5]?\d)$/.exec(text);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const units = /^(?:(\d{1,3})\s*m(?:in)?)?\s*(?:(\d{1,4})\s*s(?:ec)?)?$/.exec(text);
  if (units && (units[1] || units[2])) return Number(units[1] ?? 0) * 60 + Number(units[2] ?? 0);
  if (/^\d{1,5}$/.test(text)) return Number(text);
  return null;
}
