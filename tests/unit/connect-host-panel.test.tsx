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

const testsCard = () => screen.getByRole("region", { name: "Tests" });
/** The editor opens from "Add a test or break" or from a test's row. */
const openNewEditor = () => {
  fireEvent.click(within(testsCard()).getByRole("button", { name: "Add a test or break" }));
  return editor();
};

describe("test list", () => {
  it("adds a test to the end of the list", async () => {
    renderHost();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    const form = openNewEditor();
    expect(within(form).getByRole("heading", { name: "Add a test or break" })).toBeInTheDocument();
    fireEvent.click(within(within(form).getByRole("radiogroup", { name: "Test type" })).getByRole("radio", { name: "Words" }));
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
    const form = openNewEditor();
    fireEvent.click(within(form).getByRole("radio", { name: "Break" }));
    expect(await within(form).findByText(/next test starts on its own/)).toBeInTheDocument();
    expect(within(form).queryByRole("radiogroup", { name: "Difficulty" })).not.toBeInTheDocument();
    fireEvent.click(within(form).getByRole("button", { name: "Add to list" }));
    await waitFor(() => expect(mutation("setTests")).toHaveBeenCalledTimes(1));
    expect(lastTests()[2]).toMatchObject({ mode: "break", duration: 30 });
  });

  it("quick-adds a common test", async () => {
    renderHost();
    fireEvent.click(within(testsCard()).getByRole("button", { name: /Break · 30s/ }));
    await waitFor(() => expect(lastTests()[2]).toMatchObject({ mode: "break", duration: 30 }));
  });

  it("validates custom text before saving", async () => {
    renderHost();
    const form = openNewEditor();
    fireEvent.click(within(form).getByRole("radio", { name: "Custom text" }));
    fireEvent.click(within(form).getByRole("button", { name: "Add to list" }));
    expect(await within(form).findByRole("alert")).toHaveTextContent("enter the text to type");
    expect(mutation("setTests")).not.toHaveBeenCalled();
  });

  it("edits a test in place", async () => {
    renderHost();
    fireEvent.click(screen.getByRole("button", { name: /^Edit test 1:/ }));
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
    fireEvent.click(screen.getByRole("button", { name: /^Remove test 1:/ }));
    await waitFor(() => expect(lastTests()).toEqual([words]));
    // The optimistic copy settles back to the server list once the save finishes.
    await waitFor(() => expect(screen.getAllByRole("button", { name: /^Reorder test/ })).toHaveLength(2));
    fireEvent.keyDown(screen.getByRole("button", { name: /^Reorder test 2:/ }), { key: "ArrowUp" });
    await waitFor(() => expect(lastTests()).toEqual([words, timed]));
    fireEvent.click(screen.getByRole("button", { name: /^Duplicate test 1:/ }));
    await waitFor(() => expect(lastTests().map((test) => test.mode)).toEqual(["time", "time", "words"]));
  });

  it("rolls back and reports a rejected save", async () => {
    mutation("setTests").mockRejectedValueOnce(new Error("[CONVEX M(connect:setTests)] Uncaught Error: Tests already reached can't be changed while the room is running"));
    renderHost();
    fireEvent.click(screen.getByRole("button", { name: /^Remove test 1:/ }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      type: "error", description: "Tests already reached can't be changed while the room is running",
    })));
    expect(await screen.findByRole("button", { name: /^Remove test 1:/ })).toBeInTheDocument();
  });

  it("locks tests already reached while running", () => {
    setView({ status: "running", currentIndex: 1, tests: [timed, words, quote] });
    renderHost();
    const items = within(within(testsCard()).getByRole("list")).getAllByRole("listitem");
    expect(within(items[0]).getByText("Locked")).toBeInTheDocument();
    expect(within(items[1]).getByText("Locked")).toBeInTheDocument();
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(screen.queryByRole("button", { name: /^Edit test 2:/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Reorder test 2:/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Edit test 3:/ })).toBeInTheDocument();
    // The first unlocked test can't move above the locked ones.
    fireEvent.keyDown(screen.getByRole("button", { name: /^Reorder test 3:/ }), { key: "ArrowUp" });
    expect(mutation("setTests")).not.toHaveBeenCalled();
  });

  it("locks through the furthest participant in self-paced rooms and shows counts", () => {
    setView({ status: "running", pacing: "participant", tests: [timed, words, quote] }, [participant("a", 0), participant("b", 1), participant("c", 3, { completedAt: 5 })]);
    renderHost();
    expect(screen.queryByRole("button", { name: /^Edit test 2:/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Edit test 3:/ })).not.toBeInTheDocument();
    expect(screen.getByText(/1 on test 1 · 1 on test 2 · 1 done/)).toBeInTheDocument();
    expect(within(testsCard()).getByText("1 finished every test.")).toBeInTheDocument();
  });
});

