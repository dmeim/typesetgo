import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TypingPractice from "@/components/typing/TypingPractice";
import type { SettingsState } from "@/lib/typing-constants";
import { DEFAULT_SETTINGS } from "@/lib/storage-utils";
import theme from "../../public/themes/typesetgo.json";

const mocks = vi.hoisted(() => ({
  auth: { status: "signed-out" as "signed-out" | "loading" | "unavailable", isSignedIn: false,
    user: null as null | { id: string }, openSignIn: vi.fn(async () => true) },
  toastError: vi.fn(),
  preferences: undefined as unknown,
  userSelectionRevision: 0,
  setTheme: vi.fn(async () => {}), setThemeSelection: vi.fn(async () => {}),
  words: vi.fn(async () => ["cat"]),
  quotes: vi.fn(async () => [{ quote: "cat dog", author: "Author", source: "Book", date: "2000", context: "" }]),
  mutations: {} as Record<string, ReturnType<typeof vi.fn>>,
}));
vi.mock("@/components/layout/useAppAuth", () => ({ useAppAuth: () => mocks.auth }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: vi.fn() } }));
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ colors: theme.variants.default.dark,
  userSelectionRevision: mocks.userSelectionRevision, themeId: "typesetgo", variantId: "default", themeName: "TypeSetGo", mode: "dark",
  setTheme: mocks.setTheme, setThemeSelection: mocks.setThemeSelection }) }));
