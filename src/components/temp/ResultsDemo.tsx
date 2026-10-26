import { useEffect, useRef, useState } from "react";
import PracticeResults from "@/components/typing/PracticeResults";
import { DEFAULT_SETTINGS } from "@/lib/storage-utils";
import { MOCK_COMPARISON, MOCK_STATS, MOCK_TIMELINE, MOCK_WORD_RESULTS } from "./results/mock-results";

type SaveState = "idle" | "saving" | "saved" | "error";

/** The shipping results screen fed with a fake 30-second test; saving only animates locally. */
export function ResultsDemo({ signedIn }: { signedIn: boolean }) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const save = () => {
    setSaveState("saving");
    timer.current = window.setTimeout(() => setSaveState("saved"), 900);
  };

  return (
    <PracticeResults
      wpm={58}
      accuracy={94}
      duration={30_000}
      stats={MOCK_STATS}
      wordResults={MOCK_WORD_RESULTS}
      settings={{ ...DEFAULT_SETTINGS, mode: "time", duration: 30, difficulty: "beginner", presetText: "" }}
      currentQuote={null}
      lastResultIsValid={null}
      connectMode={false}
      saveState={saveState}
      saveResults={save}
      generateTest={() => setSaveState("idle")}
      repeatTest={() => setSaveState("idle")}
      timeline={MOCK_TIMELINE}
      comparison={signedIn ? MOCK_COMPARISON : null}
    />
  );
}
