import type { ReactNode } from "react";
import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({
  roots: [] as { unmount: () => void }[], clerkReads: vi.fn(), synchronize: vi.fn(), clients: [] as { close: () => Promise<void> }[],
}));
vi.mock("react-dom/client", async (original) => {
  const actual = await original<typeof import("react-dom/client")>();
  return { ...actual, createRoot: (...args: Parameters<typeof actual.createRoot>) => {
    const root = actual.createRoot(...args); fixture.roots.push(root); return root;
  } };
});
vi.mock("convex/react", async (original) => {
  const actual = await original<typeof import("convex/react")>();
  return {
    ...actual,
    ConvexReactClient: class extends actual.ConvexReactClient {
      constructor(url: string) { super(url); fixture.clients.push(this); }
    },
    ConvexProvider: ({ children }: { children: ReactNode }) => <div data-provider="convex">{children}</div>,
    useConvexAuth: () => ({ isAuthenticated: !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY, isLoading: false }),
    useMutation: () => fixture.synchronize,
  };
});
vi.mock("convex/react-clerk", () => ({ ConvexProviderWithClerk: ({ children }: { children: ReactNode }) => <div data-provider="convex-clerk">{children}</div> }));
vi.mock("@clerk/clerk-react", () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => <div data-provider="clerk">{children}</div>,
  useAuth: () => ({}),
  useUser: () => { fixture.clerkReads(); return { isLoaded: true, isSignedIn: true, user: { id: "bootstrap-user", username: "Fixture" } }; },
  useClerk: () => ({}),
}));

beforeEach(() => {
  vi.resetModules();
  vi.doMock("@/App", async () => {
    const { useAccount } = await import("@/components/layout/useAccount");
    const { useNotifications } = await import("@/lib/notification-state");
    return { default: function BootstrapProbe() {
      const account = useAccount();
      const notifications = useNotifications();
      return <output>{account.status}:{notifications.notifications.length}</output>;
    } };
  });
  fixture.clerkReads.mockClear();
  fixture.synchronize.mockReset().mockResolvedValue("bootstrap-convex-user");
  localStorage.clear();
  document.body.innerHTML = '<div id="root"></div><footer id="static-footer">Static footer</footer>';
  vi.stubEnv("VITE_CONVEX_URL", "https://fixture.invalid");
  vi.stubEnv("VITE_CLERK_PUBLISHABLE_KEY", "");
});
afterEach(async () => {
  await act(async () => { fixture.roots.splice(0).forEach((root) => root.unmount()); });
  await Promise.all(fixture.clients.splice(0).map((client) => client.close()));
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
it("boots the actual anonymous entry without invoking Clerk or account writes", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  await act(async () => { await import("@/main"); });
  expect(document.querySelector("output")?.textContent).toBe("unavailable:0");
  expect(document.querySelector('[data-provider="convex"]')).not.toBeNull();
  expect(document.querySelector('[data-provider="clerk"]')).toBeNull();
  expect(fixture.clerkReads).not.toHaveBeenCalled();
  expect(fixture.synchronize).not.toHaveBeenCalled();
  expect(document.getElementById("static-footer")?.style.display).toBe("none");
});
it("wires configured Clerk, Convex auth, account readiness, and account notification history in order", async () => {
  vi.stubEnv("VITE_CLERK_PUBLISHABLE_KEY", "fixture-key");
  localStorage.setItem("typesetgo_notifications:user:bootstrap-user", JSON.stringify([{ id: "1", type: "info", title: "Account history", description: "Stored", timestamp: 1, read: false }]));
  await act(async () => { await import("@/main"); });
  await waitFor(() => expect(document.querySelector("output")?.textContent).toBe("ready:1"));
  expect(document.querySelector('[data-provider="clerk"] [data-provider="convex-clerk"] output')).not.toBeNull();
  expect(fixture.synchronize).toHaveBeenCalledTimes(1);
});
it("rejects missing Convex configuration before starting providers", async () => {
  vi.stubEnv("VITE_CONVEX_URL", "");
  await expect(import("@/main")).rejects.toThrow();
  expect(fixture.roots).toHaveLength(0);
  expect(fixture.synchronize).not.toHaveBeenCalled();
});
