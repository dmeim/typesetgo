import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ConnectBoard from "@/pages/ConnectBoard";
import { ParticipantBoard } from "@/components/connect/board/ParticipantBoard";
import { BoardControls } from "@/components/connect/board/BoardControls";
import {
  averageResults,
  boardCounts,
  effectiveTestIndex,
  headlineStats,
  participantStatus,
  progressDetail,
  reorderIds,
  sortParticipants,
  testSegments,
  visibleParticipants,
} from "@/components/connect/board/board-model";
import { DEFAULT_BOARD_PREFS, type BoardPrefs } from "@/hooks/useConnectBoardPrefs";
import type { HostParticipant, HostRoom } from "@/components/connect/types";
import { DEFAULT_CONNECT_TEST, emptyConnectStats, type ConnectStats, type ConnectTest } from "@/lib/connect-types";

const page = vi.hoisted(() => ({ view: undefined as unknown, args: undefined as unknown }));
vi.mock("convex/react", () => ({
  useQuery: (_ref: unknown, args: unknown) => { page.args = args; return page.view; },
  useMutation: () => vi.fn().mockResolvedValue({ state: "ok" }),
}));
vi.mock("@/hooks/useMultiplayerCredential", () => ({ useMultiplayerCredential: () => "credential-1" }));

const tests: ConnectTest[] = [
  { ...DEFAULT_CONNECT_TEST, id: "t1", mode: "time", duration: 30 },
  { ...DEFAULT_CONNECT_TEST, id: "t2", mode: "words", wordTarget: 25 },
  { ...DEFAULT_CONNECT_TEST, id: "t3", mode: "time", duration: 60 },
  { ...DEFAULT_CONNECT_TEST, id: "t4", mode: "quote" },
];

function makeRoom(overrides: Partial<HostRoom> = {}): HostRoom {
  return {
    _id: "room", _creationTime: 0, code: "ABCD", name: "Period 3", hostName: "Ms. Rivera",
    tests, pacing: "host", overrides: {}, status: "running", currentIndex: 0, runVersion: 1,
    createdAt: 0, lastActiveAt: 0, expiresAt: 0, ...overrides,
  } as unknown as HostRoom;
}

let seq = 0;
function makeParticipant(name: string, overrides: Partial<Omit<HostParticipant, "stats">> & { stats?: Partial<ConnectStats> } = {}): HostParticipant {
  seq += 1;
  const { stats, ...rest } = overrides;
  return {
    _id: `p-${name}`, _creationTime: 0, roomId: "room", name, isConnected: true, lastSeen: 0, joinedAt: seq,
    stepIndex: 0, attempt: 0, results: [], ...rest,
    stats: { ...emptyConnectStats(), ...stats },
  } as unknown as HostParticipant;
}

