import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { getFunctionName } from "convex/server";
import { ConvexError } from "convex/values";
import type { ReactNode } from "react";
import ConnectRoom from "@/pages/ConnectRoom";
import { loadMembership, saveMembership } from "@/lib/connect-membership";
import { DEFAULT_CONNECT_TEST, emptyConnectStats, type ConnectStats, type ConnectTest } from "@/lib/connect-types";
import type { SettingsState } from "@/lib/typing-constants";

type View = Record<string, unknown> & { state: string };
type FixtureProps = {
  lockedSettings: Partial<SettingsState>;
  isTestActive: boolean;
  initialAttempt?: { typedText: string; targetText: string; elapsedMs: number; isFinished: boolean };
  onStatsUpdate: (stats: ConnectStats, typedText?: string, targetText?: string) => void;
  connectResultsActions?: ReactNode;
};

const state = vi.hoisted(() => ({
  view: undefined as unknown,
  viewArgs: undefined as unknown,
  showResults: false,
  mounts: 0,
  props: {} as FixtureProps,
  mutations: {} as Record<string, ReturnType<typeof vi.fn>>,
}));

vi.mock("@/hooks/useSessionId", () => ({ useSessionId: () => "session-1" }));
vi.mock("@/hooks/useMultiplayerCredential", () => ({ useMultiplayerCredential: () => "cred-1" }));
vi.mock("convex/react", () => ({
  useQuery: (_reference: unknown, args: unknown) => {
    state.viewArgs = args;
    return args === "skip" ? undefined : state.view;
  },
  useMutation: (reference: Parameters<typeof getFunctionName>[0]) => state.mutations[getFunctionName(reference)],
}));
vi.mock("@/components/typing/TypingPractice", async () => {
  const React = await import("react");
  return {
    default: function PracticeFixture(props: FixtureProps) {
      state.props = props;
      React.useEffect(() => { state.mounts++; }, []);
      return (
        <div>
          <input aria-label="Practice input" defaultValue={props.initialAttempt?.typedText ?? ""} disabled={!props.isTestActive} />
          {state.showResults && props.connectResultsActions}
        </div>
      );
    },
  };
});

const test = (id: string, overrides: Partial<ConnectTest> = {}): ConnectTest => ({ ...DEFAULT_CONNECT_TEST, id, ...overrides });
const tests = [test("t1"), test("t2", { duration: 300 }), test("t3", { mode: "words" })];

function okView({ room = {}, participant = {} }: { room?: Record<string, unknown>; participant?: Record<string, unknown> } = {}): View {
  return {
    state: "ok",
    room: { _id: "room-1", code: "ABCD", name: "Period 3", hostName: "Ms. Lee", status: "running", pacing: "host",
      currentIndex: 0, runVersion: 1, tests, overrides: {}, ...room },
    participant: { _id: "p1", name: "Ada", isConnected: true, stepIndex: 0, attempt: 0, stats: emptyConnectStats(),
      results: [], ...participant },
  };
}

