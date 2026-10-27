import { useState } from "react";
import { fireEvent, render, screen, cleanup, within, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PracticeControls from "@/components/typing/PracticeControls";
import { TIME_PRESETS, WORD_PRESETS } from "@/components/typing/practice-config";
import type { PracticeEditor } from "@/components/typing/practice-custom";
import OnScreenKeyboard from "@/components/typing/keyboard/OnScreenKeyboard";
import { contrastRatio, deriveThemeUI } from "@/lib/colors";
import { MAX_PRESET_TEXT_LENGTH, MAX_WORD_TARGET } from "@/lib/practice-limits";
import PracticeResults from "@/components/typing/PracticeResults";
import { MAX_DURATION_SECONDS, normalizePracticeSettings, type SettingsState } from "@/lib/typing-constants";
import theme from "../../public/themes/typesetgo.json";

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    colors: theme.variants.default.dark,
    themeName: "TypeSetGo",
    themeId: "typesetgo",
    variantId: "default",
    mode: "dark",
    setTheme: vi.fn(),
    setThemeSelection: vi.fn(),
  }),
}));
vi.mock("@/hooks/useAnimatedCounter", () => ({
  useAnimatedCounter: (value: number) => value,
}));

let resizeCallbacks: ResizeObserverCallback[] = [];
let availableWidth = 800;
beforeEach(() => {
  resizeCallbacks = [];
  availableWidth = 800;
  vi.clearAllMocks();
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => availableWidth,
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallbacks.push(callback);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const settings: SettingsState = {
  mode: "words",
  duration: 30,
  wordTarget: 25,
  quoteLength: "all",
  punctuation: false,
  numbers: false,
  capitalization: false,
  typingFontSize: 3.25,
  typingFontFamily: "monospace",
  iconFontSize: 1,
  helpFontSize: 1,
  difficulty: "beginner",
  textAlign: "center",
  ghostWriterSpeed: 40,
  ghostWriterEnabled: false,
  soundEnabled: true,
  typingSound: "creamy",
  warningSound: "clock",
  presetText: "",
  presetModeType: "finish",
  showOnScreenKeyboard: false,
  keyboardLayout: "qwerty",
};

function configurationProps() {
  return {
    settings,
    updateSettings: vi.fn(),
    generateTest: vi.fn(),
    isKidMode: false,
    handleModeSelect: vi.fn(),
    wordsManifest: null,
    quotesManifest: null,
    isCustomDurationSelected: false,
    isCustomWordTargetSelected: false,
  };
}

function pillProps() {
  return {
    ...configurationProps(),
    editor: null as PracticeEditor | null,
    setEditor: vi.fn(),
    applyCustomLength: vi.fn(),
    applyPresetText: vi.fn(),
    estimateSpeed: { wpm: 40, personal: false },
    connectMode: false,
    isRunning: false,
    isFinished: false,
    uiOpacity: 1,
  };
}

/** The pill with real editor state, as Home wires it. */
function PillHarness({ initial, initialEditor = null, onApplyLength = vi.fn(), onApplyText = vi.fn() }: {
  initial: Partial<SettingsState>;
  initialEditor?: PracticeEditor | null;
  onApplyLength?: (value: number) => void;
  onApplyText?: (text: string) => void;
}) {
  const current = { ...settings, ...initial };
  const [editor, setEditor] = useState<PracticeEditor | null>(initialEditor);
  return (
    <PracticeControls {...pillProps()} settings={current} editor={editor} setEditor={setEditor}
      applyCustomLength={onApplyLength} applyPresetText={onApplyText}
      isCustomDurationSelected={!TIME_PRESETS.includes(current.duration)}
      isCustomWordTargetSelected={!WORD_PRESETS.includes(current.wordTarget)} />
  );
}

function openPill() {
  fireEvent.click(screen.getByRole("button", { name: /^Test settings/ }));
}

function openCustomLength() {
  openPill();
  fireEvent.click(screen.getByRole("button", { name: /^Custom length/ }));
}

describe("practice presentation command boundaries", () => {
  it("offers Preset and an own-text chip that unfolds the text editor", () => {
    const props = { ...pillProps(), settings: { ...settings, mode: "preset" as const } };
    render(<PracticeControls {...props} />);
    openPill();
    fireEvent.click(screen.getByRole("radio", { name: "preset", exact: true }));
    expect(props.handleModeSelect).toHaveBeenCalledWith("preset");
    const add = screen.getByRole("button", { name: "Add your text" });
    expect(add).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(add);
    expect(props.setEditor).toHaveBeenCalledWith("text");
  });

  it("count controls distinguish selecting a count from repeating it", () => {
    const props = pillProps();
    render(<PracticeControls {...props} />);
    openPill();
    fireEvent.click(screen.getByRole("radio", { name: "10", exact: true }));
    expect(props.updateSettings).toHaveBeenCalledWith({ wordTarget: 10 });
    expect(props.generateTest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: "25", exact: true }));
    expect(props.generateTest).toHaveBeenCalledTimes(1);
  });

  it("keeps settings out of the way while a test runs, on results and in Connect", () => {
    const props = pillProps();
    const { rerender } = render(<PracticeControls {...props} isRunning />);
    expect(screen.queryByRole("button", { name: /^Test settings/ })).not.toBeInTheDocument();
    rerender(<PracticeControls {...props} isFinished />);
    expect(screen.queryByRole("button", { name: /^Test settings/ })).not.toBeInTheDocument();
    rerender(<PracticeControls {...props} connectMode />);
    expect(screen.queryByRole("button", { name: /^Test settings/ })).not.toBeInTheDocument();
  });

  it("results delegate save and next commands while invalid results cannot save", () => {
    const saveResults = vi.fn();
    const generateTest = vi.fn();
    const props = {
      settings,
      wpm: 42,
      accuracy: 98,
      stats: { correct: 20, incorrect: 1, missed: 0, extra: 0 },
      wordResults: {
        correctWords: ["cat"],
        incorrectWords: [{ typed: "dig", expected: "dog" }],
      },
      currentQuote: null,
      lastResultIsValid: true,
      connectMode: false,
      saveState: "idle" as const,
      saveResults,
      generateTest,
    };
    const { rerender } = render(<PracticeResults {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Save Results" }));
    fireEvent.click(screen.getByRole("button", { name: /Next Test/ }));
    expect(saveResults).toHaveBeenCalledTimes(1);
    expect(generateTest).toHaveBeenCalledTimes(1);
    rerender(<PracticeResults {...props} lastResultIsValid={false} />);
    expect(screen.getByRole("button", { name: "Invalid" })).toBeDisabled();
  });
});

const resultsProps = () => ({
  settings,
  wpm: 42,
  accuracy: 98,
  stats: { correct: 20, incorrect: 1, missed: 0, extra: 0 },
  wordResults: {
    correctWords: ["cat"],
    incorrectWords: [{ typed: "dig", expected: "dog" }],
  },
  currentQuote: null,
  lastResultIsValid: true,
  connectMode: false,
  saveState: "idle" as const,
  saveResults: vi.fn(),
  generateTest: vi.fn(),
  repeatTest: vi.fn(),
});

describe("accessible results", () => {
  it("result shortcuts only run from the focused summary, respecting composition, modifiers, and Tab navigation", () => {
    const props = resultsProps();
    render(<PracticeResults {...props} />);
    const summary = screen.getByRole("region", { name: "Test results" });
    fireEvent.keyDown(summary, { key: " " });
    fireEvent.keyDown(summary, { key: "Enter" });
    expect(props.saveResults).toHaveBeenCalledTimes(1);
    expect(props.generateTest).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(summary, { key: "Tab" });
    fireEvent.keyDown(summary, { key: "Enter", ctrlKey: true });
    fireEvent.keyDown(summary, { key: "Enter", isComposing: true });
    fireEvent.keyDown(screen.getByRole("button", { name: "Save Results" }), {
      key: " ",
    });
    expect(props.generateTest).toHaveBeenCalledTimes(1);
    expect(props.saveResults).toHaveBeenCalledTimes(1);
    expect(props.repeatTest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Repeat Test" }));
    expect(props.repeatTest).toHaveBeenCalledTimes(1);
  });

  it("opens result word details over the graph, swaps the chip for a Graph pill, and explains unranked repeats", async () => {
    render(<PracticeResults {...resultsProps()} isRepeated rankingStatus="unranked" />);
    fireEvent.click(screen.getByRole("button", { name: "1 mistake" }));
    const details = screen.getByRole("group", { name: "Mistakes" });
    expect(within(details).getByLabelText("typed dig, expected dog")).toBeInTheDocument();
    const graph = screen.getByRole("button", { name: "Back to the graph" });
    expect(graph).toHaveFocus();
    expect(screen.queryByRole("button", { name: "1 mistake" })).not.toBeInTheDocument();
    fireEvent.keyDown(graph, { key: "Escape" });
    await waitFor(() => expect(screen.getByRole("button", { name: "1 mistake" })).toHaveFocus());
    expect(screen.getByRole("button", { name: "1 mistake" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "1 correct" }));
    fireEvent.keyDown(screen.getByRole("group", { name: "Correct words" }), { key: "Escape" });
    await waitFor(() => expect(screen.getByRole("button", { name: "1 correct" })).toHaveFocus());
    // No heading row over the graph and no help text under the buttons.
    expect(screen.queryByRole("button", { name: "About these results" })).not.toBeInTheDocument();
    expect(screen.queryByText(/will not appear on leaderboards/)).not.toBeInTheDocument();
  });
});

describe("custom length and own text unfold from the pill", () => {
  it("unfolds a blank custom length under the row and keeps the draft local until applied", async () => {
    const onApplyLength = vi.fn();
    render(<PillHarness initial={{ mode: "words", wordTarget: 25 }} onApplyLength={onApplyLength} />);
    openCustomLength();
    const chip = screen.getByRole("button", { name: "Custom length" });
    expect(chip).toHaveAttribute("aria-expanded", "true");
    const region = screen.getByRole("region", { name: "Custom word count" });
    expect(chip).toHaveAttribute("aria-controls", region.id);
    const field = within(region).getByRole("textbox", { name: "Custom word count" });
    expect(field).toHaveValue("");
    expect(field).toHaveAttribute("placeholder", "25");
    expect(field).toHaveFocus();
    expect(within(region).getByRole("status")).toHaveTextContent("Type how many words, or use a quick pick.");
    expect(field).not.toHaveAttribute("aria-invalid");
    expect(within(region).getByRole("button", { name: /^Use/ })).toBeDisabled();
    fireEvent.change(field, { target: { value: "75" } });
    expect(within(region).getByRole("status")).toHaveTextContent("About 2 minutes at 40 wpm.");
    expect(within(region).getByRole("button", { name: "75 words", exact: true })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(region).getByRole("button", { name: "150 words", exact: true }));
    expect(field).toHaveValue("150");
    fireEvent.change(field, { target: { value: "75" } });
    expect(onApplyLength).not.toHaveBeenCalled();
    fireEvent.click(within(region).getByRole("button", { name: "Use 75 words" }));
    expect(onApplyLength).toHaveBeenCalledWith(75);
    await waitFor(() => expect(screen.getByRole("button", { name: /^Test settings/ })).toBeInTheDocument());
  });

  it("nudges from the current length with the arrow keys and applies on Enter", () => {
    const onApplyLength = vi.fn();
    render(<PillHarness initial={{ mode: "time", duration: 30 }} onApplyLength={onApplyLength} />);
    openCustomLength();
    const field = screen.getByRole("textbox", { name: "Custom duration" });
    fireEvent.keyDown(field, { key: "ArrowUp" });
    expect(field).toHaveValue("35");
    fireEvent.keyDown(field, { key: "ArrowDown" });
    fireEvent.keyDown(field, { key: "ArrowDown" });
    expect(field).toHaveValue("25");
    expect(onApplyLength).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onApplyLength).toHaveBeenCalledWith(25);
  });

  it("validates lengths against the shared limits and keeps an accepted duration through normalization", async () => {
    const onApplyLength = vi.fn();
    const { unmount } = render(<PillHarness initial={{ mode: "time", duration: 30 }} onApplyLength={onApplyLength} />);
    openCustomLength();
    const field = screen.getByRole("textbox", { name: "Custom duration" });
    const use = () => screen.getByRole("button", { name: /^Use/ });
    for (const [raw, message] of [["abc", "Not a length."], ["0", "Too short."], ["61:00", "Too long."]] as const) {
      fireEvent.change(field, { target: { value: raw } });
      expect(screen.getByRole("status")).toHaveTextContent(message);
      expect(field).toHaveAttribute("aria-invalid", "true");
      expect(use()).toBeDisabled();
    }
    fireEvent.change(field, { target: { value: "9m 30s" } });
    expect(use()).toHaveAccessibleName("Use 9:30");
    fireEvent.click(use());
    expect(onApplyLength).toHaveBeenLastCalledWith(9 * 60 + 30);
    expect(normalizePracticeSettings({ ...settings, mode: "time", duration: 9 * 60 + 30 }).duration).toBe(9 * 60 + 30);
    await waitFor(() => expect(screen.queryByRole("group", { name: "Test settings" })).not.toBeInTheDocument());
    openCustomLength();
    fireEvent.change(screen.getByRole("textbox", { name: "Custom duration" }), { target: { value: "60:00" } });
    fireEvent.click(use());
    expect(onApplyLength).toHaveBeenLastCalledWith(MAX_DURATION_SECONDS);
    unmount();

    render(<PillHarness initial={{ mode: "words" }} onApplyLength={onApplyLength} />);
    openCustomLength();
    const words = screen.getByRole("textbox", { name: "Custom word count" });
    fireEvent.change(words, { target: { value: String(MAX_WORD_TARGET + 1) } });
    expect(screen.getByRole("status")).toHaveTextContent("Too long.");
    fireEvent.change(words, { target: { value: String(MAX_WORD_TARGET) } });
    fireEvent.click(use());
    expect(onApplyLength).toHaveBeenLastCalledWith(MAX_WORD_TARGET);
  });

  it("folds the editor with Escape, returning focus to its chip, then Escape closes the pill", async () => {
    render(<PillHarness initial={{ mode: "words" }} />);
    openCustomLength();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Custom word count" }), { key: "Escape" });
    const chip = screen.getByRole("button", { name: "Custom length" });
    expect(chip).toHaveFocus();
    expect(chip).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(screen.queryByRole("region", { name: "Custom word count" })).not.toBeInTheDocument());
    expect(screen.getByRole("group", { name: "Test settings" })).toBeInTheDocument();
    fireEvent.keyDown(chip, { key: "Escape" });
    await waitFor(() => expect(screen.getByRole("button", { name: /^Test settings/ })).toHaveFocus());
    openCustomLength();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Custom length" })).toHaveFocus();
  });

  it("starts from your text, flags empty, odd and too-long text, and applies the cleaned text", () => {
    const onApplyText = vi.fn();
    render(<PillHarness initial={{ mode: "preset", presetText: "my text" }} initialEditor="text" onApplyText={onApplyText} />);
    const box = screen.getByRole("textbox", { name: "Practice text" });
    expect(box).toHaveValue("my text");
    expect(screen.getByRole("button", { name: "Edit your text, 2 words" })).toHaveAttribute("aria-expanded", "true");
    const practice = screen.getByRole("button", { name: "Practice this" });
    fireEvent.change(box, { target: { value: "   " } });
    expect(screen.getByRole("status")).toHaveTextContent("Paste or type some text, or start from a sample.");
    expect(practice).toBeDisabled();
    fireEvent.change(box, { target: { value: "Café “quoted” words here now" } });
    expect(screen.getByText(/3 characters can't be typed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fix them" }));
    expect(box).toHaveValue("Cafe \"quoted\" words here now");
    fireEvent.change(box, { target: { value: "cat ".repeat(MAX_PRESET_TEXT_LENGTH / 3) } });
    expect(screen.getByRole("status")).toHaveTextContent("Too long.");
    expect(practice).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Trim to fit" }));
    expect((box as HTMLTextAreaElement).value.length).toBeLessThanOrEqual(MAX_PRESET_TEXT_LENGTH);
    fireEvent.change(box, { target: { value: "  line one\n\nline   two  " } });
    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    expect(onApplyText).toHaveBeenCalledWith("line one line two");
  });
});

describe("results comparison and timeline", () => {
  const timeline = [
    { second: 1, wpm: 30, accuracy: 100, errors: 0, mistake: false },
    { second: 2, wpm: 45, accuracy: 90, errors: 1, mistake: true },
    { second: 3, wpm: 50, accuracy: 93.3, errors: 1, mistake: false },
  ];

  it("compares a signed-in result with recent tests and describes the graph", () => {
    render(<PracticeResults {...resultsProps()} timeline={timeline}
      comparison={{ tests: 12, averageWpm: 40, bestWpm: 60, averageAccuracy: 95, bestAccuracy: 99 }} />);
    expect(screen.getByText("+2 faster than your average")).toBeInTheDocument();
    expect(screen.getByText("+3% more accurate than your average")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Speed ranged from 30 to 50 words per minute; accuracy ended at 93.3%. Mistakes at 2s\./ })).toBeInTheDocument();
  });

  it("celebrates a new best and hides comparison and graph without history", () => {
    const { rerender } = render(<PracticeResults {...resultsProps()} timeline={timeline}
      comparison={{ tests: 3, averageWpm: 30, bestWpm: 40, averageAccuracy: 99, bestAccuracy: 100 }} />);
    expect(screen.getByText("New best!")).toBeInTheDocument();
    expect(screen.getByText("-1% less accurate than your average")).toBeInTheDocument();
    rerender(<PracticeResults {...resultsProps()} timeline={timeline.slice(0, 1)} comparison={null} />);
    expect(screen.queryByText(/than your average/)).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Speed and accuracy/ })).not.toBeInTheDocument();
    expect(screen.getByText(/No graph for this result/)).toBeInTheDocument();
    expect(screen.getByText("Words Per Minute")).toBeInTheDocument();
  });

  it("prints shortcut keys on the buttons only while they work, and draws the ghost as a guide", () => {
    const props = resultsProps();
    const { rerender } = render(<PracticeResults {...props} duration={30_000} timeline={timeline}
      settings={{ ...settings, ghostWriterEnabled: true, ghostWriterSpeed: 60 }} />);
    expect(screen.getByRole("button", { name: "Save Results" })).toHaveAttribute("aria-keyshortcuts", "Space");
    expect(screen.getByRole("button", { name: "Next Test" })).toHaveAttribute("aria-keyshortcuts", "Enter");
    expect(screen.getByRole("region", { name: "Test results" })).toHaveAccessibleDescription("Space saves this result. Enter starts the next test.");
    expect(screen.getByText("ghost 60")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30.0s test" })).toBeInTheDocument();
    rerender(<PracticeResults {...props} saveState="saving" timeline={timeline} />);
    expect(screen.getByRole("button", { name: "Saving..." })).not.toHaveAttribute("aria-keyshortcuts");
    expect(screen.getByRole("button", { name: "Next Test" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next Test" })).not.toHaveAttribute("aria-keyshortcuts");
    expect(screen.queryByText("ghost 60")).not.toBeInTheDocument();
  });

  it("shows unverified results and quote attribution without a save shortcut, and no header line", () => {
    render(<PracticeResults {...resultsProps()} lastResultIsValid={false} lastResultInvalidReason="WPM exceeds limit"
      settings={{ ...settings, mode: "quote" }} currentQuote={{ quote: "cat", author: "Fixture Author", source: "Fixture Book", context: "", date: "" }} />);
    expect(screen.getByText("Unverified")).toBeInTheDocument();
    expect(screen.getByText("Speed exceeded the 300 WPM cap")).toBeInTheDocument();
    expect(screen.getByText("— Fixture Author, Fixture Book")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Test results" })).toHaveAccessibleDescription("Enter starts the next test.");
    cleanup();
    render(<PracticeResults {...resultsProps()} lastResultIsValid />);
    expect(screen.getByRole("heading", { name: "Results" })).toHaveClass("sr-only");
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
    expect(screen.queryByText(/beginner/)).not.toBeInTheDocument();
  });

  it("swaps solo actions for the room's own actions in Connect", () => {
    const leave = vi.fn();
    render(<PracticeResults {...resultsProps()} connectMode onLeave={leave} connectActions={<p>Waiting for everyone</p>} />);
    expect(screen.getByText("Waiting for everyone")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save Results|Next Test|Repeat Test/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Leave Room" }));
    expect(leave).toHaveBeenCalledTimes(1);
  });
});

describe("on-screen keyboard sizing", () => {
  it("legacy retains its observed wrapper and recovers after shrinking below 280px", async () => {
    render(<OnScreenKeyboard style="legacy" nextChar="a" capsLockOn={false} layoutId="qwerty" activeKey={null} visible />);
    const container = screen.getByTestId("keyboard-container");
    expect(within(container).getByText("A")).toBeInTheDocument();
    availableWidth = 240;
    act(() => {
      resizeCallbacks.forEach((callback) => callback([], {} as ResizeObserver));
    });
    expect(screen.getByTestId("keyboard-container")).toBe(container);
    await waitFor(() => expect(within(container).queryByText("A")).not.toBeInTheDocument());
    availableWidth = 800;
    act(() => {
      resizeCallbacks.forEach((callback) => callback([], {} as ResizeObserver));
    });
    expect(within(container).getByText("A")).toBeInTheDocument();
    expect(container.querySelector('[data-next-key="true"]')).toHaveTextContent("A");
  });
});

it.each(["qwerty", "dvorak", "colemak"] as const)("legacy does not highlight Shift just because Caps Lock is on in %s", (layoutId) => {
  const props = { style: "legacy" as const, nextChar: "A", capsLockOn: true, layoutId, activeKey: null, visible: true };
  const { rerender } = render(<OnScreenKeyboard {...props} />);
  const keyboard = screen.getByRole("region", { name: "On-screen keyboard" });
  const shift = keyboard.querySelector('[data-key="Shift"]');
  const caps = keyboard.querySelector('[data-key="CapsLock"]') as HTMLElement;
  const capsOnBackground = caps.style.backgroundColor;
  expect(keyboard).toHaveAccessibleDescription(
    "Next key: A. Caps Lock is on.",
  );
  expect(shift).not.toHaveAttribute("data-next-key");
  rerender(<OnScreenKeyboard {...props} nextChar="a" />);
  expect(keyboard).toHaveAccessibleDescription(
    "Next key: A. Caps Lock is on. Turn Caps Lock off for lowercase letters.",
  );
  expect(shift).not.toHaveAttribute("data-next-key");
  expect(shift).not.toHaveAttribute("data-active-key");
  expect((shift as HTMLElement).style.backgroundColor).toBe("transparent");
  rerender(<OnScreenKeyboard {...props} capsLockOn={false} />);
  expect(keyboard).toHaveAccessibleDescription("Next key: Shift + A.");
  expect(shift).toHaveAttribute("data-next-key", "true");
  expect(caps.style.backgroundColor).not.toBe(capsOnBackground);
  rerender(<OnScreenKeyboard {...props} nextChar="a" capsLockOn={false} />);
  expect(shift).not.toHaveAttribute("data-next-key");
  rerender(<OnScreenKeyboard {...props} nextChar="!" />);
  expect(keyboard).toHaveAccessibleDescription("Next key: Shift + 1. Caps Lock is on.");
  expect(shift).toHaveAttribute("data-next-key", "true");
});

it.each(["dark", "light"] as const)("keeps every save action state readable in %s mode", (mode) => {
  const palette = deriveThemeUI(theme.variants.default[mode]);
  const semanticValues = new Map(
    Object.entries(palette).map(([role, value]) => [
      `var(--${role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)})`,
      value,
    ]),
  );
  const props = resultsProps();
  const { rerender } = render(<PracticeResults {...props} />);
  const states = [
    { saveState: "idle", label: "Save Results", valid: true },
    { saveState: "saving", label: "Saving...", valid: true },
    { saveState: "saved", label: "Saved", valid: true },
    { saveState: "error", label: "Error - Try Again", valid: true },
    { saveState: "idle", label: "Invalid", valid: false },
  ] as const;
  for (const { saveState, label, valid } of states) {
    rerender(<PracticeResults {...props} saveState={saveState} lastResultIsValid={valid} />);
    const button = screen.getByRole("button", { name: label, exact: true });
    const background = semanticValues.get(button.style.backgroundColor);
    const foreground = semanticValues.get(button.style.color);
    expect(background, `${label} background must use a semantic role`).toBeDefined();
    expect(foreground, `${label} foreground must use a semantic role`).toBeDefined();
    expect(contrastRatio(foreground!, background!), `${label} contrast`).toBeGreaterThanOrEqual(4.5);
    expect(button.className).not.toMatch(/(?:hover|disabled):opacity-/);
  }
});

it.each(["spotlight", "finger", "keycaps"] as const)("the %s keyboard guides Shift and Caps Lock like the legacy one", (style) => {
  const props = { style, nextChar: "A", capsLockOn: true, layoutId: "qwerty" as const, activeKey: null, visible: true };
  const { rerender } = render(<OnScreenKeyboard {...props} />);
  const keyboard = screen.getByRole("region", { name: "On-screen keyboard" });
  expect(keyboard).toHaveAttribute("data-keyboard-style", style);
  expect(keyboard).toHaveAccessibleDescription("Next key: A. Caps Lock is on.");
  expect(keyboard.querySelector('[data-key="Shift"]')).not.toHaveAttribute("data-next-key");
  expect(keyboard.querySelector('[data-key="a"], [data-key="A"]')).toHaveAttribute("data-next-key", "true");
  rerender(<OnScreenKeyboard {...props} nextChar="a" />);
  expect(keyboard).toHaveAccessibleDescription("Next key: A. Caps Lock is on. Turn Caps Lock off for lowercase letters.");
  rerender(<OnScreenKeyboard {...props} capsLockOn={false} />);
  expect(keyboard).toHaveAccessibleDescription("Next key: Shift + A.");
  expect(keyboard.querySelector('[data-next-key="true"][data-key^="Shift"]')).not.toBeNull();
});

it("defaults to the Spotlight keyboard and marks the Backspace when letters are wrong", () => {
  render(<OnScreenKeyboard nextChar="Backspace" toDelete={2} capsLockOn={false} layoutId="qwerty" activeKey={null} visible />);
  const keyboard = screen.getByRole("region", { name: "On-screen keyboard" });
  expect(keyboard).toHaveAttribute("data-keyboard-style", "spotlight");
  expect(keyboard.querySelector('[data-key="Backspace"]')).toHaveAttribute("data-next-key", "true");
});