const prefs = (changes: Partial<BoardPrefs> = {}): BoardPrefs => ({ ...DEFAULT_BOARD_PREFS, ...changes });

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("board model", () => {
  it("derives participant status across room states", () => {
    const running = makeRoom();
    expect(participantStatus(makeRoom({ status: "lobby" }), makeParticipant("a"))).toBe("waiting");
    expect(participantStatus(running, makeParticipant("a"))).toBe("waiting");
    expect(participantStatus(running, makeParticipant("a", { stats: { timeElapsed: 2000, wpm: 40 } }))).toBe("typing");
    expect(participantStatus(running, makeParticipant("a", { stats: { isFinished: true, progress: 100 } }))).toBe("finished");
    expect(participantStatus(makeRoom({ status: "paused" }), makeParticipant("a", { stats: { timeElapsed: 1 } }))).toBe("paused");
    expect(participantStatus(makeRoom({ status: "complete", currentIndex: 4 }), makeParticipant("a"))).toBe("done");
    expect(participantStatus(running, makeParticipant("a", { isConnected: false }))).toBe("offline");
    expect(participantStatus(running, makeParticipant("a", { isConnected: false, leftAt: 5 }))).toBe("left");
    const ownPace = makeRoom({ pacing: "participant" });
    expect(participantStatus(ownPace, makeParticipant("a", { stepIndex: 4, completedAt: 9 }))).toBe("done");
  });

  it("uses the room index under host pacing and the participant step otherwise", () => {
    const participant = makeParticipant("a", { stepIndex: 2 });
    expect(effectiveTestIndex(makeRoom({ currentIndex: 1 }), participant)).toBe(1);
    expect(effectiveTestIndex(makeRoom({ pacing: "participant", currentIndex: 0 }), participant)).toBe(2);
    expect(effectiveTestIndex(makeRoom({ pacing: "participant" }), makeParticipant("b", { stepIndex: 4, completedAt: 1 }))).toBe(4);
    expect(testSegments(makeRoom({ pacing: "participant" }), participant)).toEqual(["done", "done", "current", "upcoming"]);
    expect(testSegments(makeRoom({ status: "lobby" }), participant)).toEqual(["upcoming", "upcoming", "upcoming", "upcoming"]);
  });

  it("describes progress as time left, words typed, or percent", () => {
    expect(progressDetail(makeRoom(), makeParticipant("a", { stats: { timeElapsed: 6000 } }))).toEqual({ percent: 20, label: "0:24 left" });
    expect(progressDetail(makeRoom({ currentIndex: 1 }), makeParticipant("a", { stats: { wordsTyped: 10 } }))).toEqual({ percent: 40, label: "10/25 words" });
    expect(progressDetail(makeRoom({ currentIndex: 3 }), makeParticipant("a", { stats: { progress: 62.4 } }))).toEqual({ percent: 62.4, label: "62%" });
    expect(progressDetail(makeRoom({ status: "lobby" }), makeParticipant("a"))).toEqual({ percent: 0, label: "Not started" });
    expect(progressDetail(makeRoom(), makeParticipant("a", { stats: { isFinished: true, timeElapsed: 30000 } })).label).toBe("Time's up");
  });

  it("averages recorded results and shows the average once done", () => {
    const results = [
      { stepIndex: 0, testId: "t1", wpm: 40, accuracy: 90, progress: 100, wordsTyped: 20, timeElapsed: 30000, finished: true },
      { stepIndex: 1, testId: "t2", wpm: 60, accuracy: 100, progress: 100, wordsTyped: 25, timeElapsed: 20000, finished: true },
      { stepIndex: 2, testId: "t3", wpm: 0, accuracy: 0, progress: 0, wordsTyped: 0, timeElapsed: 0, finished: false },
    ];
    expect(averageResults(results)).toEqual({ wpm: 50, accuracy: 95, count: 2 });
    expect(averageResults([])).toBeNull();
    const done = makeParticipant("a", { stepIndex: 4, completedAt: 1, results });
    expect(headlineStats(makeRoom({ pacing: "participant" }), done)).toEqual({ wpm: 50, accuracy: 95, isAverage: true });
    expect(headlineStats(makeRoom(), makeParticipant("b", { stats: { wpm: 33, accuracy: 97 } }))).toEqual({ wpm: 33, accuracy: 97, isAverage: false });
  });

  it("sorts present participants first and honours sort, direction, and custom order", () => {
    const room = makeRoom();
    const zed = makeParticipant("Zed", { stats: { wpm: 80, timeElapsed: 1 } });
    const amy = makeParticipant("amy", { stats: { wpm: 20, timeElapsed: 1 } });
    const off = makeParticipant("Bob", { isConnected: false, stats: { wpm: 99, timeElapsed: 1 } });
    const list = [off, zed, amy];
    const names = (items: HostParticipant[]) => items.map((p) => p.name);
    expect(names(sortParticipants(room, list, prefs({ sort: "join" })))).toEqual(["Zed", "amy", "Bob"]);
    expect(names(sortParticipants(room, list, prefs({ sort: "name" })))).toEqual(["amy", "Zed", "Bob"]);
    expect(names(sortParticipants(room, list, prefs({ sort: "wpm", descending: true })))).toEqual(["Zed", "amy", "Bob"]);
    expect(names(sortParticipants(room, list, prefs({ sort: "wpm" })))).toEqual(["amy", "Zed", "Bob"]);
    expect(names(sortParticipants(room, list, prefs({ sort: "custom", customOrder: ["p-amy"] })))).toEqual(["amy", "Zed", "Bob"]);
    expect(names(visibleParticipants(room, list, prefs({ showOffline: false })))).toEqual(["Zed", "amy"]);
    expect(reorderIds(["a", "b", "c"], "c", "a")).toEqual(["c", "a", "b"]);
    expect(boardCounts(room, list)).toMatchObject({ online: 2, typing: 2, finished: 0, total: 3 });
  });
});

