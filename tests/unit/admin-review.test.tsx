import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Admin from "@/pages/Admin";

const backend = vi.hoisted(() => ({ query: vi.fn(), action: vi.fn(), mutation: vi.fn() }));
vi.mock("convex/react", () => ({ useConvex: () => backend }));
vi.mock("../../convex/_generated/api", () => ({ api: { admin: {
  listReview: "listReview", login: "login", setValidity: "setValidity",
} } }));
vi.mock("@/hooks/useTheme", async () => {
  const { getDefaultTheme } = await import("@/lib/themes");
  return { useTheme: () => ({ colors: getDefaultTheme().dark }) };
});

function mount() {
  return render(<MemoryRouter><Admin /></MemoryRouter>);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  sessionStorage.clear();
  vi.resetAllMocks();
  backend.action.mockResolvedValue({ token: "new-session" });
  backend.mutation.mockResolvedValue({ success: true });
});
afterEach(cleanup);

describe("admin review request ownership", () => {
  it("derives loading until the current request resolves and then shows the empty state", async () => {
    const request = deferred<[]>();
    sessionStorage.setItem("typesetgo.adminToken", "stored-session");
    backend.query.mockReturnValue(request.promise);
    mount();
    expect(screen.getByText("Loading review queue...")).toBeVisible();
    expect(screen.queryByText("No results in the review queue.")).not.toBeInTheDocument();
    await act(async () => request.resolve([]));
    expect(screen.getByText("No results in the review queue.")).toBeVisible();
    expect(backend.query).toHaveBeenCalledWith("listReview", { token: "stored-session" });
  });

  it("ignores a departed session's rejection after another session signs in", async () => {
    const previous = deferred<[]>();
    sessionStorage.setItem("typesetgo.adminToken", "previous-session");
    backend.query.mockReturnValueOnce(previous.promise).mockResolvedValue([]);
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "fixture-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in", exact: true }));
    await screen.findByText("No results in the review queue.");
    await act(async () => previous.reject(new Error("Unauthorized old token")));
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
    expect(sessionStorage.getItem("typesetgo.adminToken")).toBe("new-session");
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });

  it("settles a failed request without retrying automatically and can recover on sign-in", async () => {
    sessionStorage.setItem("typesetgo.adminToken", "stored-session");
    backend.query.mockRejectedValueOnce(new Error("Fixture unavailable")).mockResolvedValue([]);
    mount();
    await screen.findByText("Fixture unavailable");
    expect(screen.queryByText("Loading review queue...")).not.toBeInTheDocument();
    expect(backend.query).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "fixture-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in", exact: true }));
    await waitFor(() => expect(screen.getByText("No results in the review queue.")).toBeVisible());
    expect(screen.queryByText("Fixture unavailable")).not.toBeInTheDocument();
  });
});
