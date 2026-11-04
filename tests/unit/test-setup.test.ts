import { expect, it, vi } from "vitest";

// Motion keeps the frame function it found on load, so this is the one it would still be calling after fake timers end.
it("keeps animation frames running after fake timers end", { timeout: 5_000 }, async () => {
  const requestFrame = requestAnimationFrame;
  vi.useFakeTimers();
  requestFrame(() => undefined);
  vi.useRealTimers();
  const time = await new Promise<number>((resolve) => requestFrame(resolve));
  expect(time).toBeGreaterThan(0);
});
