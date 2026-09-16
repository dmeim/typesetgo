import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { getFunctionName } from "convex/server";
import Join from "@/pages/Join";
import Host from "@/pages/Host";

const mocks = vi.hoisted(() => ({
  join: vi.fn(),
  create: vi.fn(),
  disconnect: vi.fn(),
  room: undefined as unknown,
  participants: undefined as unknown,
}));
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ mode: "dark" }) }));
vi.mock("@/hooks/useSessionId", () => ({
  useSessionId: () => "fixture-session",
}));
vi.mock("@/components/typing/TypingPractice", () => ({
  default: () => <div>Practice fixture</div>,
}));
vi.mock("convex/react", () => ({
  useQuery: (reference: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(reference) === "rooms:getByCode"
      ? mocks.room
      : mocks.participants,
  useMutation: (reference: Parameters<typeof getFunctionName>[0]) => {
    const name = getFunctionName(reference);
    return name === "participants:join"
      ? mocks.join
      : name === "rooms:create"
        ? mocks.create
        : name === "participants:disconnect"
          ? mocks.disconnect
          : vi.fn();
  },
}));
vi.mock("@/lib/themes", () => ({ fetchAllThemes: async () => [] }));
vi.mock("@/lib/sounds", () => ({ fetchSoundManifest: async () => ({}) }));
vi.mock("@/lib/words", () => ({
  fetchWordsManifest: async () => ({ difficulties: [] }),
}));
vi.mock("@/lib/quotes", () => ({
  fetchQuotesManifest: async () => ({ lengths: [] }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.room = undefined;
  mocks.participants = undefined;
});

describe("room request recovery", () => {
  it("clears the old join error only after a deliberate successful retry", async () => {
    mocks.join
      .mockRejectedValueOnce(new Error("Temporarily unavailable"))
      .mockResolvedValueOnce({ participantId: "p1" });
    mocks.room = {
      _id: "room",
      status: "waiting",
      settings: { mode: "time", duration: 30 },
    };
    mocks.participants = [{ _id: "p1", isConnected: true }];
    render(
      <MemoryRouter initialEntries={["/connect/join?code=ABC&name=Test"]}>
        <Join />
      </MemoryRouter>,
    );
    await screen.findByText("Temporarily unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Practice fixture")).toBeVisible();
    expect(
      screen.queryByText("Temporarily unavailable"),
    ).not.toBeInTheDocument();
    expect(mocks.join).toHaveBeenCalledTimes(2);
  });

  it("stops after a failed join and offers a deliberate retry", async () => {
    mocks.join
      .mockRejectedValueOnce(new Error("Room not found"))
      .mockImplementation(() => new Promise(() => {}));
    render(
      <MemoryRouter initialEntries={["/connect/join?code=BAD&name=Test"]}>
        <Join />
      </MemoryRouter>,
    );
    await screen.findByText("Room not found");
    await waitFor(() => expect(mocks.join).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: /retry/i })).toBeVisible();
  });
  it("stops after failed room creation and offers recovery", async () => {
    mocks.create
      .mockRejectedValueOnce(new Error("Connection unavailable"))
      .mockImplementation(() => new Promise(() => {}));
    render(
      <MemoryRouter initialEntries={["/connect/host?name=Test"]}>
        <Host />
      </MemoryRouter>,
    );
    await waitFor(() => expect(mocks.create).toHaveBeenCalled());
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("button", { name: /retry/i })).toBeVisible();
  });
});


it("waits for a pending join and disconnects its result before canceling navigation", async () => {
  let resolveJoin!: (value: { participantId: string }) => void;
  mocks.join.mockImplementation(() => new Promise((resolve) => { resolveJoin = resolve; }));
  mocks.disconnect.mockResolvedValue(undefined);
  function Path() { return <output data-testid="path">{useLocation().pathname}</output>; }
  render(<MemoryRouter initialEntries={["/connect/join?code=ABC&name=Test"]}>
    <Path /><Routes><Route path="/connect/join" element={<Join />} />
      <Route path="/connect" element={<p>Connect hub</p>} /></Routes>
  </MemoryRouter>);
  await waitFor(() => expect(mocks.join).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByText("Cancel", { exact: true }));
  expect(screen.getByTestId("path")).toHaveTextContent("/connect/join");
  await act(async () => resolveJoin({ participantId: "pending-participant" }));
  await waitFor(() => expect(mocks.disconnect).toHaveBeenCalledWith({ participantId: "pending-participant" }));
  expect(await screen.findByText("Connect hub")).toBeVisible();
});

it("keeps the canceled join recoverable when disconnect fails", async () => {
  mocks.join.mockResolvedValue({ participantId: "pending-participant" });
  mocks.disconnect.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(undefined);
  render(<MemoryRouter initialEntries={["/connect/join?code=ABC&name=Test"]}>
    <Routes><Route path="/connect/join" element={<Join />} />
      <Route path="/connect" element={<p>Connect hub</p>} /></Routes>
  </MemoryRouter>);
  await waitFor(() => expect(mocks.join).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "Cancel", exact: true }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to leave");
  expect(screen.queryByText("Connect hub")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry leaving" }));
  expect(await screen.findByText("Connect hub")).toBeVisible();
  expect(mocks.disconnect).toHaveBeenCalledTimes(2);
  expect(mocks.join).toHaveBeenCalledTimes(1);
});
