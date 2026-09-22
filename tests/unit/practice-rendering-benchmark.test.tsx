import { Profiler, createRef } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import PracticeText from "@/components/typing/PracticeText";

afterEach(cleanup);
it.runIf(process.env.TYPESETGO_RENDER_BENCHMARK === "1")("measures ordinary, maximum, and extended Zen prompts in the local DOM fixture", () => {
  for (const count of [200, 9999, 2000]) {
    const targetText = Array(count).fill("typing").join(" ");
    const caretRef = createRef<HTMLSpanElement>();
    const durations: number[] = [];
    const content = (typedText: string) => <Profiler id="prompt" onRender={(_id, _phase, duration) => durations.push(duration)}>
      <PracticeText targetText={targetText} typedText={typedText} caretRef={caretRef} />
    </Profiler>;
    const result = render(content(""));
    result.rerender(content(""));
    result.rerender(content("t"));
    expect(result.container.querySelectorAll("[data-typing-word]")).toHaveLength(count);
    console.info(`Prompt ${count} words: mount/clock/input React render ms ${durations.map((n) => n.toFixed(2)).join("/")}`);
    result.unmount();
  }
}, 30000);