vi.mock("@/lib/notification-store", () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock("@/lib/words", () => ({ fetchWords: (...args: unknown[]) => mocks.words(...args),
  fetchWordsManifest: async () => ({ difficulties: ["beginner", "expert"], default: "beginner" }) }));
vi.mock("@/lib/quotes", () => ({ fetchQuotes: (...args: unknown[]) => mocks.quotes(...args),
  fetchQuotesManifest: async () => ({ lengths: ["short", "long"], default: "short" }) }));
vi.mock("@/lib/sounds", () => ({ fetchSoundManifest: async () => ({ typing: {}, warning: {}, error: {} }), getRandomSoundUrl: () => null }));
vi.mock("@/lib/themes", async (original) => ({ ...(await original<object>()), fetchAllThemes: async () => [] }));
vi.mock("convex/react", async () => {
  const { getFunctionName } = await import("convex/server");
  return { useQuery: () => mocks.preferences, useMutation: (reference: Parameters<typeof getFunctionName>[0]) => mocks.mutations[getFunctionName(reference)] };
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function setLocal(updates: Partial<SettingsState> = {}) {
  localStorage.setItem("typesetgo_settings", JSON.stringify({ ...DEFAULT_SETTINGS, mode: "words", ...updates }));
}
function promptWords(container: HTMLElement) {
  return Array.from(container.querySelectorAll("[data-typing-word]")).map((node) => node.textContent).join(" ");
}
function accountPreferences(updates: Record<string, unknown> = {}) {
  return { defaultMode: "words", defaultDuration: 30, defaultWordTarget: 50, defaultDifficulty: "beginner",
    defaultQuoteLength: "all", defaultPunctuation: false, defaultNumbers: false, defaultCapitalization: false,
    defaultPresetModeType: "finish", soundEnabled: false, typingSound: "", warningSound: "", errorSound: "",
    ghostWriterEnabled: false, ghostWriterSpeed: 40, typingFontSize: 5, typingFontFamily: "monospace",
    iconFontSize: 1, helpFontSize: 1, textAlign: "center", ...updates };
}
beforeEach(() => {
  localStorage.clear();
  mocks.auth.isSignedIn = false; mocks.auth.user = null; mocks.preferences = undefined; mocks.userSelectionRevision = 0;
  mocks.auth.status = "signed-out"; mocks.auth.openSignIn.mockReset().mockResolvedValue(true); mocks.toastError.mockClear();
  mocks.setThemeSelection.mockClear();
  mocks.words.mockReset().mockResolvedValue(["cat"]);
  mocks.quotes.mockReset().mockResolvedValue([{ quote: "cat dog", author: "Author", source: "Book", date: "2000", context: "" }]);
  for (const name of ["users:getOrCreateUser", "typingSessions:startSession", "typingSessions:recordProgress", "typingSessions:cancelSession", "preferences:savePreferences"]) {
    mocks.mutations[name] = vi.fn(async () => ({}));
  }
  mocks.mutations["typingSessions:finalizeSession"] = vi.fn(async () => ({ isValid: true, newAchievements: [] }));
  mocks.mutations["testResults:saveResult"] = vi.fn(async () => ({ newAchievements: [] }));
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

describe("canonical practice prompt transitions", () => {
  it("rebuilds exact word counts in both directions", async () => {
    setLocal();
    const { container } = render(<TypingPractice />);
    await waitFor(() => expect(container.querySelectorAll("[data-typing-word]")).toHaveLength(25));
    fireEvent.click(screen.getByRole("button", { name: "10", exact: true }));
    await waitFor(() => expect(container.querySelectorAll("[data-typing-word]")).toHaveLength(10));
    fireEvent.click(screen.getByRole("button", { name: "50", exact: true }));
    await waitFor(() => expect(container.querySelectorAll("[data-typing-word]")).toHaveLength(50));
  });
  it("clears stale word prompts on first Quote entry until the selected dataset resolves", async () => {
    setLocal();
    const pending = deferred<Awaited<ReturnType<typeof mocks.quotes>>>();
    mocks.quotes.mockImplementation(() => pending.promise);
    const { container } = render(<TypingPractice />);
    await waitFor(() => expect(container.querySelectorAll("[data-typing-word]")).toHaveLength(25));
    fireEvent.click(screen.getByRole("button", { name: "quote", exact: true }));
    expect(screen.getByRole("status")).toHaveTextContent("Loading prompt");
    expect(container.querySelectorAll("[data-typing-word]")).toHaveLength(0);
    await act(async () => pending.resolve([{ quote: "cat dog", author: "Author", source: "Book", date: "2000", context: "" }]));
    await waitFor(() => expect(promptWords(container)).toBe("cat dog"));
  });
  it("ignores stale quote data after another length is selected", async () => {
    setLocal({ mode: "quote", quoteLength: "short" });
    const short = deferred<Awaited<ReturnType<typeof mocks.quotes>>>();
    const long = deferred<Awaited<ReturnType<typeof mocks.quotes>>>();
    mocks.quotes.mockImplementation((length) => length === "short" ? short.promise : long.promise);
    const { container } = render(<TypingPractice />);
    await waitFor(() => expect(screen.getByRole("button", { name: "long", exact: true })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "long", exact: true }));
    await act(async () => long.resolve([{ quote: "long quote text", author: "Long", source: "", date: "", context: "" }]));
    await waitFor(() => expect(promptWords(container)).toBe("long quote text"));
    await act(async () => short.resolve([{ quote: "short quote", author: "Short", source: "", date: "", context: "" }]));
    expect(promptWords(container)).toBe("long quote text");
  });
  it("shows a recoverable dataset error instead of retaining a stale prompt", async () => {
    setLocal();
    mocks.words.mockResolvedValueOnce([]).mockResolvedValue(["cat"]);
    const { container } = render(<TypingPractice />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Could not load this prompt"));
    expect(container.querySelectorAll("[data-typing-word]")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(container.querySelectorAll("[data-typing-word]")).toHaveLength(25));
  });
  it("keeps composition drafts visible without prematurely completing the session", async () => {
    setLocal({ mode: "quote", quoteLength: "short" });
    mocks.quotes.mockResolvedValue([{ quote: "猫", author: "Author", source: "", date: "", context: "" }]);
    const { container, rerender } = render(<TypingPractice />);
    await waitFor(() => expect(promptWords(container)).toBe("猫"));
    const input = screen.getByRole("textbox", { name: "Typing practice" });
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "猫" } });
    rerender(<TypingPractice fitToParentHeight />);
    expect(input).toHaveValue("猫");
    expect(screen.queryByText("Words Per Minute")).not.toBeInTheDocument();
    fireEvent.compositionEnd(input);
    expect(screen.getByText("Words Per Minute")).toBeInTheDocument();
  });
  it("finishes quotes by reference word and repeats the exact prompt with CtrlEnter", async () => {
    setLocal({ mode: "quote", quoteLength: "short" });
    const { container } = render(<TypingPractice />);
    await waitFor(() => expect(promptWords(container)).toBe("cat dog"));
    const input = screen.getByRole("textbox", { name: "Typing practice" });
    fireEvent.change(input, { target: { value: "cattt d" } });
    expect(screen.queryByText("Words Per Minute")).not.toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });
    expect(input).toHaveValue("");
    expect(promptWords(container)).toBe("cat dog");
    fireEvent.change(input, { target: { value: "c dog" } });
    expect(screen.getByText("Words Per Minute")).toBeInTheDocument();
  });
});

