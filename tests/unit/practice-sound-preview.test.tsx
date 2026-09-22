import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useSoundPreview } from "@/hooks/useSoundPreview";

vi.mock("@/lib/sounds", () => ({ getRandomSoundUrl: (_manifest: unknown, _category: string, pack: string) => `/sounds/${pack}.wav` }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("stops earlier previews, selection changes, closing and unmounting", () => {
  const instances: { pause: ReturnType<typeof vi.fn>; play: ReturnType<typeof vi.fn> }[] = [];
  vi.stubGlobal("Audio", class {
    volume = 1;
    pause = vi.fn();
    play = vi.fn(async () => {});
    constructor() { instances.push(this); }
  });
  const { result, rerender, unmount } = renderHook(({ open, selection }) => useSoundPreview({}, open, selection),
    { initialProps: { open: true, selection: "a" } });
  act(() => result.current.play("typing", "a"));
  act(() => result.current.play("warning", "b"));
  expect(instances[0].pause).toHaveBeenCalled();
  rerender({ open: true, selection: "c" });
  expect(instances[1].pause).toHaveBeenCalled();
  act(() => result.current.play("typing", "c"));
  rerender({ open: false, selection: "c" });
  expect(instances[2].pause).toHaveBeenCalled();
  rerender({ open: true, selection: "c" });
  act(() => result.current.play("typing", "c"));
  unmount();
  expect(instances[3].pause).toHaveBeenCalled();
});
it("reports playback rejection while ignoring rejection from a stopped preview", async () => {
  let reject!: (reason: Error) => void;
  vi.stubGlobal("Audio", class {
    pause = vi.fn();
    play = () => new Promise<void>((_resolve, rejectPromise) => { reject = rejectPromise; });
  });
  const { result, rerender } = renderHook(({ open }) => useSoundPreview({}, open, "a"), { initialProps: { open: true } });
  act(() => result.current.play("typing", "a"));
  await act(async () => reject(new Error("blocked")));
  await waitFor(() => expect(result.current.error).toBe("Unable to play this preview."));
  act(() => result.current.play("typing", "a"));
  rerender({ open: false });
  await act(async () => reject(new Error("aborted")));
  expect(result.current.error).toBe("");
});
