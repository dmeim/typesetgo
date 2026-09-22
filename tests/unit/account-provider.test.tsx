import { StrictMode, useEffect, useLayoutEffect } from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AccountProvider } from "@/components/layout/AccountProvider";
import { useAccount, type AccountState } from "@/components/layout/useAccount";

const fixture = vi.hoisted(() => ({
  user: null as null | { id: string; username: string }, authenticated: false, synchronize: vi.fn(), mounts: 0,
}));
vi.mock("@/components/layout/useAppAuth", () => ({ useAppAuth: () => ({ user: fixture.user, isSignedIn: !!fixture.user }) }));
vi.mock("convex/react", () => ({ useConvexAuth: () => ({ isAuthenticated: fixture.authenticated }), useMutation: () => fixture.synchronize }));
let account: AccountState;
function Probe() {
  const value = useAccount();
  useLayoutEffect(() => { account = value; });
  useEffect(() => { fixture.mounts++; }, []);
  return <span>{value.status}</span>;
}
function Tree() { return <StrictMode><AccountProvider><Probe /></AccountProvider></StrictMode>; }
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => { fixture.user = null; fixture.authenticated = false; fixture.mounts = 0; fixture.synchronize.mockReset(); });
afterEach(cleanup);

it("waits for Convex auth, deduplicates StrictMode and callers, and preserves the practice subtree", async () => {
  const pending = deferred<string>();
  fixture.synchronize.mockReturnValue(pending.promise);
  const view = render(<Tree />);
  const mounts = fixture.mounts;
  fixture.user = { id: "account-a", username: "A" };
  view.rerender(<Tree />);
  expect(fixture.synchronize).not.toHaveBeenCalled();
  expect(account.status).toBe("loading");
  fixture.authenticated = true;
  view.rerender(<Tree />);
  const first = account.ensureAccount();
  expect(account.ensureAccount()).toBe(first);
  expect(fixture.synchronize).toHaveBeenCalledTimes(1);
  await act(async () => { pending.resolve("user-a"); await first; });
  expect(account.userId).toBe("user-a");
  fixture.user = null;
  view.rerender(<Tree />);
  expect(account.status).toBe("unavailable");
  expect(fixture.mounts).toBe(mounts);
});

it("ignores an obsolete account request and permits explicit retry after failure", async () => {
  const first = deferred<string>();
  const second = deferred<string>();
  fixture.synchronize.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockResolvedValueOnce("user-b");
  fixture.authenticated = true;
  fixture.user = { id: "account-a", username: "A" };
  const view = render(<Tree />);
  fixture.user = { id: "account-b", username: "B" };
  view.rerender(<Tree />);
  await act(async () => { first.resolve("user-a"); await first.promise; });
  expect(account.userId).toBeNull();
  await act(async () => { second.reject(new Error("offline")); await second.promise.catch(() => {}); });
  expect(account.status).toBe("error");
  expect(fixture.synchronize).toHaveBeenCalledTimes(2);
  await act(async () => { await account.ensureAccount(); });
  await waitFor(() => expect(account.userId).toBe("user-b"));
});
