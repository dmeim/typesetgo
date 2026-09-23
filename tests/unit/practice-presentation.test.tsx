import { useState } from "react";
import { fireEvent, render, screen, cleanup, within, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PracticeControls from "@/components/typing/PracticeControls";
import PracticeQuickSettingsDialog from "@/components/typing/PracticeQuickSettingsDialog";
import PracticeCountDialog from "@/components/typing/PracticeCountDialog";
import PracticeSettingsDialog from "@/components/typing/PracticeSettingsDialog";
import PracticeThemePicker from "@/components/typing/PracticeThemePicker";
import PracticePresetDialog from "@/components/typing/PracticePresetDialog";
import OnScreenKeyboard from "@/components/typing/keyboard/OnScreenKeyboard";
import { contrastRatio, deriveThemeUI } from "@/lib/colors";
import { fetchThemeCatalogIndex, fetchThemeForPreview, getThemeFromCache } from "@/lib/themes";
import type { ThemeCatalogIndex, ThemeDefinition } from "@/types/theme";
import PracticeResults from "@/components/typing/PracticeResults";
import { MAX_DURATION_SECONDS, normalizePracticeSettings, type SettingsState } from "@/lib/typing-constants";
import theme from "../../public/themes/typesetgo.json";

const themeActions = vi.hoisted(() => ({
  setTheme: vi.fn(),
  setThemeSelection: vi.fn(),
}));
vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    colors: theme.variants.default.dark,
    themeName: "TypeSetGo",
    themeId: "typesetgo",
    variantId: "default",
    mode: "dark",
    ...themeActions,
  }),
}));
vi.mock("@/lib/themes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/themes")>()),
  fetchThemeCatalogIndex: vi.fn(),
  fetchThemeForPreview: vi.fn(),
  getThemeFromCache: vi.fn(),
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
  themeActions.setTheme.mockResolvedValue(undefined);
  themeActions.setThemeSelection.mockResolvedValue(undefined);
  vi.mocked(getThemeFromCache).mockReturnValue(null);
  vi.mocked(fetchThemeForPreview).mockImplementation(async (id) => fixtureTheme(id));
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
    openCustomCountModal: vi.fn(),
    isCustomDurationSelected: false,
    isCustomWordTargetSelected: false,
  };
}

