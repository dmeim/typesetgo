import { describe, expect, it } from "vitest";
import { validateTypingSession } from "../../convex/lib/validateSession";

describe("solo server completion validation", () => {
  const validate = (typedText: string, overrides = {}) => validateTypingSession({
    mode: "quote", targetText: "cat dog", eventCount: 10, maxCharsPerSecond: 10, ...overrides,
  }, { typedText, serverElapsedMs: 10000, computedWpm: 30 });
  it("rejects an unfinished final word even if extras meet the raw target length", () => {
    expect(validate("cattt d").isValid).toBe(false);
    expect(validate("cat ").isValid).toBe(false);
    expect(validate("       ").isValid).toBe(false);
  });
  it("accepts a completed final word after submitted earlier omissions or extras", () => {
    expect(validate("c dog").isValid).toBe(true);
    expect(validate("cattt dog").isValid).toBe(true);
    expect(validate("c dog", { mode: "preset" }).isValid).toBe(true);
  });
  it("still rejects insufficient progress or excessive bursts", () => {
    expect(validate("c dog", { eventCount: 0 }).isValid).toBe(false);
    expect(validate("c dog", { maxCharsPerSecond: 100 }).isValid).toBe(false);
  });
});
