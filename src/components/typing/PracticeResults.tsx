import { useEffect, useRef } from "react";
import {
  ArrowClockwiseIcon,
  ArrowFatRightIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  FloppyDiskIcon,
  SignOutIcon,
  SpeedometerIcon,
  TargetIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import type { Quote, SettingsState } from "@/lib/typing-constants";
import { tv } from "@/lib/theme-vars";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PracticeResultsInfo from "@/components/typing/PracticeResultsInfo";

// Animated counter display for WPM
function AnimatedWpmDisplay({ value, color }: { value: number; color: string }) {
  const animated = useAnimatedCounter(value, 1000, 200);
  return (
    <div className="text-6xl md:text-8xl font-black tabular-nums leading-none tracking-tight" style={{ color }}>
      {animated}
    </div>
  );
}

// Animated counter display for Accuracy
function AnimatedAccuracyDisplay({ value, color }: { value: number; color: string }) {
  const animated = useAnimatedCounter(value, 1000, 300);
  return (
    <div className="text-6xl md:text-8xl font-black tabular-nums leading-none tracking-tight" style={{ color }}>
      {animated}
      <span className="text-2xl md:text-4xl align-top ml-1 opacity-50">%</span>
    </div>
  );
}

interface PracticeResultsProps {
  wpm: number;
  accuracy: number;
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
  repeatTest?: () => void;
  rankingStatus?: "pending" | "ranked" | "unranked";
  isRepeated?: boolean;
}

export default function PracticeResults({
  wpm,
  accuracy,
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
  repeatTest,
  rankingStatus,
  isRepeated,
}: PracticeResultsProps) {
  const reducedMotion = useReducedMotion();
  const resultsRef = useRef<HTMLDivElement>(null);
  const SaveIcon = lastResultIsValid === false || saveState === "error" ? WarningCircleIcon
    : saveState === "saved" ? CheckCircleIcon : saveState === "saving" ? CircleNotchIcon : FloppyDiskIcon;
  const saveLabel = lastResultIsValid === false ? "Invalid" : {
    idle: "Save Results",
    saving: "Saving...",
    saved: "Saved",
    error: "Error - Try Again",
  }[saveState];
  const resultsInfo = lastResultIsValid === false
    ? "This test could not be verified and cannot be saved."
    : isRepeated || rankingStatus === "unranked"
      ? "This practice can be saved to your history, but will not appear on leaderboards."
      : rankingStatus === "pending"
        ? "Waiting for verification…"
        : "Review your words per minute, accuracy, and typing details below.";
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
            generateTest();
          }
          if (event.key === " " && saveState !== "saved" && saveState !== "saving" && lastResultIsValid !== false) {
            event.preventDefault();
            saveResults();
          }
        }}
      >
        <PracticeResultsInfo>{resultsInfo}</PracticeResultsInfo>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* WPM */}
          <motion.div
            className="relative overflow-hidden rounded-2xl p-6 md:p-10 flex flex-col items-center justify-center group transition-colors"
            style={{
              backgroundColor: tv.ui.card,
              borderWidth: 1,
              borderColor: tv.border.subtle,
            }}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2, ease: "easeOut" }}
          >
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: tv.ui.mutedForeground }}>
              Words Per Minute
            </div>
            <AnimatedWpmDisplay value={Math.round(wpm)} color={tv.ui.primary} />
            <div
              className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
              style={{ color: tv.ui.foreground }}
            >
              <SpeedometerIcon size={120} weight="regular" aria-hidden="true" />
            </div>
          </motion.div>

          {/* Accuracy */}
          <motion.div
            className="relative overflow-hidden rounded-2xl p-6 md:p-10 flex flex-col items-center justify-center group transition-colors"
            style={{
              backgroundColor: tv.ui.card,
              borderWidth: 1,
              borderColor: tv.border.subtle,
            }}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reducedMotion ? 0 : 0.2,
              delay: 0,
              ease: "easeOut",
            }}
          >
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: tv.ui.mutedForeground }}>
              Accuracy
            </div>
            <AnimatedAccuracyDisplay value={Math.round(accuracy)} color={tv.ui.primary} />
            <div
              className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
              style={{ color: tv.ui.foreground }}
            >
              <TargetIcon size={120} weight="regular" aria-hidden="true" />
            </div>
          </motion.div>
        </div>

        {/* Secondary Stats - Grouped by Words and Characters */}
        <motion.div
          className="flex flex-col md:flex-row gap-4 mb-12"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reducedMotion ? 0 : 0.2,
            delay: 0,
            ease: "easeOut",
          }}
        >
          {/* Words Group */}
          <div
            className="flex-1 rounded-xl p-4"
            style={{
              backgroundColor: tv.ui.card,
              borderWidth: 1,
              borderColor: tv.border.subtle,
            }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-wide text-center mb-3"
              style={{ color: tv.ui.mutedForeground }}
            >
              Words
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Correct Words with Hover */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex flex-col items-center rounded p-1 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <div className="text-3xl font-bold mb-1" style={{ color: tv.ui.success }}>
                      {wordResults.correctWords.length}
                    </div>
                    <div
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: tv.ui.mutedForeground }}
                    >
                      Correct
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-56 p-0"
                  style={{
                    backgroundColor: tv.ui.card,
                    borderColor: tv.border.subtle,
                  }}
                >
                  <div
                    className="p-3"
                    style={{
                      borderBottomWidth: 1,
                      borderColor: tv.border.subtle,
                    }}
                  >
                    <div className="text-sm font-semibold" style={{ color: tv.ui.foreground }}>
                      Correct Words
                    </div>
                    <div className="text-xs" style={{ color: tv.ui.mutedForeground }}>
                      {wordResults.correctWords.length} words
                    </div>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {wordResults.correctWords.length > 0 ? (
                      <div className="p-2 flex flex-wrap gap-1.5">
                        {wordResults.correctWords.map((word, idx) => (
                          <span
                            key={idx}
                            className="max-w-full break-all px-2 py-0.5 text-xs rounded-md font-mono"
                            style={{
                              backgroundColor: tv.ui.secondary,
                              color: tv.ui.primary,
                            }}
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-sm" style={{ color: tv.ui.mutedForeground }}>
                        No correct words
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Incorrect Words with Hover */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex flex-col items-center rounded p-1 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <div className="text-3xl font-bold mb-1" style={{ color: tv.ui.destructive }}>
                      {wordResults.incorrectWords.length}
                    </div>
                    <div
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: tv.ui.mutedForeground }}
                    >
                      Incorrect
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-64 p-0"
                  style={{
                    backgroundColor: tv.ui.card,
                    borderColor: tv.border.subtle,
                  }}
                >
                  <div
                    className="p-3"
                    style={{
                      borderBottomWidth: 1,
                      borderColor: tv.border.subtle,
                    }}
                  >
                    <div className="text-sm font-semibold" style={{ color: tv.ui.foreground }}>
                      Incorrect Words
                    </div>
                    <div className="text-xs" style={{ color: tv.ui.mutedForeground }}>
                      {wordResults.incorrectWords.length} mistakes
                    </div>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {wordResults.incorrectWords.length > 0 ? (
                      <div className="p-2 space-y-1.5">
                        {wordResults.incorrectWords.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex flex-wrap items-center gap-2 break-all px-2 py-1 rounded text-xs font-mono"
                            style={{ backgroundColor: tv.ui.card }}
                          >
                            <span style={{ color: tv.ui.destructive }}>{item.typed}</span>
                            <ArrowRightIcon className="size-3 shrink-0" style={{ color: tv.ui.mutedForeground }} aria-hidden="true" />
                            <span
                              style={{
                                color: tv.ui.primary,
                              }}
                            >
                              {item.expected}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-sm" style={{ color: tv.ui.mutedForeground }}>
                        No mistakes - perfect!
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Characters Group */}
          <div
            className="flex-1 rounded-xl p-4"
            style={{
              backgroundColor: tv.ui.card,
              borderWidth: 1,
              borderColor: tv.border.subtle,
            }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-wide text-center mb-3"
              style={{ color: tv.ui.mutedForeground }}
            >
              Characters
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold mb-1" style={{ color: tv.ui.foreground }}>
                  {stats.missed}
                </div>
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: tv.ui.mutedForeground }}>
                  Missed
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold mb-1" style={{ color: tv.ui.foreground }}>
                  {stats.extra}
                </div>
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: tv.ui.mutedForeground }}>
                  Extra
                </div>
              </div>
            </div>
          </div>
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
                  className="inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-3 font-medium text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-6"
                >
                  <ArrowClockwiseIcon className="size-[18px] shrink-0" aria-hidden="true" />
                  <span>Repeat Test</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => generateTest()}
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
          {lastResultIsValid === true && <p>Verified</p>}
          {saveState === "saved" && lastResultIsValid === null && <p>Saved to history.</p>}
          {rankingStatus === "pending" && <p>Waiting for verification…</p>}
          {!connectMode && (
            <p>
              With the result summary focused:{" "}
              {lastResultIsValid !== false && saveState !== "saved" && saveState !== "saving" ? "Space to save · " : ""}
              Enter for the next test.
            </p>
          )}
        </motion.div>
      </div>
    </>
  );
}