describe("solo prompt and server session ownership", () => {
  it.each([
    ["loading", "Sign-in is still loading"],
    ["unavailable", "Sign-in is unavailable"],
    ["signed-out", "Could not open sign-in"],
  ] as const)("explains a failed save sign-in action while auth is %s and preserves retry intent", async (status, message) => {
    setLocal({ mode: "quote", quoteLength: "short" });
    mocks.auth.status = status; mocks.auth.openSignIn.mockResolvedValue(false);
    const { container, rerender } = render(<TypingPractice />);
    await waitFor(() => expect(promptWords(container)).toBe("cat dog"));
    fireEvent.change(screen.getByRole("textbox", { name: "Typing practice" }), { target: { value: "cat dog" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Results" }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining(message)));
    expect(screen.getByRole("button", { name: "Error - Try Again" })).toBeEnabled();
    expect(mocks.mutations["testResults:saveResult"]).not.toHaveBeenCalled();
    mocks.auth.status = "signed-out"; mocks.auth.openSignIn.mockResolvedValue(true);
    rerender(<TypingPractice />);
    fireEvent.click(screen.getByRole("button", { name: "Error - Try Again" }));
    await waitFor(() => expect(mocks.auth.openSignIn).toHaveBeenCalledTimes(2));
    mocks.auth.isSignedIn = true; mocks.auth.user = { id: "test-user" }; mocks.preferences = null;
    rerender(<TypingPractice />);
    await waitFor(() => expect(mocks.mutations["testResults:saveResult"]).toHaveBeenCalledTimes(1));
    expect(mocks.mutations["testResults:saveResult"]).toHaveBeenCalledWith(expect.objectContaining({ mode: "quote" }));
  });

  it("cancels a late server prompt once local typing starts and saves only unranked history", async () => {
    setLocal({ wordTarget: 10 });
    mocks.auth.isSignedIn = true; mocks.auth.user = { id: "test-user" }; mocks.preferences = null;
    const pending = deferred<{ sessionId: string; targetText: string }>();
    mocks.mutations["typingSessions:startSession"].mockImplementation(() => pending.promise);
    const { container } = render(<TypingPractice />);
    await waitFor(() => expect(mocks.mutations["typingSessions:startSession"]).toHaveBeenCalled());
    fireEvent.change(screen.getByRole("textbox", { name: "Typing practice" }), { target: { value: "c" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Typing practice" }), { target: { value: "" } });
    await act(async () => pending.resolve({ sessionId: "late-session", targetText: "different prompt" }));
    expect(promptWords(container)).toBe(Array(10).fill("cat").join(" "));
    expect(mocks.mutations["typingSessions:cancelSession"]).toHaveBeenCalledWith({ sessionId: "late-session" });
    fireEvent.change(screen.getByRole("textbox", { name: "Typing practice" }), { target: { value: Array(10).fill("cat").join(" ") + " " } });
    await waitFor(() => expect(mocks.mutations["testResults:saveResult"]).toHaveBeenCalledTimes(1));
    expect(mocks.mutations["typingSessions:finalizeSession"]).not.toHaveBeenCalled();
  });
  it("adopts a resolved server prompt before input and finalizes that same identity", async () => {
    setLocal({ wordTarget: 10 });
    mocks.auth.isSignedIn = true; mocks.auth.user = { id: "test-user" }; mocks.preferences = null;
    mocks.mutations["typingSessions:startSession"].mockResolvedValue({ sessionId: "ranked-session", targetText: "dog" });
    const { container } = render(<TypingPractice />);
    await waitFor(() => expect(promptWords(container)).toBe("dog"));
    fireEvent.change(screen.getByRole("textbox", { name: "Typing practice" }), { target: { value: "dog " } });
    await waitFor(() => expect(mocks.mutations["typingSessions:finalizeSession"]).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: "ranked-session", typedText: "dog ",
    })));
    expect(mocks.mutations["testResults:saveResult"]).not.toHaveBeenCalled();
  });
});

describe("preference hydration and Connect boundaries", () => {
  it("treats the Kid layout command as a user edit while account preferences load", async () => {
    setLocal();
    mocks.auth.isSignedIn = true; mocks.auth.user = { id: "test-user" };
    const { container, rerender } = render(<TypingPractice />);
    await waitFor(() => expect(container.querySelectorAll("[data-typing-word]")).toHaveLength(25));
    fireEvent.click(screen.getByRole("button", { name: "kid", exact: true }));
    mocks.preferences = accountPreferences({ typingFontFamily: "serif", linePreview: 6, maxWordsPerLine: 10 });
    rerender(<TypingPractice />);
    await waitFor(() => expect(JSON.parse(localStorage.getItem("typesetgo_settings")!).typingFontFamily).toBe("serif"));
    expect(JSON.parse(localStorage.getItem("typesetgo_layout")!)).toEqual({ linePreview: 2, maxWordsPerLine: 5 });
  });

  it("keeps an active ranked attempt when account prompt preferences arrive, applying them on Next Test", async () => {
    setLocal({ typingFontSize: 2 });
    mocks.auth.isSignedIn = true; mocks.auth.user = { id: "test-user" };
    mocks.mutations["typingSessions:startSession"].mockImplementation(async ({ wordTarget }: { wordTarget: number }) => ({
      sessionId: `session-${wordTarget}`, targetText: Array(wordTarget).fill("cat").join(" "),
    }));
    const { container, rerender } = render(<TypingPractice />);
    await waitFor(() => expect(mocks.mutations["typingSessions:startSession"]).toHaveBeenCalledTimes(1));
    const originalPrompt = Array(25).fill("cat").join(" ");
    await waitFor(() => expect(promptWords(container)).toBe(originalPrompt));
    const input = screen.getByRole("textbox", { name: "Typing practice" });
    fireEvent.change(input, { target: { value: "ca" } });

    mocks.preferences = accountPreferences({ defaultWordTarget: 50, defaultDifficulty: "expert" });
    rerender(<TypingPractice />);
    await waitFor(() => expect((container.querySelector("[data-typing-word]")?.closest("[style*='font-size']") as HTMLElement)?.style.fontSize).toBe("5rem"));
    expect(input).toHaveValue("ca");
    expect(promptWords(container)).toBe(originalPrompt);
    expect(mocks.words).not.toHaveBeenCalledWith("expert");
    expect(mocks.mutations["typingSessions:cancelSession"]).not.toHaveBeenCalled();
    expect(mocks.mutations["typingSessions:startSession"]).toHaveBeenCalledTimes(1);

    fireEvent.change(input, { target: { value: originalPrompt + " " } });
    await waitFor(() => expect(mocks.mutations["typingSessions:finalizeSession"]).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: "session-25", typedText: originalPrompt + " ",
    })));
    fireEvent.click(screen.getByRole("button", { name: /Next Test/ }));
    await waitFor(() => expect(container.querySelectorAll("[data-typing-word]")).toHaveLength(50));
    expect(mocks.words).toHaveBeenCalledWith("expert");
    await waitFor(() => expect(mocks.mutations["typingSessions:startSession"]).toHaveBeenLastCalledWith(expect.objectContaining({
      mode: "words", wordTarget: 50, difficulty: "expert",
    })));
  });

  it("preserves finished results and a pending sign-in save, repeating the old prompt before Next applies restored mode", async () => {
    setLocal({ wordTarget: 10 });
    const { container, rerender } = render(<TypingPractice />);
    const originalPrompt = Array(10).fill("cat").join(" ");
    await waitFor(() => expect(promptWords(container)).toBe(originalPrompt));
    fireEvent.change(screen.getByRole("textbox", { name: "Typing practice" }), { target: { value: originalPrompt + " " } });
    fireEvent.click(screen.getByRole("button", { name: "Save Results" }));

    const pendingUser = deferred<object>();
    mocks.mutations["users:getOrCreateUser"].mockImplementation(() => pendingUser.promise);
    mocks.auth.isSignedIn = true; mocks.auth.user = { id: "test-user" };
    mocks.preferences = accountPreferences({ defaultMode: "quote", defaultQuoteLength: "short" });
    rerender(<TypingPractice />);
    // Stored preferences can become the next launch defaults without replacing the current result.
    await waitFor(() => expect(JSON.parse(localStorage.getItem("typesetgo_settings")!).mode).toBe("quote"));
    expect(screen.getByText("Words Per Minute")).toBeInTheDocument();
    await act(async () => pendingUser.resolve({}));
    await waitFor(() => expect(mocks.mutations["testResults:saveResult"]).toHaveBeenCalledWith(expect.objectContaining({ mode: "words" })));
    expect(screen.getByRole("button", { name: "Saved" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Repeat Test" }));
    expect(promptWords(container)).toBe(originalPrompt);
    fireEvent.change(screen.getByRole("textbox", { name: "Typing practice" }), { target: { value: originalPrompt + " " } });
    fireEvent.click(screen.getByRole("button", { name: /Next Test/ }));
    await waitFor(() => expect(promptWords(container)).toBe("cat dog"));
  });

  it("restores account preferences over hydrated local defaults but preserves real edits during loading", async () => {
    setLocal({ typingFontSize: 2 });
    const { container, rerender } = render(<TypingPractice />);
    await waitFor(() => expect(container.querySelectorAll("[data-typing-word]")).toHaveLength(25));
    fireEvent.click(screen.getByRole("button", { name: "10", exact: true }));
    mocks.auth.isSignedIn = true; mocks.auth.user = { id: "test-user" };
    mocks.preferences = accountPreferences();
    rerender(<TypingPractice />);
    await waitFor(() => expect((container.querySelector("[data-typing-word]")?.closest("[style*='font-size']") as HTMLElement)?.style.fontSize).toBe("5rem"));
    expect(container.querySelectorAll("[data-typing-word]")).toHaveLength(10);
  });
  it("applies account prompt settings when local hydration was the only change", async () => {
    setLocal({ typingFontSize: 2 });
    const { container, rerender } = render(<TypingPractice />);
    await waitFor(() => expect(container.querySelectorAll("[data-typing-word]")).toHaveLength(25));
    mocks.auth.isSignedIn = true; mocks.auth.user = { id: "test-user" }; mocks.preferences = accountPreferences();
    rerender(<TypingPractice />);
    await waitFor(() => expect(container.querySelectorAll("[data-typing-word]")).toHaveLength(50));
    expect(mocks.mutations["preferences:savePreferences"]).not.toHaveBeenCalled();
  });
  it("preserves a Header theme edit while account preferences are loading", async () => {
    setLocal();
    const { container, rerender } = render(<TypingPractice />);
    await waitFor(() => expect(container.querySelectorAll("[data-typing-word]")).toHaveLength(25));
    mocks.userSelectionRevision = 1;
    rerender(<TypingPractice />);
    mocks.auth.isSignedIn = true; mocks.auth.user = { id: "test-user" };
    mocks.preferences = accountPreferences({ themeId: "old-account-theme", themeMode: "dark" });
    rerender(<TypingPractice />);
    await waitFor(() => expect(container.querySelectorAll("[data-typing-word]")).toHaveLength(50));
    expect(mocks.setThemeSelection).not.toHaveBeenCalled();
  });
  it("does not carry edits from an established account into a different account", async () => {
    setLocal();
    mocks.auth.isSignedIn = true; mocks.auth.user = { id: "first" }; mocks.preferences = accountPreferences();
    const { container, rerender } = render(<TypingPractice />);
    await waitFor(() => expect(container.querySelectorAll("[data-typing-word]")).toHaveLength(50));
    fireEvent.click(screen.getByRole("button", { name: "10", exact: true }));
    await waitFor(() => expect(container.querySelectorAll("[data-typing-word]")).toHaveLength(10));
    mocks.auth.user = { id: "second" }; mocks.preferences = accountPreferences({ defaultWordTarget: 25, themeId: "second-theme" });
    rerender(<TypingPractice />);
    await waitFor(() => expect(container.querySelectorAll("[data-typing-word]")).toHaveLength(25));
    expect(mocks.setThemeSelection).toHaveBeenCalledWith(expect.objectContaining({ themeId: "second-theme" }),
      { source: "preferences", expectedUserSelectionRevision: 0 });
  });
  it("keeps host configuration and avoids solo identity/persistence in Connect", async () => {
    setLocal({ wordTarget: 25 });
    mocks.auth.isSignedIn = true; mocks.auth.user = { id: "test-user" }; mocks.preferences = accountPreferences();
    const { container } = render(<TypingPractice connectMode lockedSettings={{ mode: "preset", presetText: "cat dog" }} />);
    await waitFor(() => expect(promptWords(container)).toBe("cat dog"));
    fireEvent.change(screen.getByRole("textbox", { name: "Typing practice" }), { target: { value: "cat dog" } });
    await waitFor(() => expect(screen.getByText("Words Per Minute")).toBeInTheDocument());
    expect(mocks.mutations["typingSessions:startSession"]).not.toHaveBeenCalled();
    expect(mocks.mutations["typingSessions:finalizeSession"]).not.toHaveBeenCalled();
    expect(mocks.mutations["testResults:saveResult"]).not.toHaveBeenCalled();
    expect(mocks.mutations["preferences:savePreferences"]).not.toHaveBeenCalled();
  });
});
