import { useState } from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { PracticeLiveStats } from "@/components/typing/PracticeLiveStats";
import { DEFAULT_SETTINGS } from "@/lib/storage-utils";
import { MockPrompt } from "./stats/StatsPrimitives";
import { useSimulatedRun, type SimulatedMode } from "./stats/useSimulatedRun";

const SIM_MODES: SimulatedMode[] = ["time", "words", "zen"];

/** The shipping in-test ticker, fed by a looping simulated test. */
export function LiveStatsDemo() {
  const [mode, setMode] = useState<SimulatedMode>("time");
  const [seed, setSeed] = useState(1);
  const run = useSimulatedRun(mode, seed);
  const settings = { ...DEFAULT_SETTINGS, mode, duration: run.duration, wordTarget: run.wordTarget, presetText: "" };

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex items-center gap-1 self-end text-xs">
        {SIM_MODES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => setMode(option)}
            className={`rounded-md px-2 py-1 transition ${mode === option ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            {option}
          </button>
        ))}
        <button type="button" onClick={() => setSeed((value) => value + 1)} className="ml-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground transition hover:bg-accent hover:text-foreground">
          <ArrowClockwiseIcon className="size-3.5 shrink-0" aria-hidden="true" />
          Restart
        </button>
      </div>
      <PracticeLiveStats
        settings={settings}
        isKidMode={false}
        wpm={run.wpm}
        accuracy={run.accuracy}
        elapsedMs={run.elapsedMs}
        timeRemaining={run.timeRemaining}
        typedWordCount={run.wordsTyped}
      />
      <MockPrompt run={run} />
    </div>
  );
}
