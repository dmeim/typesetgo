import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const motionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia?.(motionQuery);
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

function prefersReducedMotion() {
  return window.matchMedia?.(motionQuery).matches ?? false;
}

/** Return a rounded integer animated from the displayed value, with cancellable work. */
export function useAnimatedCounter(target: number, duration = 1200, delay = 0): number {
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    prefersReducedMotion,
    () => false
  );
  const endValue = Math.round(target);
  const immediate = reducedMotion || duration <= 0 || endValue === 0;
  const [value, setValue] = useState(immediate ? endValue : 0);
  const displayedValueRef = useRef(value);

  // Immediate values are derived during render, without scheduling a stale frame.
  if (immediate && !Object.is(value, endValue)) {
    setValue(endValue);
  }

  useEffect(() => {
    if (immediate) {
      displayedValueRef.current = endValue;
      return;
    }

    const from = displayedValueRef.current;
    let frameId: number | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let startedAt: number | null = null;
    let cancelled = false;

    const step = (timestamp: number) => {
      if (cancelled) return;
      frameId = null;
      if (startedAt === null) startedAt = timestamp;
      const progress = Math.min(Math.max((timestamp - startedAt) / duration, 0), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (endValue - from) * eased);
      displayedValueRef.current = next;
      setValue(next);
      if (progress < 1) frameId = requestAnimationFrame(step);
    };

    if (from !== endValue) {
      if (delay > 0) {
        timeout = setTimeout(() => {
          timeout = null;
          frameId = requestAnimationFrame(step);
        }, delay);
      } else {
        frameId = requestAnimationFrame(step);
      }
    }

    return () => {
      cancelled = true;
      if (timeout !== null) clearTimeout(timeout);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [endValue, duration, delay, immediate]);

  return immediate ? endValue : value;
}
