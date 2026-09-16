import { useCallback, useEffect, useRef, useState } from "react";

export function createPracticeClock(initialElapsedMs = 0, now: () => number = () => performance.now()) {
  let accumulated = initialElapsedMs;
  let startedAt: number | null = null;
  const read = () => accumulated + (startedAt === null ? 0 : Math.max(0, now() - startedAt));
  return {
    read,
    start() { if (startedAt === null) startedAt = now(); },
    pause() { accumulated = read(); startedAt = null; return accumulated; },
    reset() { accumulated = 0; startedAt = null; },
  };
}

export function usePracticeClock(running: boolean, initialElapsedMs = 0) {
  const clockRef = useRef<ReturnType<typeof createPracticeClock> | null>(null);
  if (!clockRef.current) clockRef.current = createPracticeClock(initialElapsedMs);
  const clock = clockRef.current;
  const [elapsedMs, setElapsedMs] = useState(initialElapsedMs);
  const reset = useCallback(() => { clock.reset(); setElapsedMs(0); }, [clock]);
  useEffect(() => {
    if (!running) { setElapsedMs(clock.pause()); return; }
    clock.start();
    const interval = setInterval(() => setElapsedMs(clock.read()), 100);
    return () => { clearInterval(interval); clock.pause(); };
  }, [clock, running]);
  return { elapsedMs, readElapsed: clock.read, resetClock: reset };
}
