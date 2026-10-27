// Queue for the full-screen "Achievement unlocked" moment. `useNotify` adds to it; the one
// `AchievementCelebration` host mounted by the app plays it. Kept outside React like the toast manager.
import { useEffect, useSyncExternalStore } from "react";

export interface QueuedCelebration {
  key: string;
  achievementId: string;
  /** The notification-history entry it announces, marked read once seen. */
  notificationId?: string;
  /** When it was earned, so the ladder shows it before the saved data catches up. */
  earnedAt: number;
}

export interface CelebrationState {
  queue: QueuedCelebration[];
  /** How many of the current run were already shown, for "2 of 3". */
  shown: number;
  /** While anything holds (a test in progress), the queue waits. */
  holds: number;
  hosts: number;
}

let state: CelebrationState = { queue: [], shown: 0, holds: 0, hosts: 0 };
const listeners = new Set<() => void>();
let counter = 0;

function update(change: (previous: CelebrationState) => CelebrationState) {
  state = change(state);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;

/**
 * Queues the celebration for an achievement. Returns false when no host is mounted (the caller then
 * falls back to a toast). An achievement already waiting is not queued twice.
 */
export function celebrateAchievement(item: Omit<QueuedCelebration, "key" | "earnedAt"> & { earnedAt?: number }): boolean {
  if (state.hosts === 0) return false;
  if (state.queue.some((queued) => queued.achievementId === item.achievementId)) return true;
  const entry = { ...item, earnedAt: item.earnedAt ?? Date.now(), key: `celebration-${++counter}` };
  update((previous) => ({ ...previous, queue: [...previous.queue, entry] }));
  return true;
}

/** The current celebration was seen: move on to the next one. */
export function nextCelebration() {
  update((previous) => {
    const queue = previous.queue.slice(1);
    return { ...previous, queue, shown: queue.length ? previous.shown + 1 : 0 };
  });
}

/** Drop everything still waiting (Skip, Escape, or a different account). */
export function clearCelebrations() {
  if (!state.queue.length && !state.shown) return;
  update((previous) => ({ ...previous, queue: [], shown: 0 }));
}

/** Marks a mounted host; returns its unregister function. */
export function registerCelebrationHost() {
  update((previous) => ({ ...previous, hosts: previous.hosts + 1 }));
  return () => update((previous) => ({ ...previous, hosts: previous.hosts - 1, ...(previous.hosts === 1 ? { queue: [], shown: 0 } : {}) }));
}

/** Holds the queue while `active` (e.g. the practice header hides during a test). */
export function useHoldCelebrations(active: boolean) {
  useEffect(() => {
    if (!active) return;
    update((previous) => ({ ...previous, holds: previous.holds + 1 }));
    return () => update((previous) => ({ ...previous, holds: previous.holds - 1 }));
  }, [active]);
}

export function useCelebrationQueue() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
