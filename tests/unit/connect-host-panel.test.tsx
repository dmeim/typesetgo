import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { getFunctionName } from "convex/server";
import ConnectHost from "@/pages/ConnectHost";
import type { ConnectTest } from "@/lib/connect-types";

const mocks = vi.hoisted(() => ({
  view: undefined as unknown,
  mutations: {} as Record<string, ReturnType<typeof vi.fn>>,
  toast: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: () => mocks.view,
  useMutation: (ref: Parameters<typeof getFunctionName>[0]) => mocks.mutations[getFunctionName(ref)] ??= vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/components/layout/Header", () => ({ default: () => null }));
vi.mock("@/lib/toast-manager", () => ({ toast: { add: mocks.toast } }));
vi.mock("@/hooks/useMultiplayerCredential", () => ({ useMultiplayerCredential: () => "cred" }));
vi.mock("@/lib/themes", () => ({
  fetchThemeCatalogIndex: async () => ({ version: 1, themes: [{ id: "typesetgo", name: "TypeSetGo", category: "default", defaultVariantId: "default", variants: [{ id: "default", label: "Default", light: true, swatches: ["#000", "#111", "#222", "#333"] }] }] }),
}));
vi.mock("@/lib/sounds", () => ({
  fetchSoundManifest: async () => ({ typing: { creamy: [] }, warning: { clock: [] } }),
  getSoundPacks: (manifest: Record<string, object> | null, category: string) => Object.keys(manifest?.[category] ?? {}),
}));
vi.mock("@/lib/words", () => ({ fetchWordsManifest: async () => ({ difficulties: ["easy", "medium", "hard"], default: "medium" }) }));
vi.mock("@/lib/quotes", () => ({ fetchQuotesManifest: async () => ({ lengths: ["short", "long"], default: "short" }) }));

const timed: ConnectTest = { id: "t1", mode: "time", duration: 30, wordTarget: 25, difficulty: "medium", punctuation: false, numbers: false, capitalization: false, quoteLength: "all" };
const words: ConnectTest = { ...timed, id: "t2", mode: "words", wordTarget: 50 };
const quote: ConnectTest = { ...timed, id: "t3", mode: "quote" };

function room(overrides: Record<string, unknown> = {}) {
  return {
    _id: "room1", _creationTime: 0, code: "ABCD", name: "Period 3", hostName: "Ms. K",
    tests: [timed, words], pacing: "host", overrides: {}, status: "lobby", currentIndex: 0, runVersion: 1,
    createdAt: 0, lastActiveAt: 0, expiresAt: 0, ...overrides,
  };
}

function participant(id: string, stepIndex: number, extra: Record<string, unknown> = {}) {
  return {
    _id: id, _creationTime: 0, roomId: "room1", name: id, isConnected: true, lastSeen: 0, joinedAt: 0, stepIndex, attempt: 0,
    stats: { wpm: 0, accuracy: 0, progress: 0, wordsTyped: 0, timeElapsed: 0, isFinished: false }, results: [], ...extra,
  };
}

function setView(roomOverrides: Record<string, unknown> = {}, participants: unknown[] = []) {
  mocks.view = { state: "ok", room: room(roomOverrides), participants };
}

function renderHost() {
  return render(
    <MemoryRouter initialEntries={["/connect/host/room1"]}>
      <Routes>
        <Route path="/connect/host/:roomId" element={<ConnectHost />} />
        <Route path="/connect" element={<p>Connect landing</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const mutation = (name: string) => (mocks.mutations[`connect:${name}`] ??= vi.fn().mockResolvedValue(undefined));
const lastTests = () => mutation("setTests").mock.calls.at(-1)?.[0].tests as ConnectTest[];
const editor = () => screen.getByRole("form");

beforeEach(() => {
  mocks.mutations = {};
  mocks.toast.mockReset();
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  // jsdom has no layout APIs; the editor scrolls into view when a test is opened for editing.
  Element.prototype.scrollIntoView = vi.fn();
  setView();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("state screens", () => {
  it("shows loading and missing states", () => {
    mocks.view = undefined;
    const { rerender } = renderHost();
    expect(screen.getByRole("status")).toHaveTextContent("Loading room");
    mocks.view = { state: "missing" };
    rerender(<MemoryRouter initialEntries={["/connect/host/room1"]}><Routes><Route path="/connect/host/:roomId" element={<ConnectHost />} /></Routes></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Room not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to Connect/ })).toHaveAttribute("href", "/connect");
  });

  it("offers takeover from another browser and shows a refusal", async () => {
    mocks.view = { state: "forbidden" };
    mutation("reopenRoom").mockRejectedValueOnce(new Error("[CONVEX M(connect:reopenRoom)] Server Error\nUncaught Error: Only the room host can reopen this room\n  at handler"));
    renderHost();
    expect(screen.getByRole("heading", { name: "This room is hosted from another browser" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Host from this browser" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Only the room host can reopen this room");
    expect(mutation("reopenRoom")).toHaveBeenCalledWith({ roomId: "room1", credential: "cred" });
  });

  it("reopens an ended room", async () => {
    mocks.view = { state: "ended", room: { _id: "room1", name: "Period 3" } };
    mutation("reopenRoom").mockResolvedValueOnce({ roomId: "room1", code: "WXYZ" });
    renderHost();
    expect(screen.getByRole("heading", { name: "This room has ended" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reopen room" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Room open with code WXYZ" })));
  });
});

describe("test list", () => {
  it("adds a test to the end of the list", async () => {
    renderHost();
    const form = editor();
    fireEvent.click(within(within(form).getByRole("radiogroup", { name: "Test mode" })).getByRole("radio", { name: "Words" }));
    fireEvent.click(within(form).getByRole("button", { name: "Add to list" }));
    await waitFor(() => expect(mutation("setTests")).toHaveBeenCalledTimes(1));
    const tests = lastTests();
    expect(tests.slice(0, 2)).toEqual([timed, words]);
    expect(tests[2]).toMatchObject({ mode: "words", wordTarget: 25 });
    expect(tests[2].id).toEqual(expect.any(String));
    expect(tests[2]).not.toHaveProperty("presetText");
  });

  it("adds a break with only a duration and a title", async () => {
    renderHost();
    const form = editor();
    fireEvent.click(within(form).getByRole("radio", { name: "Break" }));
    expect(within(form).getByText(/next test starts on its own/)).toBeInTheDocument();
    expect(within(form).queryByLabelText("Difficulty")).not.toBeInTheDocument();
    fireEvent.click(within(form).getByRole("button", { name: "Add to list" }));
    await waitFor(() => expect(mutation("setTests")).toHaveBeenCalledTimes(1));
    expect(lastTests()[2]).toMatchObject({ mode: "break", duration: 30 });
  });

  it("validates custom text before saving", () => {
    renderHost();
    const form = editor();
    fireEvent.click(within(form).getByRole("radio", { name: "Custom text" }));
    fireEvent.click(within(form).getByRole("button", { name: "Add to list" }));
    expect(within(form).getByRole("alert")).toHaveTextContent("enter the text to type");
    expect(mutation("setTests")).not.toHaveBeenCalled();
  });

  it("edits a test in place", async () => {
    renderHost();
    fireEvent.click(screen.getByRole("button", { name: "Edit test 1" }));
    const form = editor();
    expect(within(form).getByRole("heading", { name: "Edit test" })).toBeInTheDocument();
    fireEvent.click(within(within(form).getByRole("radiogroup", { name: "Duration" })).getByRole("radio", { name: "1m" }));
    fireEvent.change(within(form).getByLabelText(/Title/), { target: { value: "Warm-up" } });
    fireEvent.click(within(form).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mutation("setTests")).toHaveBeenCalledTimes(1));
    expect(lastTests()).toEqual([{ ...timed, duration: 60, title: "Warm-up" }, words]);
  });

  it("removes, duplicates, and reorders tests", async () => {
    renderHost();
    fireEvent.click(screen.getByRole("button", { name: "Remove test 1" }));
    await waitFor(() => expect(lastTests()).toEqual([words]));
    // The optimistic copy settles back to the server list once the save finishes.
    await waitFor(() => expect(screen.getByRole("button", { name: "Move test 2 up" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Move test 2 up" }));
    await waitFor(() => expect(lastTests()).toEqual([words, timed]));
    fireEvent.click(screen.getByRole("button", { name: "Duplicate test 1" }));
    await waitFor(() => expect(lastTests().map((test) => test.mode)).toEqual(["time", "time", "words"]));
  });

  it("rolls back and reports a rejected save", async () => {
    mutation("setTests").mockRejectedValueOnce(new Error("[CONVEX M(connect:setTests)] Uncaught Error: Tests already reached can't be changed while the room is running"));
    renderHost();
    fireEvent.click(screen.getByRole("button", { name: "Remove test 1" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      type: "error", description: "Tests already reached can't be changed while the room is running",
    })));
    expect(screen.getByRole("button", { name: "Remove test 1" })).toBeInTheDocument();
  });

  it("locks tests already reached while running", () => {
    setView({ status: "running", currentIndex: 1, tests: [timed, words, quote] });
    renderHost();
    const items = within(screen.getByRole("region", { name: "Tests" })).getAllByRole("listitem");
    expect(within(items[0]).getByText("Locked")).toBeInTheDocument();
    expect(within(items[1]).getByText("Locked")).toBeInTheDocument();
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(screen.queryByRole("button", { name: "Edit test 2" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit test 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move test 3 up" })).toBeDisabled();
  });

  it("locks through the furthest participant in self-paced rooms and shows counts", () => {
    setView({ status: "running", pacing: "participant", tests: [timed, words, quote] }, [participant("a", 0), participant("b", 1), participant("c", 3, { completedAt: 5 })]);
    renderHost();
    expect(screen.queryByRole("button", { name: "Edit test 2" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit test 3" })).not.toBeInTheDocument();
    expect(screen.getByText(/1 on test 1 · 1 on test 2 · 1 done/)).toBeInTheDocument();
  });
});

describe("run controls", () => {
  const pacing = () => within(screen.getByRole("radiogroup", { name: "Pacing" }));

  it("changes pacing only in the lobby", async () => {
    renderHost();
    fireEvent.click(pacing().getByRole("radio", { name: "Self-paced" }));
    await waitFor(() => expect(mutation("updateRoom")).toHaveBeenCalledWith({ roomId: "room1", credential: "cred", pacing: "participant" }));
    cleanup();
    setView({ status: "running" });
    renderHost();
    expect(pacing().getByRole("radio", { name: "Self-paced" })).toBeDisabled();
    expect(screen.getByText(/Reset the room to change pacing/)).toBeInTheDocument();
  });

  it("starts from the lobby", async () => {
    renderHost();
    expect(screen.getByText(/2 tests ready/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(mutation("start")).toHaveBeenCalledWith({ roomId: "room1", credential: "cred" }));
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
  });

  it("pauses, restarts, and moves between tests while running", async () => {
    setView({ status: "running", currentIndex: 0 });
    renderHost();
    expect(screen.getByText("Test 1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous test" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next test" }));
    await waitFor(() => expect(mutation("goToTest")).toHaveBeenCalledWith({ roomId: "room1", credential: "cred", index: 1 }));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    await waitFor(() => expect(mutation("pause")).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Restart test" }));
    await waitFor(() => expect(mutation("restartTest")).toHaveBeenCalled());
  });

  it("finishes on the last test and resumes when paused", async () => {
    setView({ status: "paused", currentIndex: 1 });
    renderHost();
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    await waitFor(() => expect(mutation("goToTest")).toHaveBeenCalledWith(expect.objectContaining({ index: 2 })));
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    await waitFor(() => expect(mutation("start")).toHaveBeenCalled());
  });

  it("offers Start again when complete and hides host navigation in self-paced rooms", () => {
    setView({ status: "complete", currentIndex: 2 });
    renderHost();
    expect(screen.getByRole("button", { name: "Start again" })).toBeInTheDocument();
    cleanup();
    setView({ status: "running", pacing: "participant" });
    renderHost();
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next test" })).not.toBeInTheDocument();
  });

  it("confirms before resetting the room", async () => {
    setView({ status: "running" });
    renderHost();
    fireEvent.click(screen.getByRole("button", { name: "Reset room" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("results from this run are cleared");
    fireEvent.click(within(dialog).getByRole("button", { name: "Reset room" }));
    await waitFor(() => expect(mutation("resetRoom")).toHaveBeenCalled());
  });

  it("ends the room after confirmation and returns to Connect", async () => {
    renderHost();
    fireEvent.click(screen.getByRole("button", { name: "End room" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("48 hours");
    fireEvent.click(within(dialog).getByRole("button", { name: "End room" }));
    expect(await screen.findByText("Connect landing")).toBeInTheDocument();
    expect(mutation("endRoom")).toHaveBeenCalledWith({ roomId: "room1", credential: "cred" });
  });
});

describe("participant settings", () => {
  const ghostOverride = { enabled: true, ghostWriterEnabled: true, ghostWriterSpeed: 70 };

  it("toggles a group and sends the whole overrides object", async () => {
    setView({ overrides: { ghost: ghostOverride } });
    renderHost();
    fireEvent.click(screen.getByRole("switch", { name: "Use room setting for theme" }));
    await waitFor(() => expect(mutation("updateRoom")).toHaveBeenCalledWith({
      roomId: "room1", credential: "cred",
      overrides: { ghost: ghostOverride, theme: { enabled: true, themeId: "typesetgo", mode: "dark" } },
    }));
  });

  it("keeps values when a group is turned off and disables its controls", async () => {
    setView({ overrides: { ghost: ghostOverride } });
    renderHost();
    fireEvent.click(screen.getByRole("switch", { name: "Use room setting for ghost writer" }));
    await waitFor(() => expect(mutation("updateRoom")).toHaveBeenCalledWith(expect.objectContaining({
      overrides: { ghost: { ...ghostOverride, enabled: false } },
    })));
    expect(screen.getByRole("switch", { name: "Use room setting for keyboard" })).not.toBeChecked();
    expect(screen.getByLabelText("Show on-screen keyboard")).toBeDisabled();
  });

  it("debounces rapid edits into one save", async () => {
    vi.useFakeTimers();
    setView({ overrides: { ghost: ghostOverride } });
    renderHost();
    const slider = screen.getByRole("slider", { name: "Ghost speed" });
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(mutation("updateRoom")).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(450); });
    expect(mutation("updateRoom")).toHaveBeenCalledTimes(1);
    expect(mutation("updateRoom").mock.calls[0][0].overrides.ghost.ghostWriterSpeed).toBe(72);
  });
});
