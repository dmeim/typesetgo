import { useEffect, useId, useRef, type ReactNode } from "react";
import { ChartLineIcon, SealCheckIcon, SignOutIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import type { Quote, SettingsState } from "@/lib/typing-constants";
import type { TimelineSample } from "@/lib/result-timeline";
import { tv } from "@/lib/theme-vars";
import { cn } from "@/lib/utils";
import PracticeResultsInfo from "@/components/typing/PracticeResultsInfo";
import { ResultActions, type ResultSaveState } from "@/components/typing/results/ResultActions";
import { ResultDetailChips, ResultDetailSlot } from "@/components/typing/results/ResultDetails";
import { CompareBars, Score } from "@/components/typing/results/ResultScore";
import { ResultsChart } from "@/components/typing/results/ResultsChart";
import { resultChips, useResultDetail, type ResultDetailsData } from "@/components/typing/results/result-details";
import { buildResultStats, describeInvalidReason, describeTest, ghostSpeed, type ResultComparison } from "@/components/typing/results/result-stats";

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
  saveState: ResultSaveState;
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

function Badge({ tone = "text-muted-foreground", children }: { tone?: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-muted px-2 py-0.5 font-medium", tone)}>{children}</span>;
}

/**
 * The finished-test screen in the "Side column" layout: scores and buttons on the left, the graph filling the right
 * with detail chips beneath it. It fills the height it is given and only scrolls when that is too short.
 */
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
  const canSave = lastResultIsValid !== false && saveState !== "saved" && saveState !== "saving";
  const resultsRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const scope = useId();
  const detail = useResultDetail();
  const resultsInfo = connectMode
    ? "Your result is shared with the host."
    : lastResultIsValid === false
    ? "This test could not be verified and cannot be saved."
    : isRepeated || rankingStatus === "unranked"
      ? "This practice can be saved to your history, but will not appear on leaderboards."
      : rankingStatus === "pending"
        ? "Waiting for verification…"
        : "Review your words per minute, accuracy, and typing details below.";
  const scores = buildResultStats(wpm, accuracy, comparison);
  const testLabel = describeTest(settings);
  const details: ResultDetailsData = {
    correctWords: wordResults.correctWords,
    incorrectWords: wordResults.incorrectWords,
    stats,
    testLabel,
    seconds: duration === undefined ? null : (duration / 1000).toFixed(1),
  };
  const chips = resultChips(details);
  const ghost = settings.ghostWriterEnabled ? ghostSpeed(settings) : null;

  useEffect(() => {
    // Completion moves focus to the result summary, unless a modal currently owns it.
    if (!document.querySelector('[role="dialog"]')) resultsRef.current?.focus({ preventScroll: true });
  }, []);

  const meta = (
    <>
      <span className="hidden truncate @min-[38rem]:inline">{testLabel}</span>
      {comparison && <span className="whitespace-nowrap">Compared with your last {comparison.tests} {comparison.tests === 1 ? "test" : "tests"}</span>}
      {settings.mode === "quote" && currentQuote && (
        <span className="min-w-0 truncate">— {currentQuote.author}{currentQuote.source && `, ${currentQuote.source}`}</span>
      )}
      {isRepeated && !connectMode && <Badge>Repeated</Badge>}
      {lastResultIsValid === true && <Badge tone="text-success"><SealCheckIcon className="size-3.5" weight="fill" aria-hidden="true" />Verified</Badge>}
      {saveState === "saved" && lastResultIsValid === null && <Badge>Saved to history</Badge>}
      {rankingStatus === "pending" && <Badge>Waiting for verification…</Badge>}
    </>
  );

  return (
    <div
      ref={resultsRef}
      tabIndex={-1}
      role="region"
      aria-label="Test results"
      aria-describedby={connectMode ? undefined : hintId}
      className="@container mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
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
        if (event.key === " " && canSave) {
          event.preventDefault();
          saveResults();
        }
      }}
    >
      {!connectMode && (
        <p id={hintId} className="sr-only">
          {canSave ? "Space saves this result. " : ""}
          {advancementBlocked ? "Next and Repeat are available after saving finishes." : "Enter starts the next test."}
        </p>
      )}
      {/*
        Wide: the heading sits over the graph so the score column gets the full height.
        Narrow screens drop the two columns (display: contents) and stack everything, buttons last.
      */}
      <motion.div
        className="flex flex-1 flex-col gap-3 @min-[38rem]:grid @min-[38rem]:grid-cols-[minmax(13rem,16rem)_minmax(0,1fr)] @min-[38rem]:grid-rows-[auto_1fr]"
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.25, ease: "easeOut" }}
      >
        <PracticeResultsInfo meta={meta} className="@min-[38rem]:col-start-2 @min-[38rem]:row-start-1">{resultsInfo}</PracticeResultsInfo>
        <div className="contents @min-[38rem]:col-start-1 @min-[38rem]:row-span-2 @min-[38rem]:row-start-1 @min-[38rem]:flex @min-[38rem]:flex-col @min-[38rem]:gap-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl border border-border bg-card p-4 @min-[38rem]:flex @min-[38rem]:flex-1 @min-[38rem]:flex-col @min-[38rem]:justify-around">
            <div className="flex flex-col gap-3">
              <Score stat={scores.wpm} context={false} />
              <CompareBars stat={scores.wpm} />
            </div>
            <div className="flex flex-col gap-3 @min-[38rem]:border-t @min-[38rem]:border-border @min-[38rem]:pt-3">
              <Score stat={scores.accuracy} context={false} delay={0.3} />
              <CompareBars stat={scores.accuracy} delay={0.4} />
            </div>
          </div>

          <div className="order-last flex flex-col gap-3 @min-[38rem]:order-none">
            {lastResultIsValid === false && (
              <div
                className="flex items-start gap-2 rounded-xl border p-3 text-sm"
                style={{ backgroundColor: tv.ui.destructiveSurface, borderColor: tv.ui.destructive }}
              >
                <WarningCircleIcon className="mt-0.5 size-4 shrink-0" style={{ color: tv.ui.destructive }} aria-hidden="true" />
                <p>
                  <span className="font-medium" style={{ color: tv.ui.destructive }}>Unverified</span>{" "}
                  <span style={{ color: tv.ui.mutedForeground }}>{describeInvalidReason(lastResultInvalidReason)}</span>
                </p>
              </div>
            )}
            {connectMode ? (
              <>
                {connectActions}
                {onLeave && (
                  <button
                    type="button"
                    onClick={onLeave}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    style={{ color: tv.ui.destructive, backgroundColor: tv.ui.destructiveSurface, borderColor: tv.ui.destructive }}
                  >
                    <SignOutIcon className="size-[18px] shrink-0" aria-hidden="true" />
                    Leave Room
                  </button>
                )}
              </>
            ) : (
              <ResultActions
                stacked
                saveState={saveState}
                invalid={lastResultIsValid === false}
                onSave={saveResults}
                onRepeat={repeatTest}
                onNext={generateTest}
                advanceBlocked={advancementBlocked}
              />
            )}
          </div>
        </div>

        <div className="contents @min-[38rem]:col-start-2 @min-[38rem]:row-start-2 @min-[38rem]:flex @min-[38rem]:min-h-0 @min-[38rem]:flex-col @min-[38rem]:gap-3">
          <ResultDetailSlot chips={chips} data={details} detail={detail} scope={scope} swap className="min-h-[9rem] flex-1">
            {timeline.length >= 2 ? (
              <ResultsChart
                samples={timeline}
                guide={ghost === null ? undefined : { wpm: ghost, label: `ghost ${ghost}` }}
                className="flex-1 rounded-2xl border border-border bg-card p-3"
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 p-4 text-center text-sm text-muted-foreground">
                <ChartLineIcon className="size-6" weight="regular" aria-hidden="true" />
                <p>No graph for this result. The speed and accuracy graph needs at least two seconds of typing.</p>
              </div>
            )}
          </ResultDetailSlot>
          <ResultDetailChips chips={chips} detail={detail} scope={scope} swap />
        </div>
      </motion.div>
    </div>
  );
}
