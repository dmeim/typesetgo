import { describe, expect, it } from "vitest";
import { rankLiveRacers } from "@/components/race/live-racers";
import { formatRaceTime, ordinal, racerColor } from "@/components/race/race-format";
import { MAP_LIMIT, PARK_LIMIT, TRACK_HEIGHT, TRACK_WIDTH, gridSlot, parkSlot, pitSlot, trackPoint } from "@/components/race/track-geometry";

const inBox = ({ x, y }: { x: number; y: number }) => x >= 0 && x <= TRACK_WIDTH && y >= 0 && y <= TRACK_HEIGHT;
// The infield is the straight-sided oval inside the tarmac (see INFIELD_PATH).
const inInfield = ({ x, y }: { x: number; y: number }) => {
  if (y < 31.5 || y > 88.5) return false;
  if (x >= 60 && x <= 140) return true;
  const centre = x < 60 ? 60 : 140;
  return Math.hypot(x - centre, y - 60) <= 28.5;
};

describe("race track geometry", () => {
  it("starts and ends a lap on the start line and stays on the circuit", () => {
    expect(trackPoint(0)).toEqual({ x: 100, y: 100 });
    expect(trackPoint(1)).toEqual({ x: 100, y: 100 });
    for (let step = 0; step <= 100; step++) {
      const point = trackPoint(step / 100);
      expect(inBox(point)).toBe(true);
      expect(inInfield(point)).toBe(false);
    }
  });

  it("lines ready racers up behind the line without two sharing a spot", () => {
    const slots = Array.from({ length: MAP_LIMIT }, (_, index) => gridSlot(index));
    expect(slots[0].x).toBeLessThan(100);
    expect(new Set(slots.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`)).size).toBe(MAP_LIMIT);
    slots.forEach((slot) => expect(inBox(slot)).toBe(true));
  });

  it("centres the pit lane and parked finishers inside the infield", () => {
    expect(pitSlot(0, 1)).toEqual({ x: 100, y: 70 });
    expect(pitSlot(0, 2).x + pitSlot(1, 2).x).toBe(200);
    for (let count = 1; count <= MAP_LIMIT; count++)
      for (let index = 0; index < count; index++) expect(inInfield(pitSlot(index, count))).toBe(true);
    expect(parkSlot(1, 1)).toEqual({ x: 100, y: 52 });
    for (let count = 1; count <= PARK_LIMIT; count++)
      for (let place = 1; place <= count; place++) expect(inInfield(parkSlot(place, count))).toBe(true);
    // A place beyond the finishers still connected (someone left) never lands outside the infield.
    expect(inInfield(parkSlot(3, 1))).toBe(true);
  });
});

describe("race wording and order", () => {
  it("formats places and times", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "101st"]);
    expect(formatRaceTime(20_049)).toBe("20.0s");
    expect(formatRaceTime(59_999)).toBe("59.9s");
    expect(formatRaceTime(65_300)).toBe("1:05.3");
  });

  it("gives you the primary colour and everyone else a stable one", () => {
    expect(racerColor("anyone", true)).toBe("var(--primary)");
    expect(racerColor("other-1", false)).toBe(racerColor("other-1", false));
    expect(racerColor("other-1", false)).not.toBe("var(--primary)");
  });

  it("ranks finishers by position, then everyone else by progress", () => {
    const ranked = rankLiveRacers([
      { id: "slow", isFinished: false, progress: 10 },
      { id: "second", isFinished: true, position: 2, progress: 100 },
      { id: "fast", isFinished: false, progress: 80 },
      { id: "first", isFinished: true, position: 1, progress: 100 },
    ]);
    expect(ranked.map((racer) => racer.id)).toEqual(["first", "second", "fast", "slow"]);
  });
});
