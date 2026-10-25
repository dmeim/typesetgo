import type { ConnectTest } from "@/lib/connect-types";
import { describeConnectTest, isTimedConnectTest } from "@/lib/connect-types";

function clock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Participant-facing detail: timed tests of a minute or more read as a clock ("Time · 5:00"). */
export function participantTestDetail(test: ConnectTest) {
  if (!isTimedConnectTest(test) || test.duration < 60) return describeConnectTest(test);
  return test.mode === "time" ? `Time · ${clock(test.duration)}` : `Custom text · ${clock(test.duration)}`;
}

export type TestPhase = "done" | "current" | "upcoming";

export function testPhase(index: number, currentIndex: number): TestPhase {
  return index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
}