function renderRoom() {
  return render(
    <MemoryRouter initialEntries={["/connect/room/room-1"]}>
      <Routes>
        <Route path="/connect/room/:roomId" element={<ConnectRoom />} />
        <Route path="/connect" element={<p>Connect landing</p>} />
        <Route path="/connect/join" element={<p>Join form</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const stats = (updates: Partial<ConnectStats> = {}): ConnectStats => ({ ...emptyConnectStats(), wpm: 40, accuracy: 95, progress: 10, timeElapsed: 1000, ...updates });
const failure = (code: string) => new ConvexError({ code, message: code });

beforeEach(() => {
  localStorage.clear();
  state.view = okView();
  state.viewArgs = undefined;
  state.showResults = false;
  state.mounts = 0;
  state.props = {} as FixtureProps;
  state.mutations = {
    "connect:rejoin": vi.fn(async () => ({ participantId: "p1" })),
    "connect:participantHeartbeat": vi.fn(async () => ({ state: "ok" })),
    "connect:reportProgress": vi.fn(async () => ({ accepted: true })),
    "connect:advance": vi.fn(async () => ({ accepted: true, stepIndex: 1, completed: false })),
    "connect:leave": vi.fn(async () => null),
  };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
});

describe("membership and presence", () => {
  it("rejoins by session id when this browser has no stored membership", async () => {
    renderRoom();
    await waitFor(() => expect(state.mutations["connect:rejoin"]).toHaveBeenCalledWith({ roomId: "room-1", sessionId: "session-1", credential: "cred-1" }));
    expect(await screen.findByLabelText("Practice input")).toBeInTheDocument();
    expect(state.viewArgs).toEqual({ roomId: "room-1", participantId: "p1", credential: "cred-1" });
    expect(loadMembership("room-1")).toEqual({ participantId: "p1", name: "Ada" });
  });

  it("uses stored membership without rejoining", async () => {
    saveMembership("room-1", { participantId: "p1", name: "Ada" });
    renderRoom();
    expect(await screen.findByLabelText("Practice input")).toBeInTheDocument();
    expect(state.mutations["connect:rejoin"]).not.toHaveBeenCalled();
  });

  it("sends a non-member to the join form", async () => {
    state.mutations["connect:rejoin"].mockRejectedValue(failure("not_member"));
    renderRoom();
    expect(await screen.findByRole("heading", { name: "You're not in this room yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Join with a code/ })).toHaveAttribute("href", "/connect/join");
  });

  it("shows the removed screen with a way to join again", async () => {
    saveMembership("room-1", { participantId: "p1", name: "Ada" });
    state.view = { state: "removed" };
    renderRoom();
    expect(await screen.findByRole("heading", { name: "The host removed you from this room" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Join again/ })).toHaveAttribute("href", "/connect/join");
  });

  it("shows the ended screen and forgets the membership", async () => {
    saveMembership("room-1", { participantId: "p1", name: "Ada" });
    state.view = { state: "ended" };
    renderRoom();
    expect(await screen.findByRole("heading", { name: "This room has ended" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to Connect/ })).toHaveAttribute("href", "/connect");
    expect(loadMembership("room-1")).toBeNull();
  });

  it("replaces a stale stored participant by rejoining once", async () => {
    saveMembership("room-1", { participantId: "stale", name: "Ada" });
    state.view = { state: "missing" };
    state.mutations["connect:rejoin"].mockImplementation(async () => {
      state.view = okView();
      return { participantId: "p1" };
    });
    renderRoom();
    expect(await screen.findByLabelText("Practice input")).toBeInTheDocument();
    expect(loadMembership("room-1")?.participantId).toBe("p1");
    expect(state.mutations["connect:rejoin"]).toHaveBeenCalledTimes(1);
  });

  it("rejoins automatically when the heartbeat reports the seat offline", async () => {
    saveMembership("room-1", { participantId: "p1", name: "Ada" });
    state.mutations["connect:participantHeartbeat"].mockResolvedValueOnce({ state: "offline" });
    renderRoom();
    await waitFor(() => expect(state.mutations["connect:rejoin"]).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Practice input")).toBeInTheDocument();
  });

  it("beats again when the page becomes visible or the network returns", async () => {
    saveMembership("room-1", { participantId: "p1", name: "Ada" });
    renderRoom();
    await waitFor(() => expect(state.mutations["connect:participantHeartbeat"]).toHaveBeenCalledTimes(1));
    await act(async () => { window.dispatchEvent(new Event("online")); });
    await waitFor(() => expect(state.mutations["connect:participantHeartbeat"]).toHaveBeenCalledTimes(2));
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    await waitFor(() => expect(state.mutations["connect:participantHeartbeat"]).toHaveBeenCalledTimes(3));
  });

  it("retries failed heartbeats quietly and only then shows Reconnecting", async () => {
    vi.useFakeTimers();
    saveMembership("room-1", { participantId: "p1", name: "Ada" });
    state.mutations["connect:participantHeartbeat"].mockRejectedValueOnce(new Error("offline")).mockRejectedValueOnce(new Error("offline"));
    renderRoom();
    await act(async () => {});
    expect(screen.queryByText("Reconnecting…")).not.toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(screen.getByText("Reconnecting…")).toBeInTheDocument();
    expect(screen.getByLabelText("Practice input")).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(screen.queryByText("Reconnecting…")).not.toBeInTheDocument();
  });

  it("leaves the room, forgets the membership, and returns to Connect", async () => {
    saveMembership("room-1", { participantId: "p1", name: "Ada" });
    renderRoom();
    fireEvent.click(await screen.findByRole("button", { name: /Leave/ }));
    expect(await screen.findByText("Connect landing")).toBeInTheDocument();
    expect(state.mutations["connect:leave"]).toHaveBeenCalledWith({ participantId: "p1", credential: "cred-1" });
    expect(loadMembership("room-1")).toBeNull();
  });
});

describe("room states", () => {
  beforeEach(() => saveMembership("room-1", { participantId: "p1", name: "Ada" }));

  it("waits in the lobby with the participant's name and the test list", async () => {
    state.view = okView({ room: { status: "lobby" } });
    renderRoom();
    expect(await screen.findByRole("heading", { name: "Waiting for the host to start" })).toBeInTheDocument();
    expect(screen.getAllByText("Ada").length).toBeGreaterThan(0);
    expect(screen.getByRole("list", { name: "Tests in this room" }).children).toHaveLength(3);
    expect(screen.queryByLabelText("Practice input")).not.toBeInTheDocument();
  });

  it("shows where the participant is in the list", async () => {
    state.view = okView({ room: { currentIndex: 1 } });
    renderRoom();
    expect(await screen.findByText("Test 2 of 3")).toBeInTheDocument();
    expect(screen.getByText(/2nd timed test · Time · 5:00/)).toBeInTheDocument();
    expect(Array.from(screen.getByTestId("test-strip").children).map((node) => node.getAttribute("data-phase")))
      .toEqual(["done", "current", "upcoming"]);
  });

  it("locks the current test's settings and pauses input without losing the attempt", async () => {
    state.view = okView({ participant: { typedText: "cat", targetText: "cat dog", stats: stats({ timeElapsed: 4000 }) } });
    const view = renderRoom();
    expect(await screen.findByLabelText("Practice input")).toHaveValue("cat");
    expect(state.props.lockedSettings).toMatchObject({ mode: "time", duration: 30 });
    expect(state.props.initialAttempt).toEqual({ typedText: "cat", targetText: "cat dog", elapsedMs: 4000, isFinished: false });
    expect(state.props.isTestActive).toBe(true);
    state.view = okView({ room: { status: "paused" }, participant: { typedText: "cat", targetText: "cat dog", stats: stats({ timeElapsed: 4000 }) } });
    view.rerender(
      <MemoryRouter initialEntries={["/connect/room/room-1"]}>
        <Routes><Route path="/connect/room/:roomId" element={<ConnectRoom />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Paused by the host")).toBeInTheDocument();
    expect(state.props.isTestActive).toBe(false);
    expect(state.mounts).toBe(1);
  });

  it("does not restore typing without its target text", async () => {
    state.view = okView({ participant: { typedText: "old", stats: stats() } });
    renderRoom();
    await screen.findByLabelText("Practice input");
    expect(state.props.initialAttempt).toBeUndefined();
  });

  it("remounts the typing surface when the attempt identity changes", async () => {
    const view = renderRoom();
    await screen.findByLabelText("Practice input");
    const rerender = () => view.rerender(
      <MemoryRouter initialEntries={["/connect/room/room-1"]}>
        <Routes><Route path="/connect/room/:roomId" element={<ConnectRoom />} /></Routes>
      </MemoryRouter>,
    );
    state.view = okView({ participant: { stats: stats() } });
    rerender();
    expect(state.mounts).toBe(1);
    state.view = okView({ participant: { attempt: 1 } });
    rerender();
    expect(state.mounts).toBe(2);
    state.view = okView({ room: { runVersion: 2 }, participant: { attempt: 1 } });
    rerender();
    expect(state.mounts).toBe(3);
    state.view = okView({ room: { runVersion: 2, currentIndex: 1 }, participant: { attempt: 1 } });
    rerender();
    expect(state.mounts).toBe(4);
    expect(state.props.lockedSettings).toMatchObject({ duration: 300 });
  });

  it.each([[0, "Waiting for the host to start the next test"], [2, "That was the last test"]])(
    "waits for the host after finishing test %i under host pacing", async (currentIndex, message) => {
      state.showResults = true;
      state.view = okView({ room: { currentIndex } });
      renderRoom();
      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Next test/ })).not.toBeInTheDocument();
    });

  it("summarises every result when the room is complete", async () => {
    state.view = okView({ room: { status: "complete", currentIndex: 3 }, participant: { results: [
      { stepIndex: 0, testId: "t1", wpm: 40, accuracy: 90, progress: 100, wordsTyped: 20, timeElapsed: 30000, finished: true },
      { stepIndex: 1, testId: "t2", wpm: 60, accuracy: 100, progress: 100, wordsTyped: 30, timeElapsed: 30000, finished: true },
    ] } });
    renderRoom();
    expect(await screen.findByRole("heading", { name: "All done, Ada!" })).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();
    expect(screen.getByText("No result")).toBeInTheDocument();
  });
});

describe("self-paced advancing", () => {
  beforeEach(() => saveMembership("room-1", { participantId: "p1", name: "Ada" }));

  it("advances after the final result is delivered, shows Up next, then the next test", async () => {
    state.showResults = true;
    state.view = okView({ room: { pacing: "participant" } });
    const view = renderRoom();
    const next = await screen.findByRole("button", { name: /Next test/ });
    expect(next).toBeDisabled();
    await act(async () => state.props.onStatsUpdate(stats({ isFinished: true, progress: 100 }), "cat", "cat"));
    await waitFor(() => expect(screen.getByRole("button", { name: /Next test/ })).toBeEnabled());
    fireEvent.keyDown(document.body, { key: "Enter" });
    await waitFor(() => expect(state.mutations["connect:advance"]).toHaveBeenCalledWith({ participantId: "p1", credential: "cred-1", runVersion: 1, stepIndex: 0 }));
    expect(await screen.findByRole("heading", { name: "Up next" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Tests in this room" }).querySelector("[aria-current='step']")).toHaveTextContent("2nd timed test");
    expect(screen.queryByLabelText("Practice input")).not.toBeInTheDocument();
    state.view = okView({ room: { pacing: "participant" }, participant: { stepIndex: 1 } });
    view.rerender(
      <MemoryRouter initialEntries={["/connect/room/room-1"]}>
        <Routes><Route path="/connect/room/:roomId" element={<ConnectRoom />} /></Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(await screen.findByLabelText("Practice input")).toBeInTheDocument();
    expect(state.props.lockedSettings).toMatchObject({ duration: 300 });
  });

  it("continues from the splash automatically", async () => {
    vi.useFakeTimers();
    state.showResults = true;
    state.view = okView({ room: { pacing: "participant" }, participant: { stats: stats({ isFinished: true }) } });
    state.mutations["connect:reportProgress"].mockResolvedValue({ accepted: false });
    renderRoom();
    await act(async () => {});
    await act(async () => state.props.onStatsUpdate(stats({ isFinished: true }), "cat", "cat"));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Next test/ })); });
    expect(screen.getByRole("heading", { name: "Up next" })).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(2600));
    expect(screen.queryByRole("heading", { name: "Up next" })).not.toBeInTheDocument();
  });
});

describe("progress delivery", () => {
  beforeEach(() => saveMembership("room-1", { participantId: "p1", name: "Ada" }));

  it("throttles reports, sends the final snapshot immediately, and tags the attempt", async () => {
    renderRoom();
    await screen.findByLabelText("Practice input");
    vi.useFakeTimers();
    const report = state.mutations["connect:reportProgress"];
    await act(async () => {
      state.props.onStatsUpdate(stats(), "c", "cat");
      state.props.onStatsUpdate(stats(), "c", "cat");
      state.props.onStatsUpdate(stats({ progress: 20 }), "ca", "cat");
    });
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenLastCalledWith(expect.objectContaining({ participantId: "p1", credential: "cred-1", runVersion: 1, stepIndex: 0, attempt: 0, typedText: "c" }));
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(report).toHaveBeenCalledTimes(2);
    expect(report).toHaveBeenLastCalledWith(expect.objectContaining({ typedText: "ca" }));
    await act(async () => state.props.onStatsUpdate(stats({ isFinished: true }), "cat", "cat"));
    expect(report).toHaveBeenCalledTimes(3);
  });

  it("keeps a failed final snapshot and retries it automatically or on request", async () => {
    state.showResults = true;
    const report = state.mutations["connect:reportProgress"];
    report.mockRejectedValueOnce(new Error("offline")).mockRejectedValueOnce(new Error("offline"));
    renderRoom();
    await screen.findByLabelText("Practice input");
    vi.useFakeTimers();
    await act(async () => state.props.onStatsUpdate(stats({ isFinished: true }), "cat", "cat"));
    expect(screen.getByRole("button", { name: /Retry sync/ })).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(report).toHaveBeenCalledTimes(2);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Retry sync/ })); });
    expect(report).toHaveBeenCalledTimes(3);
    expect(report.mock.calls[2][0]).toMatchObject({ typedText: "cat", stats: { isFinished: true } });
    expect(screen.queryByRole("button", { name: /Retry sync/ })).not.toBeInTheDocument();
  });

  it("drops undelivered snapshots when the attempt changes", async () => {
    let reject!: (error: Error) => void;
    const report = state.mutations["connect:reportProgress"];
    report.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
    const view = renderRoom();
    await screen.findByLabelText("Practice input");
    act(() => state.props.onStatsUpdate(stats({ isFinished: true }), "old", "old"));
    state.view = okView({ participant: { attempt: 1 } });
    view.rerender(
      <MemoryRouter initialEntries={["/connect/room/room-1"]}>
        <Routes><Route path="/connect/room/:roomId" element={<ConnectRoom />} /></Routes>
      </MemoryRouter>,
    );
    await act(async () => reject(new Error("offline")));
    await act(async () => state.props.onStatsUpdate(stats(), "new", "new"));
    expect(report).toHaveBeenCalledTimes(2);
    expect(report.mock.calls[1][0]).toMatchObject({ attempt: 1, typedText: "new" });
  });

  it("does not report while the room is paused", async () => {
    state.view = okView({ room: { status: "paused" } });
    renderRoom();
    await screen.findByLabelText("Practice input");
    await act(async () => state.props.onStatsUpdate(stats(), "c", "cat"));
    expect(state.mutations["connect:reportProgress"]).not.toHaveBeenCalled();
  });
});
