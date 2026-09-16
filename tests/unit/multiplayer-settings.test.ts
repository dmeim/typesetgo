import { describe, it, expect } from "vitest";
import type { Doc } from "../../convex/_generated/dataModel";
import { validatePracticeSettings } from "../../convex/lib/multiplayer";

const settings: Doc<"rooms">["settings"] = {
  mode: "time", duration: 30, wordTarget: 25, difficulty: "medium", punctuation: false,
  numbers: false, quoteLength: "all", ghostWriterEnabled: false, ghostWriterSpeed: 60,
  soundEnabled: false, typingFontSize: 3.5, textAlign: "left",
};

describe("host-led plan configuration", () => {
  it("validates the selected step rather than interpreting plan as a word test", () => {
    const plan = [{ id: "one", mode: "words", settings: { wordTarget: 10 } },
      { id: "two", mode: "preset", settings: { presetModeType: "time", presetText: "cat dog", duration: 0 } }];
    expect(() => validatePracticeSettings({ ...settings, mode: "plan", plan, planIndex: 0 })).not.toThrow();
    expect(() => validatePracticeSettings({ ...settings, mode: "plan", plan, planIndex: 1 })).toThrow("duration");
    expect(() => validatePracticeSettings({ ...settings, mode: "plan", plan, planIndex: 2 })).toThrow("valid plan step");
    expect(() => validatePracticeSettings({ ...settings, mode: "plan", plan: [], planIndex: 0 })).toThrow();
  });
  it("requires text in both preset submodes and a duration only in time mode", () => {
    expect(() => validatePracticeSettings({ ...settings, mode: "preset", presetModeType: "finish", presetText: "cat", duration: 0 })).not.toThrow();
    expect(() => validatePracticeSettings({ ...settings, mode: "preset", presetModeType: "time", presetText: "cat", duration: 0 })).toThrow("duration");
    expect(() => validatePracticeSettings({ ...settings, mode: "preset", presetModeType: "finish", presetText: " " })).toThrow("preset text");
  });
});
