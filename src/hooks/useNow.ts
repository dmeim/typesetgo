import { useEffect, useState } from "react";

/** The current time, refreshed every `intervalMs` while `active`. */
export function useNow(active: boolean, intervalMs = 500) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    // Catch up at once after being inactive, then keep ticking.
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, intervalMs);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [active, intervalMs]);
  return now;
}
