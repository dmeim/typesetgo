import { useEffect, useState } from "react";
import { seedSim, stepSim, TICK_MS, type SimState } from "./board-cards-mock";

/** The pretend room, one step a second while mounted. */
export function useBoardSim(): SimState {
  const [state, setState] = useState(seedSim);
  useEffect(() => {
    const timer = window.setInterval(() => setState(stepSim), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);
  return state;
}
