import { fromAccountPreferences, toAccountPreferences } from "@/lib/practice-preferences";
import { calculateAccuracy, calculateWpm } from "@/lib/typing-metrics";
import { afterEach, describe, expect, it, vi } from "vitest";
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


describe("typed practice persistence adapters", () => {
  it("round-trips false and zero-compatible preferences without persisting session contents", () => {
    const settings = { ...DEFAULT_SETTINGS, presetText: "private prompt", mode: "quote" as const,
      soundEnabled: false, showOnScreenKeyboard: false, theme: undefined, planIndex: 4 };
    const preferences = toAccountPreferences(settings, { linePreview: 3, maxWordsPerLine: 7 },
      { themeId: "typesetgo", themeMode: "dark" });
    expect(preferences).not.toHaveProperty("presetText");
    expect(preferences).not.toHaveProperty("planIndex");
    expect(fromAccountPreferences({ ...DEFAULT_SETTINGS, presetText: "" }, preferences)).toMatchObject({
      mode: "quote", soundEnabled: false, showOnScreenKeyboard: false, presetText: "",
    });
    localStorage.setItem("typesetgo_settings", JSON.stringify(settings));
    expect(loadSettings()).toMatchObject({ presetText: "", mode: "quote" });
    expect(loadSettings()).not.toHaveProperty("planIndex");
  });
  it("ignores dormant error sounds from legacy local and account preferences", () => {
    const settings = { ...DEFAULT_SETTINGS, presetText: "" };
    localStorage.setItem("typesetgo_settings", JSON.stringify({ ...settings, errorSound: "legacy" }));
    expect(loadSettings()).not.toHaveProperty("errorSound");
    const preferences = toAccountPreferences(settings, { linePreview: 3, maxWordsPerLine: 7 }, {});
    expect(preferences).not.toHaveProperty("errorSound");
    expect(fromAccountPreferences(settings, { ...preferences, errorSound: "legacy" })).not.toHaveProperty("errorSound");
  });
  it("performs storage reads without an availability write and survives unavailable storage", () => {
    const write = vi.spyOn(Storage.prototype, "setItem");
    loadSettings();
    expect(write).not.toHaveBeenCalled();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const read = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("disabled"); });
    expect(loadSettings()).toBeNull();
    expect(warning).toHaveBeenCalled();
    read.mockRestore(); write.mockRestore(); warning.mockRestore();
  });
  it("keeps gross WPM and accuracy definitions independent of race completion rules", () => {
    expect(calculateWpm(300, 60000)).toBe(60);
    expect(calculateWpm(300, 0)).toBe(0);
    expect(calculateAccuracy(0, 3)).toBe(0);
    expect(calculateAccuracy(0, 0)).toBe(100);
  });
});
