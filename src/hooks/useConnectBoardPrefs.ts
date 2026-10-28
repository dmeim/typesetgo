import { useCallback, useSyncExternalStore } from "react";

export type BoardSort = "join" | "name" | "wpm" | "accuracy" | "progress" | "custom";
/** Grid card designs: the name on a ribbon that fills with progress, or the speed as a big number. */
export type CardStyle = "ribbon" | "big";
export type BoardPrefs = {
  layout: "grid" | "list";
  cardStyle: CardStyle;
  sort: BoardSort;
  descending: boolean;
  cardSize: number;
  customOrder: string[];
  showOffline: boolean;
  /** Account pictures on cards; off shows every player as a letter, e.g. on a projector. */
  showPictures: boolean;
  /** Cards size themselves to fill the window without scrolling; each window (host, pop-out) fits its own. */
  fit: boolean;
};

export const DEFAULT_BOARD_PREFS: BoardPrefs = {
  layout: "grid", cardStyle: "ribbon", sort: "join", descending: false, cardSize: 1, customOrder: [], showOffline: true, showPictures: true, fit: false,
};

const storageKey = (roomId: string) => `typesetgo_connect_board:${roomId}`;
const listeners = new Set<() => void>();
const memory = new Map<string, string>();
const parsed = new Map<string, { raw: string | null; value: BoardPrefs }>();

function readRaw(key: string) {
  try { return localStorage.getItem(key); } catch { return memory.get(key) ?? null; }
}

function read(roomId: string): BoardPrefs {
  const key = storageKey(roomId);
  const raw = readRaw(key);
  const cached = parsed.get(key);
  if (cached && cached.raw === raw) return cached.value;
  let value = DEFAULT_BOARD_PREFS;
  try { if (raw) value = { ...DEFAULT_BOARD_PREFS, ...JSON.parse(raw) as Partial<BoardPrefs> }; } catch { /* Corrupt prefs fall back to defaults. */ }
  parsed.set(key, { raw, value });
  return value;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // The storage event carries changes made by the host tab into pop-outs and other tabs.
  const onStorage = (event: StorageEvent) => { if (event.key?.startsWith("typesetgo_connect_board:")) listener(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}

/** Board layout preferences shared between the host panel and its pop-out board. */
export function useConnectBoardPrefs(roomId: string) {
  const prefs = useSyncExternalStore(subscribe, () => read(roomId), () => DEFAULT_BOARD_PREFS);
  const update = useCallback((changes: Partial<BoardPrefs>) => {
    const raw = JSON.stringify({ ...read(roomId), ...changes });
    try { localStorage.setItem(storageKey(roomId), raw); } catch { memory.set(storageKey(roomId), raw); }
    listeners.forEach((listener) => listener());
  }, [roomId]);
  return [prefs, update] as const;
}
