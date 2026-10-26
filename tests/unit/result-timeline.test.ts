import { describe, expect, it } from "vitest";
import { finishTimeline, recordTimelineSecond } from "@/lib/result-timeline";

describe("result timeline", () => {
  it("samples once per whole second and marks seconds where errors grew", () => {
    let samples = recordTimelineSecond([], { elapsedMs: 600, typedLength: 3, correct: 3, errors: 0 });
    expect(samples).toEqual([]);
    samples = recordTimelineSecond(samples, { elapsedMs: 1_000, typedLength: 5, correct: 5, errors: 0 });
    samples = recordTimelineSecond(samples, { elapsedMs: 1_400, typedLength: 7, correct: 6, errors: 1 });
    samples = recordTimelineSecond(samples, { elapsedMs: 2_050, typedLength: 10, correct: 9, errors: 1 });
    samples = recordTimelineSecond(samples, { elapsedMs: 3_000, typedLength: 15, correct: 13, errors: 2 });
    expect(samples).toEqual([
      { second: 1, wpm: 60, accuracy: 100, errors: 0, mistake: false },
      { second: 2, wpm: 59, accuracy: 90, errors: 1, mistake: true },
      { second: 3, wpm: 60, accuracy: 86.7, errors: 2, mistake: true },
    ]);
  });

  it("closes with the finishing moment unless it lands on the last sample", () => {
    const samples = recordTimelineSecond([], { elapsedMs: 1_000, typedLength: 5, correct: 5, errors: 0 });
    expect(finishTimeline(samples, { elapsedMs: 1_150, typedLength: 6, correct: 6, errors: 0 })).toBe(samples);
    expect(finishTimeline(samples, { elapsedMs: 1_640, typedLength: 8, correct: 7, errors: 1 }).at(-1))
      .toEqual({ second: 1.6, wpm: 59, accuracy: 87.5, errors: 1, mistake: true });
  });
});
