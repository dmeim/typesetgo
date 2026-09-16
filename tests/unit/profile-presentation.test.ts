import { describe, expect, it } from "vitest";
import { formatDuration, formatRecordedMetric } from "@/components/stats/profile-presentation";

describe("profile presentation", () => {
  it("distinguishes unrecorded historical measurements from recorded zero", () => {
    expect(formatRecordedMetric(undefined)).toBe("Not recorded");
    expect(formatRecordedMetric(0)).toBe("0");
    expect(formatRecordedMetric(12)).toBe("12");
  });

  it("formats the whole duration without animating separate numeric fragments", () => {
    expect(formatDuration(3_723_000)).toBe("1h 2m");
    expect(formatDuration(65_000)).toBe("1m 5s");
    expect(formatDuration(0)).toBe("0s");
  });
});
