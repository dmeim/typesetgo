import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import {
  checkLength, checkText, formatInput, parseLength, seedLength, seedText, stepLength,
  type Applied, type LengthKind, type SeedId,
} from "./practice-dialogs-mock";

/** Open state for one surface, the draft it starts from, and focus that returns to the pill chip on close. */
export function useSurface(initialSeed: SeedId | null) {
  const [seed, setSeed] = useState<SeedId | null>(initialSeed);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const open = useCallback((next: SeedId = "current") => setSeed(next), []);
  const close = useCallback((restoreFocus = true) => {
    setSeed(null);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);
  return { isOpen: seed !== null, seed: seed ?? "current", open, close, triggerRef };
}

export function useLengthDraft(kind: LengthKind, seed: SeedId, applied: Applied) {
  const [raw, setRaw] = useState(() => formatInput(kind, seedLength(kind, seed, applied)));
  const value = parseLength(kind, raw);
  const check = checkLength(kind, value, raw);
  const setValue = useCallback((next: number) => setRaw(formatInput(kind, next)), [kind]);
  const step = (direction: 1 | -1) => setValue(stepLength(kind, value, direction));
  /** Arrow keys step, Enter applies, Escape is left to the surface. */
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>, submit: () => void) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      step(event.key === "ArrowUp" ? 1 : -1);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };
  return { raw, setRaw, value, check, setValue, step, onKeyDown, valid: check.severity !== "error" };
}

export function useTextDraft(seed: SeedId, applied: Applied) {
  const [text, setText] = useState(() => seedText(seed, applied));
  const check = useMemo(() => checkText(text), [text]);
  /** Cmd or Ctrl+Enter applies from inside the text box. */
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>, submit: () => void) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
    }
  };
  return { text, setText, check, onKeyDown, valid: check.severity !== "error" };
}

/** Escape closes; Tab stays inside a modal surface. */
export function surfaceKeys(event: KeyboardEvent<HTMLElement>, close: () => void, trap = false) {
  if (event.key === "Escape") {
    event.stopPropagation();
    close();
    return;
  }
  if (!trap || event.key !== "Tab") return;
  const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), input, textarea, [tabindex]:not([tabindex='-1'])")];
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/** A pointer press outside the surface and its trigger closes it quietly. */
export function useOutsidePointer(surface: RefObject<HTMLElement | null>, trigger: RefObject<HTMLElement | null>, active: boolean, close: (restoreFocus: boolean) => void) {
  useEffect(() => {
    if (!active) return;
    const handle = (event: PointerEvent) => {
      const target = event.target as Node;
      if (surface.current?.contains(target) || trigger.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [surface, trigger, active, close]);
}

/** Tracks an element's width so the mockups can switch to their phone layout inside the frame. */
export function useElementWidth(fallback = 1000) {
  const [width, setWidth] = useState(fallback);
  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}