describe("practice presentation command boundaries", () => {
  it.each(["desktop", "compact"])("%s count controls distinguish selecting a count from repeating it", (variant) => {
    const props = configurationProps();
    if (variant === "desktop") {
      render(
        <PracticeControls
          {...props}
          connectMode={false}
          isRunning={false}
          isFinished={false}
          isCompactMode={false}
          uiOpacity={1}
          setShowQuickSettings={vi.fn()}
        />,
      );
    } else {
      render(
        <PracticeQuickSettingsDialog
          {...props}
          showQuickSettings
          setShowQuickSettings={vi.fn()}
          linePreview={3}
          setLinePreview={vi.fn()}
          maxWordsPerLine={7}
          setMaxWordsPerLine={vi.fn()}
        />,
      );
    }
    const countControls =
      variant === "compact" ? within(screen.getByText("Word Count", { exact: true }).parentElement!) : screen;
    fireEvent.click(countControls.getByRole("radio", { name: "10", exact: true }));
    expect(props.updateSettings).toHaveBeenCalledWith({ wordTarget: 10 });
    expect(props.generateTest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: "25", exact: true }));
    expect(props.generateTest).toHaveBeenCalledTimes(1);
  });

  it("custom count drafts stay local until submitted", () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    render(<PracticeCountDialog settings={settings} setShowCustomCountModal={onClose} onApply={onApply} />);
    fireEvent.click(screen.getByRole("button", { name: "ones up" }));
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Set Word Count" }));
    expect(onApply).toHaveBeenCalledWith(26);
    expect(onClose).toHaveBeenCalledWith(false);
  });

  it("settings navigation does not mutate preferences and returns to All when closed", () => {
    const updateSettings = vi.fn();
    const props = {
      settings,
      updateSettings,
      showSettings: true,
      setShowSettings: vi.fn(),
      linePreview: 3,
      setLinePreview: vi.fn(),
      maxWordsPerLine: 7,
      setMaxWordsPerLine: vi.fn(),
      soundManifest: null,
    };
    const { rerender } = render(<PracticeSettingsDialog {...props} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Type", exact: true }), { button: 0, ctrlKey: false });
    expect(screen.getByLabelText("Preview Lines")).toBeInTheDocument();
    expect(updateSettings).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(props.setShowSettings).toHaveBeenCalledWith(false);
    rerender(<PracticeSettingsDialog {...props} showSettings={false} />);
    rerender(<PracticeSettingsDialog {...props} />);
    expect(screen.getByRole("switch", { name: "Sound", checked: true })).toBeInTheDocument();
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

const settingsDialogProps = () => ({
  settings,
  updateSettings: vi.fn(),
  showSettings: true,
  setShowSettings: vi.fn(),
  linePreview: 3,
  setLinePreview: vi.fn(),
  maxWordsPerLine: 7,
  setMaxWordsPerLine: vi.fn(),
  soundManifest: {
    typing: { creamy: ["one.mp3"] },
    warning: { clock: ["one.mp3"] },
    error: {},
  },
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

describe("accessible practice dialogs and results", () => {
  it("names settings controls, exposes chosen values, and uses the same 1–6rem text range", () => {
    const props = settingsDialogProps();
    render(<PracticeSettingsDialog {...props} settings={{ ...settings, typingFontSize: 2 }} />);
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Typing Font" })).toBeInTheDocument();
    const slider = screen.getByRole("slider", { name: "Text Size" });
    expect(slider).toHaveAttribute("aria-valuemin", "1");
    expect(slider).toHaveAttribute("aria-valuemax", "6");
    expect(slider).toHaveAttribute("aria-valuenow", "2");
    expect(screen.getByRole("radio", { name: "center", checked: true })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Race", exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Error Sound" })).not.toBeInTheDocument();
  });

  it("actually disables sound previews, ghost speed, and keyboard layout while they are off", () => {
    const props = settingsDialogProps();
    render(<PracticeSettingsDialog {...props} settings={{ ...settings, soundEnabled: false }} />);
    expect(screen.getByRole("combobox", { name: "Typing Sound" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Warning Sound" })).toBeDisabled();
    screen.getAllByRole("button", { name: "Preview", exact: true }).forEach((button) => expect(button).toBeDisabled());
    expect(screen.getByRole("radio", { name: "QWERTY" })).toBeDisabled();
    expect(screen.getByRole("slider", { name: "Target Speed" })).not.toHaveAttribute("tabindex", "0");
    fireEvent.click(screen.getByRole("switch", { name: "Ghost", checked: false }));
    expect(props.updateSettings).toHaveBeenCalledWith({
      ghostWriterEnabled: true,
    });
  });

  it("dismisses each reachable dialog with Escape", () => {
    const close = vi.fn();
    const { unmount } = render(<PracticeSettingsDialog {...settingsDialogProps()} setShowSettings={close} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(close).toHaveBeenCalledWith(false);
    unmount();
    close.mockClear();
    const quick = render(
      <PracticeQuickSettingsDialog
        {...configurationProps()}
        showQuickSettings
        setShowQuickSettings={close}
        linePreview={3}
        setLinePreview={vi.fn()}
        maxWordsPerLine={7}
        setMaxWordsPerLine={vi.fn()}
      />,
    );
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Quick Settings" }), {
      key: "Escape",
    });
    expect(close).toHaveBeenCalledWith(false);
    quick.unmount();
    close.mockClear();
    render(<PracticePresetDialog showPresetInput setShowPresetInput={close} handlePresetSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Enter Custom Text" }), { key: "Escape" });
    expect(close).toHaveBeenCalledWith(false);
  });

  it("custom count supports keyboard increments and keeps the draft local until apply", () => {
    const onApply = vi.fn();
    render(<PracticeCountDialog settings={settings} setShowCustomCountModal={vi.fn()} onApply={onApply} />);
    fireEvent.keyDown(screen.getByRole("spinbutton", { name: "ones" }), {
      key: "ArrowUp",
    });
    expect(screen.getByRole("spinbutton", { name: "ones" })).toHaveAttribute("aria-valuenow", "6");
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Set Word Count" }));
    expect(onApply).toHaveBeenCalledWith(26);
  });

  it("keeps dial buttons and arrow keys in the same direction", () => {
    render(<PracticeCountDialog settings={settings} setShowCustomCountModal={vi.fn()} onApply={vi.fn()} />);
    const ones = screen.getByRole("spinbutton", { name: "ones" });
    fireEvent.click(screen.getByRole("button", { name: "ones up" }));
    expect(ones).toHaveAttribute("aria-valuenow", "6");
    fireEvent.click(screen.getByRole("button", { name: "ones down" }));
    expect(ones).toHaveAttribute("aria-valuenow", "5");
    fireEvent.keyDown(ones, { key: "ArrowUp" });
    expect(ones).toHaveAttribute("aria-valuenow", "6");
    fireEvent.keyDown(ones, { key: "ArrowDown" });
    expect(ones).toHaveAttribute("aria-valuenow", "5");
  });

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

  it("settings inputs on the result screen cannot save, repeat, or advance a test", () => {
    const props = resultsProps();
    render(
      <>
        <PracticeResults {...props} />
        <PracticeQuickSettingsDialog
          {...configurationProps()}
          showQuickSettings
          setShowQuickSettings={vi.fn()}
          linePreview={3}
          setLinePreview={vi.fn()}
          maxWordsPerLine={7}
          setMaxWordsPerLine={vi.fn()}
        />
      </>,
    );
    const input = screen.getByRole("spinbutton", { name: "Text Size (rem)" });
    for (const key of [" ", "Enter", "Tab"]) fireEvent.keyDown(input, { key });
    expect(props.saveResults).not.toHaveBeenCalled();
    expect(props.generateTest).not.toHaveBeenCalled();
    expect(props.repeatTest).not.toHaveBeenCalled();
  });

  it("opens result word details by button activation and explains unranked repeats", () => {
    render(<PracticeResults {...resultsProps()} isRepeated rankingStatus="unranked" />);
    fireEvent.click(screen.getByRole("button", { name: "1 Incorrect" }));
    expect(screen.getByText("dig")).toBeVisible();
    expect(screen.getByText("dog")).toBeVisible();
    expect(screen.queryByText(/will not appear on leaderboards/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "About these results" }));
    expect(screen.getByText(/will not appear on leaderboards/)).toBeVisible();
  });
});

function fixtureTheme(id: string, category: ThemeDefinition["category"] = "default", multi = false): ThemeDefinition {
  const colors = theme.variants.default.dark;
  const variants = [
    {
      id: "default",
      label: "Default",
      dark: colors,
      light: theme.variants.default.light,
    },
  ];
  if (multi)
    variants.push({
      id: "soft",
      label: "Soft",
      dark: colors,
      light: theme.variants.default.light,
    });
  return {
    id,
    name: id,
    category,
    dark: colors,
    light: theme.variants.default.light,
    variants,
    defaultVariantId: "default",
  };
}
function catalog(themes: ThemeDefinition[]): ThemeCatalogIndex {
  return {
    version: 1,
    themes: themes.map((theme) => ({
      id: theme.id, name: theme.name, category: theme.category, defaultVariantId: theme.defaultVariantId,
      variants: theme.variants.map((variant) => ({
        id: variant.id, label: variant.label, light: !!variant.light,
        swatches: [variant.dark.bg.base, variant.dark.typing.cursor, variant.dark.interactive.secondary.DEFAULT, variant.dark.typing.correct],
      })),
    })),
  };
}

describe("theme browsing", () => {
  it("loads metadata only on open, keeps the selected preview available, and retries index failure", async () => {
    let resolve!: (value: ThemeCatalogIndex | null) => void;
    vi.mocked(fetchThemeCatalogIndex).mockReturnValueOnce(new Promise((done) => { resolve = done; }))
      .mockResolvedValue(catalog([fixtureTheme("First"), fixtureTheme("Second")]));
    const props = { showThemeModal: false, setShowThemeModal: vi.fn() };
    const { rerender } = render(<PracticeThemePicker {...props} />);
    expect(fetchThemeCatalogIndex).not.toHaveBeenCalled();
    rerender(<PracticeThemePicker {...props} showThemeModal />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading themes");
    expect(screen.getByRole("img", { name: /TypeSetGo.*miniature typing homepage/ })).toBeVisible();
    await act(async () => { resolve(null); });
    expect(screen.getByRole("alert")).toHaveTextContent("Themes could not be loaded");
    fireEvent.click(screen.getByRole("button", { name: "Retry", exact: true }));
    await screen.findByRole("button", { name: "Select Second", exact: true });
    expect(fetchThemeForPreview).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    rerender(<PracticeThemePicker {...props} />);
    rerender(<PracticeThemePicker {...props} showThemeModal />);
    expect(fetchThemeCatalogIndex).toHaveBeenCalledTimes(2);
  });

  it("searches variant metadata without loading palettes and ignores stale preview results", async () => {
    vi.mocked(fetchThemeCatalogIndex).mockResolvedValue(catalog([fixtureTheme("First", "nature", true), fixtureTheme("Second")]));
    let resolveFirst!: (value: ThemeDefinition) => void;
    let resolveSecond!: (value: ThemeDefinition) => void;
    vi.mocked(fetchThemeForPreview).mockImplementation((id) => new Promise((done) => {
      if (id === "First") resolveFirst = done;
      else resolveSecond = done;
    }));
    render(<PracticeThemePicker showThemeModal setShowThemeModal={vi.fn()} />);
    await screen.findByRole("button", { name: "Select Second", exact: true });
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Soft" } });
    const first = screen.getByRole("button", { name: "First variants" });
    expect(fetchThemeForPreview).not.toHaveBeenCalled();
    fireEvent.focus(first);
    expect(screen.getByRole("status")).toHaveTextContent("Loading preview for First");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    await waitFor(() => expect(fetchThemeForPreview).toHaveBeenCalledWith("First"));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Second" } });
    fireEvent.focus(screen.getByRole("button", { name: "Select Second", exact: true }));
    await waitFor(() => expect(fetchThemeForPreview).toHaveBeenCalledWith("Second"));
    await act(async () => { resolveSecond(fixtureTheme("Second")); });
    expect(screen.getByRole("img", { name: /Second.*miniature typing homepage/ })).toBeVisible();
    await act(async () => { resolveFirst(fixtureTheme("First")); });
    expect(screen.getByRole("img", { name: /Second.*miniature typing homepage/ })).toBeVisible();
    expect(themeActions.setThemeSelection).not.toHaveBeenCalled();
  });

  it("cancels passing hovers and recovers a failed palette locally without hiding the catalog", async () => {
    vi.mocked(fetchThemeCatalogIndex).mockResolvedValue(catalog([fixtureTheme("First"), fixtureTheme("Second")]));
    vi.mocked(fetchThemeForPreview).mockResolvedValueOnce(null).mockResolvedValue(fixtureTheme("Second"));
    render(<PracticeThemePicker showThemeModal setShowThemeModal={vi.fn()} />);
    const first = await screen.findByRole("button", { name: "Select First", exact: true });
    fireEvent.mouseMove(first, { movementX: 4, movementY: 0 });
    expect(screen.getByRole("status")).toHaveTextContent("Loading preview for First");
    fireEvent.mouseLeave(first);
    await act(async () => { await new Promise((done) => setTimeout(done, 160)); });
    expect(fetchThemeForPreview).not.toHaveBeenCalled();
    const second = screen.getByRole("button", { name: "Select Second", exact: true });
    fireEvent.focus(second);
    await screen.findByRole("button", { name: "Retry preview" });
    fireEvent.blur(second);
    expect(first).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry preview" }));
    await screen.findByRole("img", { name: /Second.*miniature typing homepage/ });
    expect(fetchThemeForPreview).toHaveBeenCalledTimes(2);
    expect(themeActions.setThemeSelection).not.toHaveBeenCalled();
  });

  it("unmounts collapsed category controls, makes focus preview work, and records only user selections", async () => {
    vi.mocked(fetchThemeCatalogIndex).mockResolvedValue(
      catalog([fixtureTheme("Featured"), fixtureTheme("Forest", "nature", true)]),
    );
    const onUserSelection = vi.fn();
    render(<PracticeThemePicker showThemeModal setShowThemeModal={vi.fn()} onUserSelection={onUserSelection} />);
    await screen.findByRole("button", { name: "Select Featured", exact: true });
    expect(screen.queryByRole("button", { name: "Forest variants" })).not.toBeInTheDocument();
    expect(onUserSelection).not.toHaveBeenCalled();
    const categoryButton = screen.getByRole("button", { name: /Nature/ });
    expect(categoryButton).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(categoryButton);
    const card = screen.getByRole("button", { name: "Forest variants" });
    fireEvent.focus(card);
    expect(within(screen.getByLabelText("Theme preview")).getByText("Forest")).toBeVisible();
    fireEvent.click(card);
    expect(screen.getByRole("region", { name: "Forest variants" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select Forest: Soft", exact: true }));
    expect(themeActions.setThemeSelection).toHaveBeenCalledWith({
      themeId: "Forest",
      variantId: "soft",
      mode: undefined,
    });
    expect(onUserSelection).toHaveBeenCalledTimes(1);
    fireEvent.click(categoryButton);
    expect(screen.queryByRole("button", { name: "Forest variants" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Select Forest: Soft",
        exact: true,
      }),
    ).not.toBeInTheDocument();
  });

  it("keeps closing variant content out of keyboard interaction during exit", async () => {
    vi.mocked(fetchThemeCatalogIndex).mockResolvedValue(catalog([fixtureTheme("Featured", "default", true)]));
    render(<PracticeThemePicker showThemeModal setShowThemeModal={vi.fn()} />);
    const trigger = await screen.findByRole("button", {
      name: "Featured variants",
    });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Close Featured variants" }));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await waitFor(() =>
      expect(
        screen.queryByRole("button", {
          name: "Select Featured: Soft",
          exact: true,
        }),
      ).not.toBeInTheDocument(),
    );
  });
});

describe("on-screen keyboard sizing", () => {
  it("retains its observed wrapper and recovers after shrinking below 280px", async () => {
    render(<OnScreenKeyboard nextChar="a" capsLockOn={false} layoutId="qwerty" activeKey={null} visible />);
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

describe("dialog focus ownership", () => {
  it("restores an external settings opener after Escape", async () => {
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Preferences opener</button>
          <PracticeSettingsDialog {...settingsDialogProps()} showSettings={open} setShowSettings={setOpen} />
        </>
      );
    }
    render(<Example />);
    const opener = screen.getByRole("button", { name: "Preferences opener" });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Settings" }), { key: "Escape" });
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("keeps quick settings underneath the count dialog and restores its custom trigger", async () => {
    function Example() {
      const [quick, setQuick] = useState(true);
      const [count, setCount] = useState(false);
      return (
        <>
          <PracticeQuickSettingsDialog
            {...configurationProps()}
            openCustomCountModal={() => setCount(true)}
            showQuickSettings={quick}
            setShowQuickSettings={setQuick}
            linePreview={3}
            setLinePreview={vi.fn()}
            maxWordsPerLine={7}
            setMaxWordsPerLine={vi.fn()}
          />
          {count && <PracticeCountDialog settings={settings} setShowCustomCountModal={setCount} onApply={vi.fn()} />}
        </>
      );
    }
    render(<Example />);
    const custom = screen.getByRole("button", { name: "custom" });
    custom.focus();
    fireEvent.click(custom);
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Custom Word Count" }), { key: "Escape" });
    await waitFor(() => expect(custom).toHaveFocus());
    expect(screen.getByRole("dialog", { name: "Quick Settings" })).toBeInTheDocument();
  });
});

it.each(["qwerty", "dvorak", "colemak"] as const)("does not highlight Shift just because Caps Lock is on in %s", (layoutId) => {
  const props = { nextChar: "A", capsLockOn: true, layoutId, activeKey: null, visible: true };
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

describe("custom duration boundary", () => {
  it("retains a user-selected duration through preference normalization", () => {
    const timedSettings = { ...settings, mode: "time" as const, duration: 8 * 60 + 30 };
    const onApply = vi.fn();
    render(<PracticeCountDialog settings={timedSettings} setShowCustomCountModal={vi.fn()} onApply={onApply} />);
    fireEvent.keyDown(screen.getByRole("spinbutton", { name: "minutes" }), { key: "ArrowUp" });
    fireEvent.click(screen.getByRole("button", { name: "Set Duration" }));
    expect(onApply).toHaveBeenCalledWith(9 * 60 + 30);
    const [duration] = onApply.mock.calls[0];
    expect(normalizePracticeSettings({ ...timedSettings, duration }).duration).toBe(9 * 60 + 30);
  });

  it("clamps the editor to the same supported duration maximum as preferences", () => {
    const onApply = vi.fn();
    render(
      <PracticeCountDialog
        settings={{ ...settings, mode: "time", duration: MAX_DURATION_SECONDS + 3600 }}
        setShowCustomCountModal={vi.fn()}
        onApply={onApply}
      />,
    );
    expect(screen.getByRole("spinbutton", { name: "hours" })).toHaveAttribute("aria-valuemax", "1");
    expect(screen.getByRole("spinbutton", { name: "minutes" })).toHaveAttribute("aria-valuemax", "0");
    expect(screen.getByRole("spinbutton", { name: "seconds" })).toHaveAttribute("aria-valuemax", "0");
    expect(screen.getByText("01:00:00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Set Duration" }));
    expect(onApply).toHaveBeenCalledWith(MAX_DURATION_SECONDS);
  });
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
