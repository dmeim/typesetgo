import { StrictMode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { getFunctionName } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { raceFixture } from "./fixtures/race-state";
import RaceLobby from "@/pages/RaceLobby";
import RaceResults from "@/pages/RaceResults";
import RaceActive from "@/pages/RaceActive";
import Race from "@/pages/Race";
import EmojiPicker from "@/components/race/EmojiPicker";
import {
  AppAuthContext,
  unavailableAuth,
} from "@/components/layout/useAppAuth";
import type { AppAuthUser } from "@/components/layout/useAppAuth";
import type { TypingAreaProps } from "@/components/typing/TypingArea";

const mocks = vi.hoisted(() => ({
  queries: {} as Record<string, unknown>,
  mutations: {} as Record<string, ReturnType<typeof vi.fn>>,
  typing: null as TypingAreaProps | null,
}));
vi.mock("convex/react", () => ({
  useQuery: (ref: Parameters<typeof getFunctionName>[0], args: unknown) =>
    args === "skip" ? undefined : mocks.queries[getFunctionName(ref)],
  useMutation: (ref: Parameters<typeof getFunctionName>[0]) =>
    (mocks.mutations[getFunctionName(ref)] ??= vi
      .fn()
      .mockResolvedValue(undefined)),
}));
vi.mock("@/hooks/useSessionId", () => ({ useSessionId: () => "self" }));
vi.mock("@/components/layout/Header", () => ({ default: () => null }));
vi.mock("@/components/typing/TypingArea", () => ({
  default: (props: TypingAreaProps) => {
    mocks.typing = props;
    return <div data-testid="typing" />;
  },
}));

function Location() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}
function page(path: string) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Location />
      <Routes>
        <Route path="/race" element={<Race />} />
        <Route path="/race/lobby/:lobbyId" element={<RaceLobby />} />
        <Route path="/race/results/:raceId" element={<RaceResults />} />
        <Route path="/race/:raceId" element={<RaceActive />} />
      </Routes>
    </MemoryRouter>
  );
}
function setFixture() {
  const fixture = raceFixture();
  mocks.queries = {
    "rooms:getById": fixture.room,
    "participants:listByRoom": fixture.participants,
    "participants:getBySession": fixture.participant,
    "raceResults:getResults": fixture.results,
  };
  return fixture;
}

