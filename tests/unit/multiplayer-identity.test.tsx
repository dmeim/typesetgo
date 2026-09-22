import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe("multiplayer identity storage boundary", () => {
  it.each(["read", "write"])("keeps a stable identity across rerenders with denied %s", async (failure) => {
    vi.resetModules();
    vi.spyOn(Storage.prototype, failure === "read" ? "getItem" : "setItem").mockImplementation(() => { throw new Error("Denied"); });
    const { useSessionId } = await import("@/hooks/useSessionId");
    const { useMultiplayerCredential } = await import("@/hooks/useMultiplayerCredential");
    const read = vi.spyOn(Storage.prototype, "getItem");
    const write = vi.spyOn(Storage.prototype, "setItem");
    read.mockClear(); write.mockClear();
    const hook = renderHook(() => ({ id: useSessionId(), credential: useMultiplayerCredential() }));
    const identity = hook.result.current;
    expect(identity.id).toBeTruthy();
    expect(identity.credential).toMatch(/^[a-f0-9]{64}$/);
    hook.rerender();
    expect(hook.result.current).toEqual(identity);
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it("restores the shared browser identity and credential on a new document", async () => {
    vi.resetModules();
    const first = await import("@/lib/multiplayer-identity");
    vi.resetModules();
    const second = await import("@/lib/multiplayer-identity");
    expect(second.multiplayerSessionId).toBe(first.multiplayerSessionId);
    expect(second.multiplayerCredential).toBe(first.multiplayerCredential);
    expect(second.multiplayerCredential).not.toBe(second.multiplayerSessionId);
  });
});
