import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { getFunctionName } from "convex/server";
import Join from "@/pages/Join";
import type { SettingsState } from "@/lib/typing-constants";

const state = vi.hoisted(() => ({
  room: {
    _id: "room",
    status: "active",
    runVersion: 1,
    settings: { mode: "time", duration: 30 } as Partial<SettingsState>,
  },
  participant: { _id: "p1", isConnected: true, resetVersion: 0 },
  join: vi.fn(),
  update: vi.fn(),
  disconnect: vi.fn(),
  mount: vi.fn(),
  props: {} as {
    lockedSettings: Partial<SettingsState>;
    isTestActive: boolean;
    onStatsUpdate: (
      stats: Record<string, unknown>,
      typedText?: string,
      targetText?: string,
    ) => void;
    onLeave: () => void;
  },
}));
vi.mock("@/hooks/useSessionId", () => ({ useSessionId: () => "fixture" }));
vi.mock("convex/react", () => ({
  useQuery: (reference: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(reference) === "rooms:getByCode"
      ? state.room
      : [state.participant],
  useMutation: (reference: Parameters<typeof getFunctionName>[0]) => {
    const name = getFunctionName(reference);
    return name === "participants:join"
      ? state.join
      : name === "participants:disconnect"
        ? state.disconnect
        : state.update;
  },
}));
vi.mock("@/components/typing/TypingPractice", async () => {
  const React = await import("react");
  return {
    default: (props: typeof state.props) => {
      state.props = props;
      React.useEffect(() => {
        state.mount();
      }, []);
      return (
        <>
          <input aria-label="Practice input" defaultValue="" />
          <button onClick={props.onLeave}>Leave room</button>
        </>
      );
    },
  };
});
const stats = {
  wpm: 45,
  accuracy: 95,
  progress: 10,
  wordsTyped: 4,
  timeElapsed: 12000,
  isFinished: false,
};
function View() {
  return (
    <MemoryRouter initialEntries={["/connect/join?code=ABC&name=Name"]}>
      <Join />
    </MemoryRouter>
  );
}

beforeEach(() => {
  state.room = {
    _id: "room",
    status: "active",
    runVersion: 1,
    settings: { mode: "time", duration: 30 },
  };
  state.participant = { _id: "p1", isConnected: true, resetVersion: 0 };
  state.join.mockResolvedValue({ participantId: "p1" });
  state.update.mockResolvedValue(null);
  state.disconnect.mockResolvedValue(null);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("participant session lifecycle", () => {
  it("runs the selected host step with the shared sound pack and remounts when the host advances", async () => {
    state.room = {
      ...state.room,
      status: "waiting",
      settings: {
        mode: "plan",
        planIndex: 0,
        soundEnabled: true,
        typingSound: "creamy",
        warningSound: "clock",
        errorSound: "",
        plan: [
          {
            id: "one",
            mode: "words",
            settings: { wordTarget: 10 },
            metadata: { title: "Words", subtitle: "" },
            syncSettings: { waitForAll: false, zenWaiting: false },
          },
          {
            id: "two",
            mode: "preset",
            settings: {
              presetModeType: "time",
              presetText: "Hello",
              duration: 45,
              typingSound: "local",
            },
            metadata: { title: "Timed text", subtitle: "" },
            syncSettings: { waitForAll: false, zenWaiting: false },
          },
        ],
      },
    };
    const rendered = render(<View />);
    await screen.findByLabelText("Practice input");
    expect(state.props.lockedSettings).toMatchObject({
      mode: "words",
      wordTarget: 10,
      typingSound: "creamy",
    });
    expect(state.props.lockedSettings).not.toHaveProperty("plan");
    state.room = {
      ...state.room,
      settings: { ...state.room.settings, planIndex: 1 },
    };
    rendered.rerender(<View />);
    expect(state.mount).toHaveBeenCalledTimes(2);
    expect(state.props.lockedSettings).toMatchObject({
      mode: "preset",
      presetModeType: "time",
      duration: 45,
      typingSound: "creamy",
    });
  });

  it("keeps the executor mounted for progress updates, resets on run/reset identities, and freezes on Stop", async () => {
    const rendered = render(<View />);
    const input = await screen.findByLabelText("Practice input");
    fireEvent.change(input, { target: { value: "typed" } });
    const callback = state.props.onStatsUpdate;
    rendered.rerender(<View />);
    expect(state.mount).toHaveBeenCalledTimes(1);
    expect(state.props.onStatsUpdate).toBe(callback);
    state.room = { ...state.room, status: "waiting" };
    rendered.rerender(<View />);
    expect(state.props.isTestActive).toBe(false);
    expect(screen.getByLabelText("Practice input")).toHaveValue("typed");
    act(() => state.props.onStatsUpdate(stats));
    expect(state.update).not.toHaveBeenCalled();
    state.room = { ...state.room, status: "active", runVersion: 2 };
    rendered.rerender(<View />);
    expect(state.mount).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Practice input")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Practice input"), {
      target: { value: "again" },
    });
    state.participant = { ...state.participant, resetVersion: 1 };
    rendered.rerender(<View />);
    expect(state.mount).toHaveBeenCalledTimes(3);
    expect(screen.getByLabelText("Practice input")).toHaveValue("");
  });
  it("deduplicates reports, sends final state immediately, and tags every report with run/reset versions", async () => {
    render(<View />);
    await screen.findByLabelText("Practice input");
    act(() => {
      state.props.onStatsUpdate(stats, "abc", "abcdef");
      state.props.onStatsUpdate(stats, "abc", "abcdef");
    });
    expect(state.update).toHaveBeenCalledTimes(1);
    expect(state.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        participantId: "p1",
        runVersion: 1,
        resetVersion: 0,
        typedText: "abc",
      }),
    );
    act(() =>
      state.props.onStatsUpdate(
        { ...stats, isFinished: true },
        "abcdef",
        "abcdef",
      ),
    );
    expect(state.update).toHaveBeenCalledTimes(2);
    expect(state.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        stats: expect.objectContaining({ isFinished: true }),
      }),
    );
  });
  it("drops a pending trailing report when the host stops", async () => {
    const rendered = render(<View />);
    await screen.findByLabelText("Practice input");
    vi.useFakeTimers();
    act(() => {
      state.props.onStatsUpdate(stats, "a", "abcdef");
      state.props.onStatsUpdate({ ...stats, progress: 20 }, "ab", "abcdef");
    });
    expect(state.update).toHaveBeenCalledTimes(1);
    state.room = { ...state.room, status: "waiting" };
    rendered.rerender(<View />);
    await act(() => vi.advanceTimersByTimeAsync(600));
    expect(state.update).toHaveBeenCalledTimes(1);
  });
  it("disconnects membership before leaving", async () => {
    render(<View />);
    await screen.findByLabelText("Practice input");
    fireEvent.click(screen.getByRole("button", { name: "Leave room" }));
    await waitFor(() =>
      expect(state.disconnect).toHaveBeenCalledWith({ participantId: "p1" }),
    );
  });
});