beforeEach(() => {
  mocks.mutations = {};
  mocks.typing = null;
  setFixture();
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Race route recovery and membership", () => {
  it.each(["/race/lobby/missing", "/race/missing", "/race/results/missing"])(
    "separates loading and missing on %s",
    (path) => {
      mocks.queries["rooms:getById"] = undefined;
      const view = render(page(path));
      expect(screen.getByRole("status")).toHaveTextContent("Loading");
      mocks.queries["rooms:getById"] = null;
      view.rerender(page(path));
      expect(screen.getByRole("heading")).toHaveTextContent(/not found/i);
      expect(screen.getByRole("link", { name: "Back to Race" })).toBeVisible();
    },
  );

  it("uses stored ownership without the host URL parameter and ignores a forged flag", () => {
    const view = render(page("/race/lobby/race-room"));
    expect(
      screen.getByRole("heading", { name: "Race Settings" }),
    ).toBeVisible();
    const fixture = setFixture();
    mocks.queries["rooms:getById"] = { ...fixture.room, hostId: "other" };
    view.rerender(page("/race/lobby/race-room?host=true"));
    expect(screen.queryByRole("heading", { name: "Race Settings" })).toBeNull();
  });

  it.each(["/race/lobby/race-room", "/race/results/race-room"])(
    "awaits disconnect before leaving %s and exposes rejection",
    async (path) => {
      const fixture = setFixture();
      mocks.queries["rooms:getById"] = {
        ...fixture.room,
        status: "active",
        raceStartTime: 1,
        ...(path.includes("results")
          ? { raceEndTime: 2 }
          : { raceStartTime: undefined }),
      };
      let reject!: (reason: Error) => void;
      mocks.mutations["participants:disconnect"] = vi.fn().mockImplementation(
        () =>
          new Promise((_, rejectPromise) => {
            reject = rejectPromise;
          }),
      );
      render(page(path));
      fireEvent.click(screen.getByRole("button", { name: "Leave Race" }));
      expect(screen.getByTestId("location")).toHaveTextContent(path);
      expect(screen.getByRole("button", { name: "Leaving…" })).toBeDisabled();
      await act(async () => reject(new Error("offline")));
      expect(screen.getByRole("alert")).toHaveTextContent("Could not leave");
      expect(screen.getByTestId("location")).toHaveTextContent(path);
      mocks.mutations["participants:disconnect"].mockResolvedValue(undefined);
      fireEvent.click(screen.getByRole("button", { name: "Leave Race" }));
      await waitFor(() =>
        expect(screen.getByTestId("location").textContent).toBe("/race"),
      );
    },
  );

  it("shows visible action failures and only retries start on a deliberate action", async () => {
    const fixture = setFixture();
    mocks.queries["participants:listByRoom"] = [
      { ...fixture.participant, isReady: true },
    ];
    mocks.mutations["rooms:startRace"] = vi
      .fn()
      .mockRejectedValue(new Error("offline"));
    render(page("/race/lobby/race-room"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("could not start"),
    );
    expect(mocks.mutations["rooms:startRace"]).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Retry race start" }));
    await waitFor(() =>
      expect(mocks.mutations["rooms:startRace"]).toHaveBeenCalledTimes(2),
    );
  });

  it("deduplicates automatic starts in StrictMode and ignores failures from an earlier ready barrier", async () => {
    const fixture = setFixture();
    mocks.queries["participants:listByRoom"] = [
      { ...fixture.participant, isReady: true },
    ];
    let rejectFirst!: (error: Error) => void;
    mocks.mutations["rooms:startRace"] = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockResolvedValue(undefined);
    const view = render(
      <StrictMode>{page("/race/lobby/race-room")}</StrictMode>,
    );
    await waitFor(() =>
      expect(mocks.mutations["rooms:startRace"]).toHaveBeenCalledTimes(1),
    );
    mocks.queries["participants:listByRoom"] = [fixture.participant];
    view.rerender(<StrictMode>{page("/race/lobby/race-room")}</StrictMode>);
    mocks.queries["participants:listByRoom"] = [
      { ...fixture.participant, isReady: true },
    ];
    view.rerender(<StrictMode>{page("/race/lobby/race-room")}</StrictMode>);
    await waitFor(() =>
      expect(mocks.mutations["rooms:startRace"]).toHaveBeenCalledTimes(2),
    );
    await act(async () => rejectFirst(new Error("Old attempt failed")));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Retry race start" }),
    ).toBeNull();
    view.rerender(<StrictMode>{page("/race/lobby/race-room")}</StrictMode>);
    expect(mocks.mutations["rooms:startRace"]).toHaveBeenCalledTimes(2);
  });

  it("allows a signed-in account without username or first name to enter a racer name", async () => {
    const fixture = setFixture();
    mocks.mutations["rooms:create"] = vi
      .fn()
      .mockResolvedValue({ roomId: fixture.room._id, code: "ABC123" });
    mocks.mutations["participants:join"] = vi
      .fn()
      .mockResolvedValue({ room: fixture.room });
    render(
      <AppAuthContext.Provider
        value={{
          ...unavailableAuth,
          isSignedIn: true,
          user: { username: null, firstName: null } as AppAuthUser,
        }}
      >
        {page("/race")}
      </AppAuthContext.Provider>,
    );
    expect(screen.getByRole("button", { name: "Create Race" })).toBeDisabled();
    fireEvent.change(screen.getAllByLabelText("Racer name")[0], {
      target: { value: "Guest name" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Race" }));
    await waitFor(() =>
      expect(mocks.mutations["participants:join"]).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Guest name", gameMode: "race" }),
      ),
    );
  });
});

it("retries joining a created room without creating another room", async () => {
  const fixture = setFixture();
  mocks.mutations["rooms:create"] = vi
    .fn()
    .mockResolvedValue({ roomId: fixture.room._id, code: "ABC123" });
  mocks.mutations["participants:join"] = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue({ room: fixture.room });
  render(page("/race"));
  fireEvent.change(screen.getAllByLabelText("Racer name")[0], {
    target: { value: "Racer" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create Race" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Room ABC123 was created",
    ),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Retry joining your room" }),
  );
  await waitFor(() =>
    expect(screen.getByTestId("location").textContent).toBe(
      "/race/lobby/race-room",
    ),
  );
  expect(mocks.mutations["rooms:create"]).toHaveBeenCalledTimes(1);
  expect(mocks.mutations["participants:join"]).toHaveBeenCalledTimes(2);
});

it("retains a failed name edit and makes readiness errors visible", async () => {
  mocks.mutations["participants:setName"] = vi
    .fn()
    .mockRejectedValue(new Error("offline"));
  mocks.mutations["participants:setReady"] = vi
    .fn()
    .mockRejectedValue(new Error("offline"));
  render(page("/race/lobby/race-room"));
  fireEvent.click(
    screen.getByRole("button", { name: "Edit racer name: Racer" }),
  );
  fireEvent.change(screen.getByLabelText("Racer name"), {
    target: { value: "New name" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not save your name",
    ),
  );
  expect(screen.getByLabelText("Racer name")).toHaveValue("New name");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(screen.getByRole("button", { name: "Ready Up" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not update readiness",
    ),
  );
});

describe("Race exact resume and progress", () => {
  function activeFixture() {
    const fixture = setFixture();
    mocks.queries["rooms:getById"] = {
      ...fixture.room,
      status: "active",
      raceStartTime: Date.now() - 10000,
      targetText: "hello world",
    };
    mocks.queries["participants:getBySession"] = {
      ...fixture.participant,
      typedText: "helxo ",
      typedProgress: 3,
      stats: { ...fixture.participant.stats, progress: 30, timeElapsed: 4000 },
    };
    return fixture;
  }
  const stats = {
    typedText: "helxo ",
    typedLength: 6,
    totalLength: 11,
    correctChars: 3,
    incorrectChars: 1,
    missedChars: 0,
    extraChars: 0,
    wpm: 30,
    rawWpm: 40,
    accuracy: 75,
    progress: 30,
    elapsedMs: 4000,
    isFinished: false,
  };

  it("seeds exact incorrect input and elapsed time once, keeps callbacks stable across reactive snapshots, and throttles/deduplicates writes", async () => {
    vi.useFakeTimers();
    const fixture = activeFixture();
    const view = render(page("/race/race-room"));
    expect(mocks.typing).toMatchObject({
      initialInput: "helxo ",
      initialElapsedMs: 4000,
    });
    const callback = mocks.typing!.onProgress!;
    act(() => callback(stats));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(
      mocks.mutations["participants:updateProgress"],
    ).toHaveBeenCalledTimes(1);
    mocks.queries["participants:getBySession"] = {
      ...fixture.participant,
      typedText: "server echo",
      stats: { ...fixture.participant.stats, progress: 31 },
    };
    view.rerender(page("/race/race-room"));
    expect(mocks.typing!.onProgress).toBe(callback);
    expect(mocks.typing!.initialInput).toBe("helxo ");
    act(() => {
      callback(stats);
      callback({ ...stats, typedText: "helxo w", typedLength: 7 });
      callback({ ...stats, typedText: "helxo wo", typedLength: 8 });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(499);
    });
    expect(
      mocks.mutations["participants:updateProgress"],
    ).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(
      mocks.mutations["participants:updateProgress"],
    ).toHaveBeenCalledTimes(2);
    expect(
      mocks.mutations["participants:updateProgress"],
    ).toHaveBeenLastCalledWith(
      expect.objectContaining({
        typedText: "helxo wo",
        resetVersion: 0,
        raceStartTime: expect.any(Number),
      }),
    );
  });

  it("requires explicit restart for legacy progress without input and remounts on reset version", async () => {
    const fixture = activeFixture();
    mocks.queries["participants:getBySession"] = {
      ...fixture.participant,
      typedProgress: 3,
    };
    const view = render(page("/race/race-room"));
    expect(
      screen.getByRole("heading", { name: "Restart this attempt" }),
    ).toBeVisible();
    expect(screen.queryByTestId("typing")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Restart my attempt" }));
    await waitFor(() =>
      expect(mocks.mutations["participants:resetStats"]).toHaveBeenCalledTimes(
        1,
      ),
    );
    mocks.queries["participants:getBySession"] = {
      ...fixture.participant,
      typedText: "",
      resetVersion: 1,
    };
    view.rerender(page("/race/race-room"));
    expect(mocks.typing!.initialInput).toBe("");
  });

  it("records the final snapshot atomically and retries with the original finish time", async () => {
    vi.useFakeTimers();
    activeFixture();
    mocks.mutations["participants:recordFinish"] = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ position: 1 });
    render(page("/race/race-room"));
    await act(async () => {
      await mocks.typing!.onFinish!({
        ...stats,
        typedText: "hello world",
        isFinished: true,
        progress: 100,
      });
    });
    const first = mocks.mutations["participants:recordFinish"].mock.calls[0][0];
    expect(first).toMatchObject({
      typedText: "hello world",
      raceStartTime: expect.any(Number),
      resetVersion: 0,
      stats: { isFinished: true },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Retry saving finish" }),
    );
    await act(async () => {});
    expect(
      mocks.mutations["participants:recordFinish"].mock.calls[1][0].finishTime,
    ).toBe(first.finishTime);
  });

  it("keeps the final deadline when a finished racer leaves", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    const fixture = activeFixture();
    const members = [
      fixture.participant,
      ...[1, 2, 3].map((place) => ({
        ...fixture.participant,
        _id: `finisher-${place}` as typeof fixture.participant._id,
        sessionId: `finisher-${place}`,
        finishTime: place * 1000,
        stats: {
          ...fixture.participant.stats,
          isFinished: true,
          progress: 100,
        },
      })),
    ];
    mocks.queries["participants:listByRoom"] = members;
    const view = render(page("/race/race-room"));
    expect(screen.getByText("3s remaining")).toBeVisible();
    mocks.queries["participants:listByRoom"] = members.map((member, index) =>
      index === 1 ? { ...member, isConnected: false } : member,
    );
    view.rerender(page("/race/race-room"));
    expect(screen.getByText("3s remaining")).toBeVisible();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(mocks.mutations["rooms:endRace"]).toHaveBeenCalledTimes(1);
    expect(mocks.mutations["rooms:endRace"]).toHaveBeenCalledWith(expect.objectContaining({
      roomId: fixture.room._id,
      raceStartTime: 90_000,
    }));
  });

  it("finalizes once automatically and clears an end failure only for an explicit retry", async () => {
    const fixture = activeFixture();
    mocks.queries["participants:listByRoom"] = [
      {
        ...fixture.participant,
        stats: { ...fixture.participant.stats, isFinished: true },
      },
    ];
    mocks.mutations["rooms:endRace"] = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    const view = render(<StrictMode>{page("/race/race-room")}</StrictMode>);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Could not finalize"),
    );
    expect(mocks.mutations["rooms:endRace"]).toHaveBeenCalledTimes(1);
    view.rerender(<StrictMode>{page("/race/race-room")}</StrictMode>);
    expect(mocks.mutations["rooms:endRace"]).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Retry results" }));
    await waitFor(() =>
      expect(mocks.mutations["rooms:endRace"]).toHaveBeenCalledTimes(2),
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("has a visible accessible leave dialog and restores focus after Escape", async () => {
    activeFixture();
    render(page("/race/race-room"));
    const trigger = screen.getByRole("button", { name: "Leave Race" });
    fireEvent.click(trigger);
    expect(
      screen.getByRole("dialog", { name: "Leave this race?" }),
    ).toBeVisible();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger).toHaveFocus();
  });
});

it("supports named emoji choices, arrow keys and Escape focus return", async () => {
  render(<EmojiPicker selectedEmoji="🚀" onSelect={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Change avatar" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Rocket" })).toHaveFocus(),
  );
  fireEvent.keyDown(screen.getByRole("button", { name: "Rocket" }), {
    key: "ArrowRight",
  });
  expect(screen.getByRole("button", { name: "Airplane" })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole("button", { name: "Airplane" }), {
    key: "Escape",
  });
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Airplane" })).toBeNull(),
  );
  expect(screen.getByRole("button", { name: "Change avatar" })).toHaveFocus();
});
