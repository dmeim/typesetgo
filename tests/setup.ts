import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";
import { afterAll } from "vitest";

// Slow machines can take over a second to get through an animation, and Workers Builds won't publish unless this
// suite passes, so waits get far longer than Testing Library's one-second default. A passing wait still ends as soon as it can.
configure({ asyncUtilTimeout: 10_000 });

// jsdom runs animation frames on whatever setInterval is global when a frame is requested. During a fake-timer test that's a
// fake one, so the frames die with the fake timers and every animation later in the file freezes, leaving anything behind an
// AnimatePresence swap unrendered. Whether it happens depends on timing, so frames get their own real timer instead.
if (typeof requestAnimationFrame === "function") {
  const startTimer = setTimeout;
  const stopTimer = clearTimeout;
  let open = true;
  afterAll(() => { open = false; });
  globalThis.requestAnimationFrame = (callback) => Number(startTimer(() => { if (open) callback(performance.now()); }, 1000 / 60));
  globalThis.cancelAnimationFrame = (handle) => stopTimer(handle);
}
