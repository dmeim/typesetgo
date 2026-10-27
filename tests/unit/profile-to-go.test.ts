import { describe, expect, it } from "vitest";
import { toGo, type Ladder, type LadderStep } from "@/components/profile/profile-stats";

const ladder = (value: number, unit: string) => ({ current: { value, unit, label: "" } }) as Ladder;
const step = (target: number) => ({ achievement: { target } }) as LadderStep;

describe("toGo", () => {
  it("uses the singular for a gap of one", () => {
    expect(toGo(ladder(6, "days"), step(7))).toBe("1 day to go");
    expect(toGo(ladder(9, "tests"), step(10))).toBe("1 test to go");
  });

  it("keeps plurals and units that never change", () => {
    expect(toGo(ladder(5, "days"), step(7))).toBe("2 days to go");
    expect(toGo(ladder(69, "WPM"), step(70))).toBe("1 WPM to go");
  });

  it("says almost there once the target is reached", () => {
    expect(toGo(ladder(7, "days"), step(7))).toBe("Almost there");
  });
});
