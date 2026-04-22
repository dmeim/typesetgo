import { useSyncExternalStore } from "react";

const breakpoints = [
  { query: "(min-width: 1280px)", columns: 4 },
  { query: "(min-width: 1024px)", columns: 3 },
  { query: "(min-width: 640px)", columns: 2 },
];

function getColumns(): number {
  for (const bp of breakpoints) {
    if (window.matchMedia(bp.query).matches) return bp.columns;
  }
  return 1;
}

function subscribe(callback: () => void): () => void {
  const mediaLists = breakpoints.map((bp) => window.matchMedia(bp.query));
  for (const ml of mediaLists) ml.addEventListener("change", callback);
  return () => {
    for (const ml of mediaLists) ml.removeEventListener("change", callback);
  };
}

export function useGridColumns(): number {
  return useSyncExternalStore(subscribe, getColumns, () => 4);
}
