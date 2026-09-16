import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

let frames: Map<number, FrameRequestCallback>;
let nextFrameId: number;
let reducedMotion: boolean;
let motionListeners: Set<() => void>;

function frame(timestamp: number) {
  act(() => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(timestamp));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  frames = new Map();
  nextFrameId = 0;
  reducedMotion = false;
  motionListeners = new Set();
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
    const id = nextFrameId++;
    frames.set(id, callback);
    return id;
  }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn((id: number) => frames.delete(id)));
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    get matches() { return reducedMotion; },
    addEventListener: (_event: string, listener: () => void) => motionListeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) => motionListeners.delete(listener),
  })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("animated counter lifecycle", () => {
  it("uses timestamp zero as the start and reaches its target", () => {
    const { result } = renderHook(() => useAnimatedCounter(100, 100));
    act(() => vi.runOnlyPendingTimers());
    frame(0);
    frame(50);
    expect(result.current).toBe(88);
    frame(100);
    expect(result.current).toBe(100);
    expect(frames.size).toBe(0);
  });

  it("retargets from the displayed value, including downward changes", () => {
    const { result, rerender } = renderHook(({ target }) => useAnimatedCounter(target, 100), {
      initialProps: { target: 100 },
    });
    act(() => vi.runOnlyPendingTimers());
    frame(10);
    frame(60);
    expect(result.current).toBe(88);
    rerender({ target: 40 });
    act(() => vi.runOnlyPendingTimers());
    frame(70);
    expect(result.current).toBe(88);
    frame(120);
    expect(result.current).toBe(46);
    frame(170);
    expect(result.current).toBe(40);
  });

  it.each([0, -10])("settles immediately for duration %s without delay or frames", (duration) => {
    const { result } = renderHook(() => useAnimatedCounter(55, duration, 1000));
    expect(result.current).toBe(55);
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the integer contract for fractional targets", () => {
    const { result } = renderHook(() => useAnimatedCounter(20.4, 100));
    frame(0);
    frame(100);
    expect(result.current).toBe(20);
  });

  it("cancels frame id zero on unmount", () => {
    const { unmount } = renderHook(() => useAnimatedCounter(100));
    act(() => vi.runOnlyPendingTimers());
    expect(frames.has(0)).toBe(true);
    unmount();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(0);
    expect(frames.size).toBe(0);
  });

  it("resets to zero without leaving scheduled work", () => {
    const { result, rerender, unmount } = renderHook(({ target }) => useAnimatedCounter(target, 100), {
      initialProps: { target: 100 },
    });
    act(() => vi.runOnlyPendingTimers());
    frame(10);
    frame(60);
    rerender({ target: 0 });
    expect(result.current).toBe(0);
    unmount();
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("starts the next animation at zero after an immediate reset", () => {
    const { result, rerender } = renderHook(({ target }) => useAnimatedCounter(target, 100), { initialProps: { target: 100 } });
    frame(0);
    frame(50);
    rerender({ target: 0 });
    rerender({ target: 50 });
    expect(result.current).toBe(0);
    frame(60);
    expect(result.current).toBe(0);
    frame(160);
    expect(result.current).toBe(50);
  });

  it("cancels delayed work when retargeted or unmounted", () => {
    const { rerender, unmount } = renderHook(({ target }) => useAnimatedCounter(target, 100, 500), {
      initialProps: { target: 100 },
    });
    rerender({ target: 200 });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(frames.size).toBe(0);
  });

  it("bypasses animation and delay for reduced motion", () => {
    reducedMotion = true;
    const { result } = renderHook(() => useAnimatedCounter(75, 100, 500));
    expect(result.current).toBe(75);
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("settles an active counter when the motion preference changes", () => {
    const { result, unmount } = renderHook(() => useAnimatedCounter(75, 100));
    act(() => vi.runOnlyPendingTimers());
    frame(10);
    act(() => {
      reducedMotion = true;
      motionListeners.forEach((listener) => listener());
    });
    expect(result.current).toBe(75);
    expect(frames.size).toBe(0);
    unmount();
    expect(motionListeners.size).toBe(0);
  });
});
