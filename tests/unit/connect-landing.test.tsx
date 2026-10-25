import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { getFunctionName } from "convex/server";
import { ConvexError } from "convex/values";
import Connect from "@/pages/Connect";
import { AppAuthContext, unavailableAuth, type AppAuth } from "@/components/layout/useAppAuth";
import { readableError } from "@/components/connect/connect-errors";
import { joinErrorMessage, sanitizeCode } from "@/components/connect/landing/landing-helpers";

const mocks = vi.hoisted(() => ({
  mutations: {} as Record<string, ReturnType<typeof vi.fn>>,
  queries: {} as Record<string, unknown>,
  queryArgs: {} as Record<string, unknown>,
}));

vi.mock("convex/react", () => ({
  useQuery: (ref: Parameters<typeof getFunctionName>[0], args: unknown) => {
    const name = getFunctionName(ref);
    mocks.queryArgs[name] = args;
    if (args === "skip") return undefined;
    const value = mocks.queries[name];
    return typeof value === "function" ? (value as (input: unknown) => unknown)(args) : value;
  },
  useMutation: (ref: Parameters<typeof getFunctionName>[0]) => mocks.mutations[getFunctionName(ref)] ??= vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/hooks/useSessionId", () => ({ useSessionId: () => "session-1" }));
vi.mock("@/hooks/useMultiplayerCredential", () => ({ useMultiplayerCredential: () => "credential-1" }));
vi.mock("@/components/connect/ConnectShell", () => ({ ConnectShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));

function Where() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname}</p>;
}

function view(path = "/connect", auth: AppAuth = unavailableAuth) {
  return render(
    <AppAuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/connect" element={<Connect />} />
          <Route path="/connect/join" element={<Connect />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </AppAuthContext.Provider>,
  );
}

const hostCard = () => screen.getByRole("region", { name: "Host a room" });
const joinCard = () => screen.getByRole("region", { name: "Join a room" });

beforeEach(() => {
  localStorage.clear();
  mocks.mutations = {};
  mocks.queries = { "connect:recentRooms": [], "connect:lookupCode": null };
  mocks.queryArgs = {};
});
afterEach(cleanup);

it("creates a room with the host name, saves the name, and opens the host panel", async () => {
  localStorage.setItem("typesetgo_connect_host_name", "Ms. Rivera");
  mocks.mutations["connect:createRoom"] = vi.fn().mockResolvedValue({ roomId: "room-1", code: "ABCD" });
  view();
  const card = hostCard();
  expect(within(card).getByLabelText("Your name")).toHaveValue("Ms. Rivera");
  fireEvent.change(within(card).getByLabelText("Your name"), { target: { value: "  Mr. Lee " } });
  fireEvent.change(within(card).getByLabelText(/Room name/), { target: { value: "Period 3" } });
  fireEvent.click(within(card).getByRole("button", { name: "Create room" }));
  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/connect/host/room-1"));
  expect(mocks.mutations["connect:createRoom"]).toHaveBeenCalledWith({ hostName: "Mr. Lee", credential: "credential-1", name: "Period 3" });
  expect(localStorage.getItem("typesetgo_connect_host_name")).toBe("Mr. Lee");
});

it("requires a host name and shows server errors without the Convex prefix", async () => {
  mocks.mutations["connect:createRoom"] = vi.fn().mockRejectedValue(
    new Error("[CONVEX M(connect:createRoom)] [Request ID: 1] Server Error\nUncaught Error: Names must be 32 characters or fewer\n    at handler"),
  );
  view();
  const card = hostCard();
  fireEvent.click(within(card).getByRole("button", { name: "Create room" }));
  expect(await within(card).findByRole("alert")).toHaveTextContent("Enter the name students will see.");
  expect(mocks.mutations["connect:createRoom"]).not.toHaveBeenCalled();
  fireEvent.change(within(card).getByLabelText("Your name"), { target: { value: "Host" } });
  fireEvent.click(within(card).getByRole("button", { name: "Create room" }));
  await waitFor(() => expect(within(card).getByRole("alert")).toHaveTextContent("Names must be 32 characters or fewer"));
  expect(within(card).getByRole("button", { name: "Create room" })).toBeEnabled();
});

it("joins with a sanitized code, saves membership, and opens the room", async () => {
  localStorage.setItem("typesetgo_connect_name", "Alex");
  mocks.queries["connect:lookupCode"] = { name: "Period 3", hostName: "Ms. Rivera" };
  mocks.mutations["connect:join"] = vi.fn().mockResolvedValue({ roomId: "room-9", participantId: "p-1" });
  view();
  const card = joinCard();
  expect(within(card).getByLabelText("Your name")).toHaveValue("Alex");
  const code = within(card).getByLabelText("Room code");
  fireEvent.change(code, { target: { value: "ab-c" } });
  expect(code).toHaveValue("ABC");
  expect(mocks.queryArgs["connect:lookupCode"]).toBe("skip");
  fireEvent.change(code, { target: { value: "abcd" } });
  expect(within(card).getByText(/Joining/)).toHaveTextContent("Joining Period 3 hosted by Ms. Rivera");
  expect(mocks.queryArgs["connect:lookupCode"]).toEqual({ code: "ABCD" });
  fireEvent.click(within(card).getByRole("button", { name: "Join room" }));
  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/connect/room/room-9"));
  expect(mocks.mutations["connect:join"]).toHaveBeenCalledWith({ code: "ABCD", name: "Alex", sessionId: "session-1", credential: "credential-1" });
  expect(JSON.parse(localStorage.getItem("typesetgo_connect_membership:room-9") ?? "null")).toEqual({ participantId: "p-1", name: "Alex" });
});

it("prefills the code from /connect/join and focuses the name field", () => {
  mocks.queries["connect:lookupCode"] = null;
  view("/connect/join?code=wxyz");
  const card = joinCard();
  expect(within(card).getByLabelText("Room code")).toHaveValue("WXYZ");
  expect(within(card).getByLabelText("Your name")).toHaveFocus();
  expect(within(card).getByText("No live room with this code")).toBeInTheDocument();
});

it("maps join error codes to friendly messages", async () => {
  mocks.mutations["connect:join"] = vi.fn().mockRejectedValue(new ConvexError({ code: "full", message: "This room is full" }));
  view("/connect/join?code=ABCD");
  const card = joinCard();
  fireEvent.change(within(card).getByLabelText("Your name"), { target: { value: "Sam" } });
  fireEvent.click(within(card).getByRole("button", { name: "Join room" }));
  expect(await within(card).findByRole("alert")).toHaveTextContent("This room is full. Ask the host");
  expect(screen.queryByTestId("location")).not.toBeInTheDocument();

  expect(joinErrorMessage(new ConvexError({ code: "not_found", message: "No open room uses that code" }))).toMatch(/No live room uses that code/);
  expect(joinErrorMessage(new ConvexError({ code: "forbidden", message: "x" }))).toMatch(/different seat/);
  expect(joinErrorMessage(new Error("[CONVEX M(connect:join)] Server Error"))).toMatch(/Couldn't join the room/);
  expect(readableError(new ConvexError({ code: "ended", message: "This room has ended" }), "fallback")).toBe("This room has ended");
  expect(sanitizeCode(" o0-il1 ab2c9 ")).toBe("AB2C");
});

it("lists recent rooms and resumes live or reopens ended rooms", async () => {
  const now = Date.now();
  mocks.queries["connect:recentRooms"] = [
    { _id: "live-room", name: "Period 3", hostName: "Host", code: "ABCD", live: true, createdAt: now, lastActiveAt: now, testCount: 4 },
    { _id: "old-room", name: "Period 1", hostName: "Host", live: false, endedAt: now - 3 * 60 * 60_000, createdAt: now, lastActiveAt: now, testCount: 1 },
  ];
  mocks.mutations["connect:reopenRoom"] = vi.fn().mockResolvedValue({ roomId: "old-room", code: "WXYZ" });
  view("/connect", { ...unavailableAuth, available: true, status: "signed-out", unavailableReason: null });
  const recent = within(hostCard()).getByRole("region", { name: /Recent rooms/ });
  expect(within(recent).getByText(/Live/)).toBeInTheDocument();
  expect(within(recent).getByText("ABCD")).toBeInTheDocument();
  expect(within(recent).getByText("4 tests")).toBeInTheDocument();
  expect(within(recent).getByText("Ended 3 h ago")).toBeInTheDocument();
  expect(within(recent).getByText(/gives it a new code/)).toBeInTheDocument();
  expect(within(recent).getByText(/from other devices/)).toBeInTheDocument();
  expect(within(recent).getByRole("button", { name: "Resume Period 3" })).toBeInTheDocument();
  fireEvent.click(within(recent).getByRole("button", { name: "Reopen Period 1" }));
  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/connect/host/old-room"));
  expect(mocks.mutations["connect:reopenRoom"]).toHaveBeenCalledWith({ roomId: "old-room", credential: "credential-1" });
  expect(mocks.queryArgs["connect:recentRooms"]).toEqual({ credential: "credential-1" });
});

it("shows reopen failures in place and hides the recent list when empty", async () => {
  const now = Date.now();
  mocks.queries["connect:recentRooms"] = [
    { _id: "old-room", name: "Period 1", hostName: "Host", live: false, endedAt: now, createdAt: now, lastActiveAt: now, testCount: 2 },
  ];
  mocks.mutations["connect:reopenRoom"] = vi.fn().mockRejectedValue(new ConvexError({ code: "ended", message: "This room is too old to reopen" }));
  view();
  fireEvent.click(screen.getByRole("button", { name: "Reopen Period 1" }));
  expect(await within(hostCard()).findByRole("alert")).toHaveTextContent("This room is too old to reopen");
  cleanup();
  mocks.queries["connect:recentRooms"] = [];
  view();
  expect(within(hostCard()).queryByRole("region", { name: /Recent rooms/ })).not.toBeInTheDocument();
});
