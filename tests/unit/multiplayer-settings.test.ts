import { MAX_DURATION_SECONDS, MAX_WORD_TARGET, MAX_PRESET_TEXT_LENGTH, MAX_GHOST_SPEED, TEXT_SIZE_MAX } from "../../src/lib/practice-limits";
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
    expect(() => validatePracticeSettings({ ...settings, mode: "preset", presetModeType: "finish",
      presetText: "x".repeat(MAX_PRESET_TEXT_LENGTH + 1) })).toThrow("Preset text");
  });
});

describe("participant executor bounds", () => {
  it("rejects room settings the executor would silently change", () => {
    expect(() => validatePracticeSettings({ ...settings, duration: 30000 })).toThrow("duration");
    expect(() => validatePracticeSettings({ ...settings, duration: 1.5 })).toThrow("duration");
    expect(() => validatePracticeSettings({ ...settings, mode: "words", wordTarget: 10000 })).toThrow("word count");
    expect(() => validatePracticeSettings({ ...settings, typingFontSize: 10 })).toThrow("text size");
    expect(() => validatePracticeSettings({ ...settings, ghostWriterSpeed: 300 })).toThrow("ghost speed");
  });
});

it("accepts shared upper bounds and validates room-owned plan text size", () => {
  expect(() => validatePracticeSettings({ ...settings, duration: MAX_DURATION_SECONDS,
    wordTarget: MAX_WORD_TARGET, ghostWriterSpeed: MAX_GHOST_SPEED, typingFontSize: TEXT_SIZE_MAX })).not.toThrow();
  expect(() => validatePracticeSettings({ ...settings, mode: "plan", planIndex: 0,
    plan: [{ mode: "time", settings: { duration: MAX_DURATION_SECONDS + 1 } }] })).toThrow("duration");
  expect(() => validatePracticeSettings({ ...settings, mode: "plan", planIndex: 0,
    plan: [{ mode: "time", settings: { duration: 30, typingFontSize: 20 } }] })).not.toThrow();
});
