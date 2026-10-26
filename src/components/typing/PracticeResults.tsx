import { useEffect, useRef, type ReactNode } from "react";
import {
  ArrowClockwiseIcon,
  ArrowFatRightIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  FloppyDiskIcon,
  SignOutIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import type { Quote, SettingsState } from "@/lib/typing-constants";
import type { TimelineSample } from "@/lib/result-timeline";
import { tv } from "@/lib/theme-vars";
import PracticeResultsInfo from "@/components/typing/PracticeResultsInfo";
import { ResultChips } from "@/components/typing/ResultChips";
import { ResultStatCard, type ResultComparison } from "@/components/typing/ResultStatCard";
import { ResultTimelineGraph } from "@/components/typing/ResultTimelineGraph";
import { describePracticeLength, MODIFIER_OPTIONS, selectedModeOption, usesWordOptions } from "@/components/typing/practice-settings-meta";

function describeTest(settings: SettingsState) {
  const mode = selectedModeOption(settings, false);
  const parts: (string | null)[] = [mode, describePracticeLength(settings, mode)];
  if (usesWordOptions(mode)) {
    parts.push(settings.difficulty);
    for (const { key, label } of MODIFIER_OPTIONS) if (settings[key]) parts.push(label);
  }
  return parts.filter(Boolean).join(" · ");
}

interface PracticeResultsProps {
  wpm: number;
  accuracy: number;
  duration?: number;
  advanceDisabled?: boolean;
  stats: { correct: number; incorrect: number; missed: number; extra: number };
  wordResults: {
    correctWords: string[];
    incorrectWords: { typed: string; expected: string }[];
  };
  settings: SettingsState;
  currentQuote: Quote | null;
  lastResultIsValid: boolean | null;
  lastResultInvalidReason?: string;
  connectMode: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  saveResults: () => void;
  generateTest: () => void;
  onLeave?: () => void;
  /** Connect: room-specific actions (waiting message or Next test). */
  connectActions?: ReactNode;
  repeatTest?: () => void;
  rankingStatus?: "pending" | "ranked" | "unranked";
  isRepeated?: boolean;
  /** Per-second speed and accuracy; the graph needs at least two samples. */
  timeline?: TimelineSample[];
  /** Recent average and best, captured before this result was saved. */
  comparison?: ResultComparison | null;
}

export default function PracticeResults({
  wpm,
  accuracy,
  duration,
  advanceDisabled = false,
  stats,
  wordResults,
  settings,
  currentQuote,
  lastResultIsValid,
  lastResultInvalidReason,
  connectMode,
  saveState,
  saveResults,
  generateTest,
  onLeave,
  connectActions,
  repeatTest,
  rankingStatus,
  isRepeated,
  timeline = [],
  comparison = null,
}: PracticeResultsProps) {
  const reducedMotion = useReducedMotion();
  const advancementBlocked = advanceDisabled || saveState === "saving";
  const resultsRef = useRef<HTMLDivElement>(null);
  const SaveIcon = lastResultIsValid === false || saveState === "error" ? WarningCircleIcon
    : saveState === "saved" ? CheckCircleIcon : saveState === "saving" ? CircleNotchIcon : FloppyDiskIcon;
  const saveLabel = lastResultIsValid === false ? "Invalid" : {
    idle: "Save Results",
    saving: "Saving...",
    saved: "Saved",
    error: "Error - Try Again",
  }[saveState];
  const resultsInfo = connectMode
    ? "Your result is shared with the host."
    : lastResultIsValid === false
    ? "This test could not be verified and cannot be saved."
    : isRepeated || rankingStatus === "unranked"
      ? "This practice can be saved to your history, but will not appear on leaderboards."
      : rankingStatus === "pending"
        ? "Waiting for verification…"
        : "Review your words per minute, accuracy, and typing details below.";
  const roundedWpm = Math.round(wpm);
  const roundedAccuracy = Math.round(accuracy);
  const wpmCeiling = Math.max(40, Math.ceil(Math.max(roundedWpm, comparison?.bestWpm ?? 0, comparison?.averageWpm ?? 0) / 20) * 20);
  // Accuracy bars start just below the lowest value so small differences stay visible.
  const accuracyFloor = Math.max(0, Math.min(80, Math.floor(Math.min(roundedAccuracy, comparison?.averageAccuracy ?? 100) / 10) * 10 - 10));
  useEffect(() => {
    // Completion moves focus to the result summary, unless a modal currently owns it.
    if (!document.querySelector('[role="dialog"]')) resultsRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <>
      <div
        ref={resultsRef}
        tabIndex={-1}
        role="region"
        aria-label="Test results"
        className="w-full max-w-4xl mx-auto rounded-md outline-2 outline-offset-3 outline-ring"
        onKeyDown={(event) => {
          if (
            connectMode ||
            event.target !== event.currentTarget ||
            event.defaultPrevented ||
            event.nativeEvent.isComposing ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            event.shiftKey
          )
            return;
          if (event.key === "Enter") {
            event.preventDefault();
            if (!advancementBlocked) generateTest();
          }
          if (event.key === " " && saveState !== "saved" && saveState !== "saving" && lastResultIsValid !== false) {
            event.preventDefault();
            saveResults();
          }
        }}
      >
        <PracticeResultsInfo>{resultsInfo}</PracticeResultsInfo>
        <motion.div
          className="mb-8 flex flex-col gap-4"
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.25, ease: "easeOut" }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ResultStatCard
              label="Words Per Minute"
              value={roundedWpm}
              average={comparison?.averageWpm}
              best={comparison?.bestWpm}
              tests={comparison?.tests}
              floor={0}
              ceiling={wpmCeiling}
              tone="text-primary"
              bar="bg-primary"
              better="faster"
              worse="slower"
              delay={0.2}
            />
            <ResultStatCard
              label="Accuracy"
              value={roundedAccuracy}
              suffix="%"
              average={comparison?.averageAccuracy}
              best={comparison?.bestAccuracy}
              tests={comparison?.tests}
              floor={accuracyFloor}
              ceiling={100}
              tone="text-(--accent-emphasis)"
              bar="bg-(--accent-emphasis)"
              better="more accurate"
              worse="less accurate"
              delay={0.3}
              mirrored
            />
          </div>
          {timeline.length >= 2 && <ResultTimelineGraph samples={timeline} />}
          <ResultChips
            correctWords={wordResults.correctWords}
            incorrectWords={wordResults.incorrectWords}
            stats={stats}
            testLabel={describeTest(settings)}
            durationMs={duration}
          />
        </motion.div>

        {/* Quote Attribution */}
        {settings.mode === "quote" && currentQuote && (
          <div className="text-center mb-8" style={{ color: tv.ui.mutedForeground }}>
            — {currentQuote.author}
            {currentQuote.source && `, ${currentQuote.source}`}
          </div>
        )}

        {/* Unverified Test Warning */}
        {lastResultIsValid === false && (
          <div
            className="w-full mb-6 p-4 rounded-lg border"
            style={{
              backgroundColor: tv.ui.destructiveSurface,
              borderColor: tv.ui.destructive,
            }}
          >
            <div className="flex items-center gap-3">
              <WarningCircleIcon className="size-5 shrink-0" style={{ color: tv.ui.destructive }} aria-hidden="true" />
              <div className="flex-1">
                <span className="font-medium" style={{ color: tv.ui.destructive }}>
                  Unverified
                </span>
                <span className="text-sm ml-2" style={{ color: tv.ui.mutedForeground }}>
                  {lastResultInvalidReason?.includes("progress")
                    ? "Not enough typing activity reached the server"
                    : lastResultInvalidReason?.includes("WPM exceeds")
                      ? "Speed exceeded the 300 WPM cap"
                      : lastResultInvalidReason?.includes("Burst") || lastResultInvalidReason?.includes("paste")
                        ? "Input appeared faster than allowed"
                        : lastResultInvalidReason?.includes("too fast")
                          ? "Test completed too quickly (need full duration)"
                          : lastResultInvalidReason?.includes("Session was not established")
                            ? "Could not verify this test with a server session"
                            : "Could not verify this test"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reducedMotion ? 0 : 0.2,
            delay: 0,
            ease: "easeOut",
          }}
        >
          {/* Save Results Button */}
          {!connectMode && (
            <button
              type="button"
              onClick={() => saveResults()}
              disabled={saveState === "saving" || saveState === "saved" || lastResultIsValid === false}
              className="group relative inline-flex max-w-full items-center justify-center gap-2 px-6 py-3 font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed sm:px-8"
              style={{
                backgroundColor:
                  lastResultIsValid === false || saveState === "error"
                    ? tv.ui.destructive
                    : saveState === "saved"
                      ? tv.ui.secondary
                      : tv.ui.primary,
                color:
                  lastResultIsValid === false || saveState === "error"
                    ? tv.ui.destructiveForeground
                    : saveState === "saved"
                      ? tv.ui.secondaryForeground
                      : tv.ui.primaryForeground,
              }}
            >
              <SaveIcon className={`size-[18px] shrink-0 ${saveState === "saving" && lastResultIsValid !== false ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
              {saveLabel}
            </button>
          )}
          {!connectMode && (
            <div className={`grid w-full max-w-md gap-3 ${repeatTest ? "grid-cols-2" : "grid-cols-1"} sm:flex sm:w-auto sm:max-w-none sm:justify-center`}>
              {repeatTest && (
                <button
                  type="button"
                  onClick={repeatTest}
                  disabled={advancementBlocked}
                  className="inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-3 font-medium text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-6"
                >
                  <ArrowClockwiseIcon className="size-[18px] shrink-0" aria-hidden="true" />
                  <span>Repeat Test</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => generateTest()}
                disabled={advancementBlocked}
                className="group relative inline-flex min-w-0 items-center justify-center gap-2 px-3 py-3 font-medium transition-all duration-200 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 sm:px-8"
                style={{
                  backgroundColor: tv.ui.card,
                  color: tv.ui.foreground,
                }}
              >
                <ArrowFatRightIcon className="size-[18px] shrink-0" aria-hidden="true" />
                <span>Next Test</span>
              </button>
            </div>
          )}
          {connectMode && connectActions}
          {connectMode && onLeave && (
            <button
              type="button"
              onClick={onLeave}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 font-medium transition-all duration-200 rounded-lg hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                color: tv.ui.destructive,
                backgroundColor: tv.ui.destructiveSurface,
                borderWidth: 1,
                borderColor: tv.ui.destructive,
              }}
            >
              <SignOutIcon className="size-[18px] shrink-0" aria-hidden="true" />
              Leave Room
            </button>
          )}
        </motion.div>

        <motion.div
          className="mt-6 text-center text-sm"
          style={{ color: tv.ui.mutedForeground }}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.2, delay: 0 }}
        >
          {duration !== undefined && <p>Duration: {(duration / 1000).toFixed(1)}s</p>}
          {lastResultIsValid === true && <p>Verified</p>}
          {saveState === "saved" && lastResultIsValid === null && <p>Saved to history.</p>}
          {rankingStatus === "pending" && <p>Waiting for verification…</p>}
          {!connectMode && (
            <p>
              With the result summary focused:{" "}
              {lastResultIsValid !== false && saveState !== "saved" && saveState !== "saving" ? "Space to save · " : ""}
              {advancementBlocked ? "Next and Repeat are available after saving finishes." : "Enter for the next test."}
            </p>
          )}
        </motion.div>
      </div>
    </>
  );
}
