/** A racer as the live track and standings draw them. */
export interface LiveRacer {
  id: string;
  name: string;
  emoji: string;
  color: string;
  /** 0–100, as stored on the participant. */
  progress: number;
  wpm: number;
  isFinished: boolean;
  isYou: boolean;
  /** Stable lane from join order, so racers don't swap lanes as they overtake. */
  lane: number;
  place: number;
}

/** Finished racers first in finishing order, then everyone else by how far round they are. */
export function rankLiveRacers<T extends { isFinished: boolean; position?: number; progress: number }>(racers: T[]) {
  return [...racers].sort((a, b) => {
    if (a.isFinished !== b.isFinished) return a.isFinished ? -1 : 1;
    return a.isFinished ? (a.position ?? Infinity) - (b.position ?? Infinity) : b.progress - a.progress;
  });
}
