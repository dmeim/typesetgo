import { useEffect, useState, useSyncExternalStore } from "react";

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

function createClockStore(initialElapsedMs: number) {
  const clock = createPracticeClock(initialElapsedMs);
  const listeners = new Set<() => void>();
  let snapshot = initialElapsedMs;
  const publish = () => {
    const next = clock.read();
    if (next === snapshot) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    read: clock.read,
    start: clock.start,
    pause() { clock.pause(); publish(); },
    reset() { clock.reset(); publish(); },
    publish,
  };
}

export function usePracticeClock(running: boolean, initialElapsedMs = 0) {
  const [clock] = useState(() => createClockStore(initialElapsedMs));
  const elapsedMs = useSyncExternalStore(clock.subscribe, clock.getSnapshot, clock.getSnapshot);
  useEffect(() => {
    if (!running) { clock.pause(); return; }
    clock.start();
    const interval = setInterval(clock.publish, 100);
    return () => { clearInterval(interval); clock.pause(); };
  }, [clock, running]);
  return { elapsedMs, readElapsed: clock.read, resetClock: clock.reset };
}
