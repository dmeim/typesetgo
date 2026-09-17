import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, loadLayoutSettings, loadSettings, saveSettings } from "@/lib/storage-utils";
import { normalizePracticeSettings } from "@/lib/typing-constants";
import { TEXT_SIZE_MIN, TEXT_SIZE_MAX, MAX_DURATION_SECONDS } from "@/components/typing/practice-config";
import { MAX_WORD_TARGET, MAX_GHOST_SPEED } from "../../src/lib/practice-limits";

afterEach(() => localStorage.clear());
describe("practice preference boundaries", () => {
  it("shows the keyboard by default for new and older settings", () => {
    expect(DEFAULT_SETTINGS.showOnScreenKeyboard).toBe(true);
    localStorage.setItem("typesetgo_settings", JSON.stringify({ mode: "words" }));
    expect(loadSettings()?.showOnScreenKeyboard).toBe(true);
  });
  it("preserves an explicitly saved keyboard visibility preference", () => {
    for (const showOnScreenKeyboard of [false, true]) {
      saveSettings({ ...DEFAULT_SETTINGS, presetText: "", showOnScreenKeyboard });
      expect(loadSettings()?.showOnScreenKeyboard).toBe(showOnScreenKeyboard);
    }
  });
  it("uses one supported text range for persisted settings and actual edits", () => {
    expect([TEXT_SIZE_MIN, TEXT_SIZE_MAX]).toEqual([1, 6]);
    localStorage.setItem("typesetgo_settings", JSON.stringify({ typingFontSize: 10 }));
    expect(loadSettings()?.typingFontSize).toBe(6);
    expect(normalizePracticeSettings({ ...DEFAULT_SETTINGS, presetText: "", typingFontSize: 0 }).typingFontSize).toBe(1);
    for (const typingFontSize of [1, 2, 3.25, 5.5, 6]) {
      saveSettings({ ...DEFAULT_SETTINGS, presetText: "", typingFontSize });
      expect(loadSettings()?.typingFontSize).toBe(typingFontSize);
    }
  });
  it("bounds invalid numeric configuration before generating a prompt", () => {
    const settings = normalizePracticeSettings({ ...DEFAULT_SETTINGS, presetText: "", wordTarget: NaN, duration: -1,
      ghostWriterSpeed: Infinity });
    expect(settings.wordTarget).toBe(25);
    expect(settings.duration).toBe(1);
    expect(MAX_DURATION_SECONDS).toBe(25199);
    expect(normalizePracticeSettings({ ...DEFAULT_SETTINGS, presetText: "", duration: 25199 }).duration).toBe(25199);
    expect(settings.ghostWriterSpeed).toBe(40);
    localStorage.setItem("typesetgo_layout", JSON.stringify({ linePreview: 999, maxWordsPerLine: 0 }));
    expect(loadLayoutSettings()).toEqual({ linePreview: 6, maxWordsPerLine: 1 });
  });
  it("retains the shared server-supported maxima and clamps larger preferences to those limits", () => {
    const limits = { duration: MAX_DURATION_SECONDS, wordTarget: MAX_WORD_TARGET,
      typingFontSize: TEXT_SIZE_MAX, ghostWriterSpeed: MAX_GHOST_SPEED };
    const maxSettings = { ...DEFAULT_SETTINGS, presetText: "", ...limits };
    expect(normalizePracticeSettings(maxSettings)).toMatchObject(limits);
    expect(normalizePracticeSettings({ ...maxSettings, duration: MAX_DURATION_SECONDS + 1,
      wordTarget: MAX_WORD_TARGET + 1, typingFontSize: TEXT_SIZE_MAX + 1,
      ghostWriterSpeed: MAX_GHOST_SPEED + 1 })).toMatchObject(limits);
  });
});