describe("run controls", () => {
  const pacing = () => within(screen.getByRole("radiogroup", { name: "Pacing" }));

  it("changes pacing only in the lobby", async () => {
    renderHost();
    fireEvent.click(pacing().getByRole("radio", { name: "Own pace" }));
    await waitFor(() => expect(mutation("updateRoom")).toHaveBeenCalledWith({ roomId: "room1", credential: "cred", pacing: "participant" }));
    cleanup();
    setView({ status: "running" });
    renderHost();
    expect(pacing().getByRole("radio", { name: "Own pace" })).toBeDisabled();
    expect(screen.getByText(/Reset the room to change this/)).toBeInTheDocument();
  });

  it("starts from the lobby", async () => {
    renderHost();
    expect(screen.getByText(/2 tests ready/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset room" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(mutation("start")).toHaveBeenCalledWith({ roomId: "room1", credential: "cred" }));
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
  });

  it("shows what a host-led room is waiting on before it moves on by itself", () => {
    vi.useFakeTimers({ now: 100_000 });
    const pause: ConnectTest = { ...timed, id: "b1", mode: "break", duration: 60 };
    setView({ status: "running", tests: [timed, words, pause, quote], currentIndex: 0, stepStartedAt: 90_000 });
    renderHost();
    expect(screen.getAllByText(/Ends in 0:25/).length).toBeGreaterThan(0);
    cleanup();
    setView({ status: "running", tests: [timed, words, pause, quote], currentIndex: 1, stepStartedAt: 90_000 },
      [participant("a", 1, { stats: { wpm: 40, accuracy: 95, progress: 100, wordsTyped: 50, timeElapsed: 9000, isFinished: true } }), participant("b", 1)]);
    renderHost();
    expect(screen.getAllByText(/1 of 2 finished/).length).toBeGreaterThan(0);
    cleanup();
    setView({ status: "running", tests: [timed, words, pause, quote], currentIndex: 1, stepStartedAt: 80_000, stepEndedAt: 95_000 });
    renderHost();
    expect(screen.getAllByText(/Break, next test in 0:55/).length).toBeGreaterThan(0);
    cleanup();
    setView({ status: "running", tests: [timed, words, pause, quote], currentIndex: 3, stepStartedAt: 80_000, stepEndedAt: 95_000 });
    renderHost();
    expect(screen.getAllByText(/Results, finishing in 0:05/).length).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it("pauses, restarts, and moves between tests while running", async () => {
    setView({ status: "running", currentIndex: 0 });
    renderHost();
    const run = within(screen.getByRole("region", { name: "Run the room" }));
    expect(run.getByText(/^Test 1 of 2 · /)).toBeInTheDocument();
    expect(run.getByRole("list", { name: "Test 1 of 2" })).toBeInTheDocument();
    expect(run.getByRole("button", { name: "Previous" })).toBeDisabled();
    fireEvent.click(run.getByRole("button", { name: "Next test" }));
    await waitFor(() => expect(mutation("goToTest")).toHaveBeenCalledWith({ roomId: "room1", credential: "cred", index: 1 }));
    fireEvent.click(run.getByRole("button", { name: "Pause" }));
    await waitFor(() => expect(mutation("pause")).toHaveBeenCalled());
    fireEvent.click(run.getByRole("button", { name: "Restart test" }));
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

  it("asks for a second tap before resetting the room", async () => {
    setView({ status: "running" });
    renderHost();
    fireEvent.click(screen.getByRole("button", { name: "Reset room" }));
    expect(mutation("resetRoom")).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Tap again: clears this run's results" }));
    await waitFor(() => expect(mutation("resetRoom")).toHaveBeenCalled());
  });

  it("ends the room after a second tap and returns to Connect", async () => {
    renderHost();
    expect(screen.getByText(/reopen it from Connect for 48 hours/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "End room" }));
    expect(mutation("endRoom")).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Tap again to end" }));
    expect(await screen.findByText("Connect landing")).toBeInTheDocument();
    expect(mutation("endRoom")).toHaveBeenCalledWith({ roomId: "room1", credential: "cred" });
  });

  it("renames the room", async () => {
    renderHost();
    fireEvent.click(screen.getByRole("button", { name: "Rename room" }));
    fireEvent.change(await screen.findByLabelText("Room name"), { target: { value: "Period 4" } });
    fireEvent.click(screen.getByRole("button", { name: "Save room name" }));
    await waitFor(() => expect(mutation("updateRoom")).toHaveBeenCalledWith({ roomId: "room1", credential: "cred", name: "Period 4" }));
  });
});

describe("code, roster and live board", () => {
  it("shows the code with copy actions and a big view", async () => {
    renderHost();
    const card = within(screen.getByRole("region", { name: "Room code" }));
    expect(card.getByRole("img", { name: "Room code A B C D" })).toHaveTextContent("ABCD");
    expect(card.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
    expect(card.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
    fireEvent.click(card.getByRole("button", { name: /Show big/ }));
    const big = await screen.findByRole("dialog", { name: "Room code, large" });
    expect(big).toHaveTextContent("ABCD");
    // The card's tiles move into the big view and come back when it closes.
    const outsideBig = () => screen.getAllByRole("img", { name: "Room code A B C D" }).filter((tiles) => !big.contains(tiles));
    expect(outsideBig()).toHaveLength(0);
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(outsideBig()).toHaveLength(1));
  });

  it("restarts, lets a late arrival start, and removes players after confirming", async () => {
    setView({ status: "running", currentIndex: 0 }, [participant("Ana", 0), participant("Leo", 0, { lateForRun: 1 })]);
    renderHost();
    const roster = within(screen.getByRole("region", { name: "Who's here" }));
    expect(roster.getByText(/2 joined · 2 online · 1 waiting/)).toBeInTheDocument();
    fireEvent.click(roster.getByRole("button", { name: "Restart Ana's attempt" }));
    expect(roster.getByText("Restart Ana's attempt? Earlier results stay.")).toBeInTheDocument();
    fireEvent.click(roster.getByRole("button", { name: "Restart" }));
    await waitFor(() => expect(mutation("resetParticipant")).toHaveBeenCalledWith(expect.objectContaining({ participantId: "Ana" })));
    fireEvent.click(await roster.findByRole("button", { name: "Let Leo start now" }));
    fireEvent.click(roster.getByRole("button", { name: "Start now" }));
    await waitFor(() => expect(mutation("resetParticipant")).toHaveBeenCalledWith(expect.objectContaining({ participantId: "Leo" })));
    fireEvent.click(await roster.findByRole("button", { name: "Remove Ana" }));
    expect(roster.getByText("Remove Ana? They can rejoin with the code.")).toBeInTheDocument();
    fireEvent.click(roster.getByRole("button", { name: "Cancel" }));
    expect(mutation("removeParticipant")).not.toHaveBeenCalled();
    fireEvent.click(await roster.findByRole("button", { name: "Remove Ana" }));
    fireEvent.click(roster.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(mutation("removeParticipant")).toHaveBeenCalledWith(expect.objectContaining({ participantId: "Ana" })));
  });

  it("puts the live board in fullscreen, a pop-out, or a new tab", async () => {
    const open = vi.fn().mockReturnValue({});
    vi.stubGlobal("open", open);
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    HTMLElement.prototype.requestFullscreen = requestFullscreen;
    setView({}, [participant("Ana", 0)]);
    renderHost();
    const board = within(screen.getByRole("region", { name: "Live board" }));
    expect(board.getByRole("group", { name: "Board settings" })).toBeInTheDocument();
    expect(board.getByRole("article", { name: "Ana" })).toBeInTheDocument();
    expect(board.getByRole("link", { name: /New tab/ })).toHaveAttribute("href", "/connect/host/room1/board");
    fireEvent.click(board.getByRole("button", { name: /Pop out/ }));
    expect(open).toHaveBeenCalledWith("/connect/host/room1/board", expect.any(String), expect.stringContaining("popup"));
    fireEvent.click(board.getByRole("button", { name: /Fullscreen/ }));
    await waitFor(() => expect(requestFullscreen).toHaveBeenCalled());
    expect(requestFullscreen.mock.contexts[0]).toHaveAttribute("data-board", "live");
  });
});

describe("everyone gets", () => {
  const ghostOverride = { enabled: true, ghostWriterEnabled: true, ghostWriterSpeed: 70 };
  const everyone = () => within(screen.getByRole("region", { name: "Everyone gets" }));

  it("toggles a group and sends the whole overrides object", async () => {
    setView({ overrides: { ghost: ghostOverride } });
    renderHost();
    expect(everyone().getByText(/1 of 5 set for the room/)).toBeInTheDocument();
    fireEvent.click(everyone().getByRole("switch", { name: "Everyone gets the same theme" }));
    await waitFor(() => expect(mutation("updateRoom")).toHaveBeenCalledWith({
      roomId: "room1", credential: "cred",
      overrides: { ghost: ghostOverride, theme: { enabled: true, themeId: "typesetgo", mode: "dark" } },
    }));
  });

  it("keeps values when a group is turned off and hides its controls", async () => {
    setView({ overrides: { ghost: ghostOverride } });
    renderHost();
    expect(everyone().getByText("Ghost at 70 wpm")).toBeInTheDocument();
    fireEvent.click(everyone().getByRole("switch", { name: "Everyone gets the same ghost racer" }));
    await waitFor(() => expect(mutation("updateRoom")).toHaveBeenCalledWith(expect.objectContaining({
      overrides: { ghost: { ...ghostOverride, enabled: false } },
    })));
    expect(everyone().getByRole("switch", { name: "Everyone gets the same on-screen keyboard" })).toHaveAttribute("aria-checked", "false");
    expect(everyone().queryByRole("switch", { name: "Show the keyboard" })).not.toBeInTheDocument();
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