describe("participant board", () => {
  it("shows the shared test once under host pacing", () => {
    const room = makeRoom({ currentIndex: 2 });
    render(<ParticipantBoard room={room} participants={[makeParticipant("Ana", { stats: { wpm: 41.6, accuracy: 96.2, timeElapsed: 15000 } })]} prefs={prefs()} />);
    const summary = screen.getByRole("region", { name: "Room progress" });
    expect(within(summary).getByRole("heading", { name: "Test 3 of 4" })).toBeInTheDocument();
    expect(within(summary).getByText("2nd timed test · Time · 60s")).toBeInTheDocument();
    const card = screen.getByRole("article", { name: "Ana" });
    expect(within(card).getByText("Typing")).toBeInTheDocument();
    expect(within(card).getByText("42")).toBeInTheDocument();
    expect(within(card).getByText("96")).toBeInTheDocument();
    expect(within(card).getByText("0:45 left")).toBeInTheDocument();
    expect(within(card).queryByText(/Test 3 of 4/)).not.toBeInTheDocument();
  });

  it("shows each participant's position and test strip under participant pacing", () => {
    const room = makeRoom({ pacing: "participant" });
    const results = [{ stepIndex: 0, testId: "t1", wpm: 50, accuracy: 98, progress: 100, wordsTyped: 25, timeElapsed: 30000, finished: true }];
    render(<ParticipantBoard room={room} participants={[
      makeParticipant("Ana", { stepIndex: 2, results }),
      makeParticipant("Ben", { stepIndex: 4, completedAt: 1, results }),
    ]} prefs={prefs()} />);
    const ana = screen.getByRole("article", { name: "Ana" });
    expect(within(ana).getByText("Test 3 of 4 · 2nd timed test")).toBeInTheDocument();
    expect(within(ana).getByRole("list", { name: "2 of 4 tests done" })).toBeInTheDocument();
    expect(within(ana).getByText("avg 50 wpm")).toBeInTheDocument();
    const ben = screen.getByRole("article", { name: "Ben" });
    expect(within(ben).getByText("All done")).toBeInTheDocument();
    expect(within(ben).getByText("avg wpm")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Room progress" })).getByText("all done")).toBeInTheDocument();
  });

  it("dims offline participants, sorts them last, and hides them when showOffline is off", () => {
    const room = makeRoom();
    const participants = [makeParticipant("Off", { isConnected: false }), makeParticipant("On")];
    const { rerender } = render(<ParticipantBoard room={room} participants={participants} prefs={prefs()} />);
    const items = within(screen.getByRole("list", { name: "Participants" })).getAllByRole("article");
    expect(items.map((item) => item.getAttribute("aria-label"))).toEqual(["On", "Off"]);
    expect(screen.getByRole("article", { name: "Off" }).closest("li")).toHaveAttribute("data-away", "true");
    rerender(<ParticipantBoard room={room} participants={participants} prefs={prefs({ showOffline: false })} />);
    expect(screen.queryByRole("article", { name: "Off" })).not.toBeInTheDocument();
    expect(screen.getByText("1 offline participant hidden")).toBeInTheDocument();
  });

  it("offers reset and remove only when handlers are given", () => {
    const room = makeRoom();
    const participant = makeParticipant("Ana");
    const { rerender } = render(<ParticipantBoard room={room} participants={[participant]} prefs={prefs({ sort: "custom" })} />);
    expect(screen.queryByRole("button", { name: "Reset Ana" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Ana" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reorder Ana" })).not.toBeInTheDocument();
    const onReset = vi.fn();
    const onRemove = vi.fn();
    rerender(<ParticipantBoard room={room} participants={[participant]} prefs={prefs({ sort: "custom" })} onReset={onReset} onRemove={onRemove} onReorder={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Reset Ana" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Ana" }));
    expect(onReset).toHaveBeenCalledWith(participant);
    expect(onRemove).toHaveBeenCalledWith(participant);
    expect(screen.getByRole("button", { name: "Reorder Ana" })).toBeInTheDocument();
  });

  it("explains how to join when the room is empty", () => {
    render(<ParticipantBoard room={makeRoom({ status: "lobby" })} participants={[]} prefs={prefs()} emptyHint="Enter code ABCD" />);
    expect(screen.getByText("No one has joined yet")).toBeInTheDocument();
    expect(screen.getByText("Enter code ABCD")).toBeInTheDocument();
  });
});

describe("board controls", () => {
  it("changes layout, sort with a natural direction, and offline visibility", () => {
    const onChange = vi.fn();
    render(<BoardControls prefs={prefs()} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "List layout" }));
    expect(onChange).toHaveBeenLastCalledWith({ layout: "list" });
    fireEvent.change(screen.getByLabelText("Sort"), { target: { value: "wpm" } });
    expect(onChange).toHaveBeenLastCalledWith({ sort: "wpm", descending: true });
    fireEvent.click(screen.getByRole("button", { name: /switch to descending/ }));
    expect(onChange).toHaveBeenLastCalledWith({ descending: true });
    fireEvent.click(screen.getByRole("switch", { name: "Show offline" }));
    expect(onChange).toHaveBeenLastCalledWith({ showOffline: false });
    expect(screen.getByRole("slider", { name: "Card size" })).toHaveAttribute("aria-valuenow", "1");
  });
});

describe("pop-out board page", () => {
  const renderPage = () => render(
    <MemoryRouter initialEntries={["/connect/host/room/board"]}>
      <Routes><Route path="/connect/host/:roomId/board" element={<ConnectBoard />} /></Routes>
    </MemoryRouter>,
  );

  it("shows the join code and a read-only board", () => {
    page.view = { state: "ok", room: makeRoom(), participants: [makeParticipant("Ana")] };
    renderPage();
    expect(page.args).toEqual({ roomId: "room", credential: "credential-1" });
    expect(screen.getByRole("heading", { name: "Period 3" })).toBeInTheDocument();
    expect(screen.getByLabelText("Room code A B C D")).toHaveTextContent("ABCD");
    expect(screen.getByText(/\/connect\/join$/)).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Ana" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reset|Remove|Reorder/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Board settings" })).not.toBeInTheDocument();
  });

  it("explains forbidden and ended rooms", () => {
    page.view = { state: "forbidden" };
    renderPage();
    expect(screen.getByRole("heading", { name: "Open this board from the browser that hosts the room" })).toBeInTheDocument();
    cleanup();
    page.view = { state: "ended", room: { _id: "room", name: "Period 3" } };
    renderPage();
    expect(screen.getByRole("heading", { name: "Period 3 has ended" })).toBeInTheDocument();
  });
});
