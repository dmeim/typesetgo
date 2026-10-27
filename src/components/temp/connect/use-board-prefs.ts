// Board layout for the mockup, shared with a popped-out board through localStorage like the real board.
import { useCallback, useSyncExternalStore } from "react";

export type BoardSort = "join" | "name" | "wpm" | "accuracy" | "progress" | "custom";

export interface BoardPrefs {
  layout: "cards" | "list";
  sort: BoardSort;
  descending: boolean;
  /** Card scale, 0.8 to 1.6. */
  cardSize: number;
  customOrder: string[];
  showOffline: boolean;
}

export const DEFAULT_BOARD_PREFS: BoardPrefs = { layout: "cards", sort: "join", descending: false, cardSize: 1, customOrder: [], showOffline: true };
export const CARD_SIZE = { min: 0.8, max: 1.6, step: 0.1 };

// Scores read best highest-first; names and join order read first-to-last.
export const DEFAULT_DESCENDING: Record<BoardSort, boolean> = { join: false, name: false, wpm: true, accuracy: true, progress: true, custom: false };

const KEY = "typesetgo_temp_connect_board";
const listeners = new Set<() => void>();
let memory: string | null = null;
let cached: { raw: string | null; value: BoardPrefs } | null = null;

function readRaw() {
  try { return localStorage.getItem(KEY); } catch { return memory; }
}

function read(): BoardPrefs {
  const raw = readRaw();
  if (cached && cached.raw === raw) return cached.value;
  let value = DEFAULT_BOARD_PREFS;
  try { if (raw) value = { ...DEFAULT_BOARD_PREFS, ...JSON.parse(raw) as Partial<BoardPrefs> }; } catch { /* Corrupt prefs fall back to defaults. */ }
  cached = { raw, value };
  return value;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // The storage event carries the host tab's changes into a popped-out board.
  const onStorage = (event: StorageEvent) => { if (event.key === KEY) listener(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}

export function useBoardPrefs() {
  const prefs = useSyncExternalStore(subscribe, read, () => DEFAULT_BOARD_PREFS);
  const update = useCallback((changes: Partial<BoardPrefs>) => {
    const raw = JSON.stringify({ ...read(), ...changes });
    try { localStorage.setItem(KEY, raw); } catch { memory = raw; }
    listeners.forEach((listener) => listener());
  }, []);
  return [prefs, update] as const;
}

export type BoardPrefsState = ReturnType<typeof useBoardPrefs>;
