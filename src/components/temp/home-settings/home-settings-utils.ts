import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { findVariant, type ThemeSelection } from "@/components/profile/theme-catalog";
import type { ThemeCatalogEntry } from "@/types/theme";

/** Moves focus into a surface when it opens and closes it on Escape. */
export function useSurface<T extends HTMLElement>(open: boolean, close: () => void, ready = true) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (open && ready) ref.current?.focus({ preventScroll: true });
  }, [open, ready]);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    close();
  };
  return [ref, onKeyDown] as const;
}

export function pickTheme(entry: ThemeCatalogEntry, current: ThemeSelection): ThemeSelection {
  const variant = findVariant(entry, entry.defaultVariantId);
  return { themeId: entry.id, variantId: entry.defaultVariantId, mode: current.mode === "light" && variant?.light ? "light" : "dark" };
}


export interface AnchorBox {
  anchor: string;
  left: number;
  top: number;
  bottom: number;
  centre: number;
  stageWidth: number;
  stageHeight: number;
}

/** Where a Home button sits inside the stage, re-measured while the stage resizes. */
export function useAnchor(stageRef: RefObject<HTMLDivElement | null>, anchor: string, active: boolean) {
  const [box, setBox] = useState<AnchorBox | null>(null);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !active) return;
    const measure = () => {
      const button = stage.querySelector<HTMLElement>(`[data-anchor="${anchor}"]`);
      if (!button) return;
      const outer = stage.getBoundingClientRect();
      const inner = button.getBoundingClientRect();
      setBox({
        anchor,
        left: inner.left - outer.left,
        top: inner.top - outer.top,
        bottom: inner.bottom - outer.top,
        centre: inner.left - outer.left + inner.width / 2,
        stageWidth: outer.width,
        stageHeight: outer.height,
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [stageRef, anchor, active]);
  return box?.anchor === anchor ? box : null;
}
