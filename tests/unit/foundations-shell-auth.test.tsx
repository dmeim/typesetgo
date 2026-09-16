import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { AppAuthProvider } from "@/components/layout/AppAuthProvider";
import { useAppAuth, type AppAuthUser } from "@/components/layout/useAppAuth";

const clerk = vi.hoisted(() => ({
  useUser: vi.fn(),
  useClerk: vi.fn(),
  openSignIn: vi.fn(),
  openUserProfile: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@clerk/clerk-react", () => ({ useUser: clerk.useUser, useClerk: clerk.useClerk }));

const anonymous = ({ children }: { children: ReactNode }) => <AppAuthProvider enabled={false}>{children}</AppAuthProvider>;
const enabled = ({ children }: { children: ReactNode }) => <AppAuthProvider enabled>{children}</AppAuthProvider>;

beforeEach(() => {
  vi.resetAllMocks();
  clerk.useClerk.mockReturnValue(clerk);
  clerk.useUser.mockReturnValue({ isLoaded: true, isSignedIn: false, user: null });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("application auth capabilities", () => {
  it("supports anonymous consumers without invoking Clerk or requiring a provider", async () => {
    clerk.useUser.mockImplementation(() => { throw new Error("No ClerkProvider"); });
    clerk.useClerk.mockImplementation(() => { throw new Error("No ClerkProvider"); });
    const { result } = renderHook(useAppAuth, { wrapper: anonymous });
    expect(result.current).toMatchObject({ status: "unavailable", available: false, isLoaded: true, isSignedIn: false, user: null, unavailableReason: "not-configured" });
    expect(await result.current.openSignIn()).toBe(false);
    expect(await result.current.openUserProfile()).toBe(false);
    expect(await result.current.signOut()).toBe(false);
    expect(clerk.useUser).not.toHaveBeenCalled();
    expect(clerk.useClerk).not.toHaveBeenCalled();
  });

  it("has safe unavailable defaults without the application provider", () => {
    expect(renderHook(useAppAuth).result.current.status).toBe("unavailable");
    expect(clerk.useUser).not.toHaveBeenCalled();
  });

  it("guards loading actions and surfaces unavailable auth after a bounded wait", async () => {
    vi.useFakeTimers();
    clerk.useUser.mockReturnValue({ isLoaded: false, isSignedIn: undefined, user: undefined });
    const { result, rerender } = renderHook(useAppAuth, { wrapper: enabled });
    expect(result.current.status).toBe("loading");
    expect(await result.current.openSignIn()).toBe(false);
    act(() => vi.advanceTimersByTime(10000));
    expect(result.current).toMatchObject({ status: "unavailable", available: false, unavailableReason: "load-failed" });
    clerk.useUser.mockReturnValue({ isLoaded: true, isSignedIn: false, user: null });
    rerender();
    expect(result.current).toMatchObject({ status: "signed-out", available: true, unavailableReason: null });
    expect(await result.current.openSignIn()).toBe(true);
    expect(clerk.openSignIn).toHaveBeenCalledOnce();
  });

  it("exposes identity and only signed-in account actions", async () => {
    const user = { id: "user_1", username: "Ada" } as AppAuthUser;
    clerk.useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user });
    const { result } = renderHook(useAppAuth, { wrapper: enabled });
    expect(result.current.user).toBe(user);
    expect(result.current.status).toBe("signed-in");
    expect(await result.current.openSignIn()).toBe(false);
    expect(await result.current.openUserProfile()).toBe(true);
    expect(await result.current.signOut()).toBe(true);
    expect(clerk.openSignIn).not.toHaveBeenCalled();
    expect(clerk.openUserProfile).toHaveBeenCalledOnce();
    expect(clerk.signOut).toHaveBeenCalledOnce();
  });

  it("returns a failed capability action instead of an unhandled rejection", async () => {
    clerk.openSignIn.mockRejectedValue(new Error("Unavailable"));
    const { result } = renderHook(useAppAuth, { wrapper: enabled });
    expect(await result.current.openSignIn()).toBe(false);
    expect(await result.current.openUserProfile()).toBe(false);
    expect(await result.current.signOut()).toBe(false);
  });

  it("cleans up the loading timer", () => {
    vi.useFakeTimers();
    clerk.useUser.mockReturnValue({ isLoaded: false });
    const { unmount } = renderHook(useAppAuth, { wrapper: enabled });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
