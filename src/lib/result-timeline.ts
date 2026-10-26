import { calculateAccuracy, calculateWpm } from "@/lib/typing-metrics";

export interface TimelineSample {
  /** Seconds since the test started; the closing sample may be fractional. */
  second: number;
  wpm: number;
  accuracy: number;
  /** Wrong, missed and extra letters in the attempt so far. */
  errors: number;
  /** New errors appeared since the previous sample. */
  mistake: boolean;
}

export interface TimelineReading {
  elapsedMs: number;
  typedLength: number;
  correct: number;
  errors: number;
}

function sample(previous: TimelineSample | undefined, second: number, reading: TimelineReading): TimelineSample {
  return {
    second,
    wpm: Math.round(calculateWpm(reading.typedLength, reading.elapsedMs)),
    accuracy: Math.round(calculateAccuracy(reading.correct, reading.typedLength) * 10) / 10,
    errors: reading.errors,
    mistake: reading.errors > (previous?.errors ?? 0),
  };
}

/** Adds at most one sample per whole second; later readings within the same second are ignored. */
export function recordTimelineSecond(samples: TimelineSample[], reading: TimelineReading): TimelineSample[] {
  const second = Math.floor(reading.elapsedMs / 1000);
  const last = samples.at(-1);
  if (second < 1 || (last && last.second >= second)) return samples;
  return [...samples, sample(last, second, reading)];
}

/** Closes the timeline at the finishing moment, so tests that end mid-second still end where they finished. */
export function finishTimeline(samples: TimelineSample[], reading: TimelineReading): TimelineSample[] {
  const second = Math.round(reading.elapsedMs / 100) / 10;
  const last = samples.at(-1);
  if (second <= (last?.second ?? 0) + 0.2) return samples;
  return [...samples, sample(last, second, reading)];
}
