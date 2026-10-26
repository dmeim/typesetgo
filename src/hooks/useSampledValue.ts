import { useEffect, useRef, useState } from "react";

/** Reads a fast-changing value at a fixed interval so animated readouts can settle between updates. */
export function useSampledValue<T>(value: T, intervalMs: number): T {
  const [sampled, setSampled] = useState(value);
  const latest = useRef(value);

  useEffect(() => {
    latest.current = value;
  });

  useEffect(() => {
    const timer = window.setInterval(() => setSampled(latest.current), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return sampled;
}
