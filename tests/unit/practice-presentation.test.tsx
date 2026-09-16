import { fireEvent, render, screen, cleanup, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PracticeControls from "@/components/typing/PracticeControls";
import PracticeQuickSettingsDialog from "@/components/typing/PracticeQuickSettingsDialog";
import PracticeCountDialog from "@/components/typing/PracticeCountDialog";
import PracticeSettingsDialog from "@/components/typing/PracticeSettingsDialog";
import PracticeResults from "@/components/typing/PracticeResults";
import type { SettingsState } from "@/lib/typing-constants";
import theme from "../../public/themes/typesetgo.json";

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ colors: theme.variants.default.dark }),
}));
vi.mock("@/hooks/useAnimatedCounter", () => ({
  useAnimatedCounter: (value: number) => value,
}));

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const settings: SettingsState = {
  mode: "words", duration: 30, wordTarget: 25, quoteLength: "all",
  punctuation: false, numbers: false, capitalization: false,
  typingFontSize: 3.25, typingFontFamily: "monospace", iconFontSize: 1,
  helpFontSize: 1, difficulty: "beginner", textAlign: "center",
  ghostWriterSpeed: 40, ghostWriterEnabled: false, soundEnabled: true,
  typingSound: "creamy", warningSound: "clock", errorSound: "",
  presetText: "", presetModeType: "finish", showOnScreenKeyboard: false,
  keyboardLayout: "qwerty",
};

function configurationProps() {
  return {
    settings, updateSettings: vi.fn(), generateTest: vi.fn(), isKidMode: false,
    handleModeSelect: vi.fn(), wordsManifest: null, quotesManifest: null,
    openCustomCountModal: vi.fn(), isCustomDurationSelected: false,
    isCustomWordTargetSelected: false,
  };
}

describe("practice presentation command boundaries", () => {
  it.each(["desktop", "compact"])("%s count controls distinguish selecting a count from repeating it", (variant) => {
    const props = configurationProps();
    if (variant === "desktop") {
      render(<PracticeControls {...props} connectMode={false} isRunning={false}
        isFinished={false} isCompactMode={false} uiOpacity={1} setShowQuickSettings={vi.fn()} />);
    } else {
      render(<PracticeQuickSettingsDialog {...props} showQuickSettings setShowQuickSettings={vi.fn()}
        linePreview={3} setLinePreview={vi.fn()} maxWordsPerLine={7} setMaxWordsPerLine={vi.fn()} />);
    }
    const countControls = variant === "compact"
      ? within(screen.getByText("Word Count", { exact: true }).parentElement!)
      : screen;
    fireEvent.click(countControls.getByRole("button", { name: "10", exact: true }));
    expect(props.updateSettings).toHaveBeenCalledWith({ wordTarget: 10 });
    expect(props.generateTest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "25", exact: true }));
    expect(props.generateTest).toHaveBeenCalledTimes(1);
  });

  it("custom count drafts stay local until submitted", () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    render(<PracticeCountDialog settings={settings} setShowCustomCountModal={onClose} onApply={onApply} />);
    fireEvent.click(screen.getByRole("button", { name: "ones down" }));
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Set Word Count" }));
    expect(onApply).toHaveBeenCalledWith(26);
    expect(onClose).toHaveBeenCalledWith(false);
  });

  it("settings navigation does not mutate preferences and returns to All when closed", () => {
    const updateSettings = vi.fn();
    const props = { settings, updateSettings, showSettings: true, setShowSettings: vi.fn(),
      linePreview: 3, setLinePreview: vi.fn(), maxWordsPerLine: 7, setMaxWordsPerLine: vi.fn(), soundManifest: null };
    const { rerender } = render(<PracticeSettingsDialog {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Type", exact: true }));
    expect(screen.getByLabelText("Preview Lines")).toBeInTheDocument();
    expect(updateSettings).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(props.setShowSettings).toHaveBeenCalledWith(false);
    rerender(<PracticeSettingsDialog {...props} showSettings={false} />);
    rerender(<PracticeSettingsDialog {...props} />);
    expect(screen.getByRole("button", { name: "Sound On" })).toBeInTheDocument();
  });

  it("results delegate save and next commands while invalid results cannot save", () => {
    const saveResults = vi.fn();
    const generateTest = vi.fn();
    const props = { settings, wpm: 42, accuracy: 98, stats: { correct: 20, incorrect: 1, missed: 0, extra: 0 },
      wordResults: { correctWords: ["cat"], incorrectWords: [{ typed: "dig", expected: "dog" }] },
      currentQuote: null, lastResultIsValid: true, connectMode: false, saveState: "idle" as const,
      saveResults, generateTest };
    const { rerender } = render(<PracticeResults {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Save Results" }));
    fireEvent.click(screen.getByRole("button", { name: /Next Test/ }));
    expect(saveResults).toHaveBeenCalledTimes(1);
    expect(generateTest).toHaveBeenCalledTimes(1);
    rerender(<PracticeResults {...props} lastResultIsValid={false} />);
    expect(screen.getByRole("button", { name: "Invalid" })).toBeDisabled();
  });
});
