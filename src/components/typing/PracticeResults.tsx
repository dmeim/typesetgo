import { useEffect, useId, useRef, type ReactNode } from "react";
import { ChartLineIcon, SignOutIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import type { Quote, SettingsState } from "@/lib/typing-constants";
import type { TimelineSample } from "@/lib/result-timeline";
import { tv } from "@/lib/theme-vars";
import { cn } from "@/lib/utils";
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

/**
 * The graph's natural height: 24rem at most, under half the window on short screens, and no taller than 60% of the
 * results width so phones keep a landscape graph. Only the graph shrinks below that (to 8rem) when space runs out.
 */
const GRAPH_SIZE = "min-h-[8rem] flex-[1_1_min(24rem,42dvh,60cqw)]";
/** Wide: the graph shares a grid row with the scores and buttons, so both columns end at the same line. */
const GRAPH_SIZE_WIDE = "@min-[38rem]:col-start-2 @min-[38rem]:row-start-1 @min-[38rem]:min-h-[max(8rem,min(24rem,42dvh,60cqw))]";

/**
 * The finished-test screen in the "Side column" layout: scores and buttons on the left, the graph on the right with
 * detail chips beneath it. It sits centered at its natural size (the graph has a capped height) and shrinks, graph
 * first, when the space it is given is shorter; the page only scrolls once even the smallest graph does not fit.
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

  return (
    <div
      ref={resultsRef}
      tabIndex={-1}
      role="region"
      aria-label="Test results"
      aria-describedby={connectMode ? undefined : hintId}
      className="@container m-auto flex min-h-0 w-full max-w-5xl flex-col gap-3 rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
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
        Wide: scores and buttons on the left, level with the graph on the right; the chips sit under the graph.
        Narrow screens drop the two columns (display: contents) and stack everything, buttons last.
      */}
      <motion.div
        className="flex min-h-0 flex-1 flex-col gap-3 [@media(max-height:40rem)]:gap-2 @min-[38rem]:grid @min-[38rem]:grid-cols-[minmax(13rem,16rem)_minmax(0,1fr)] @min-[38rem]:grid-rows-[auto_auto] @min-[38rem]:gap-x-3"
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.25, ease: "easeOut" }}
      >
        <h2 className="sr-only">Results</h2>
        <div className="contents @min-[38rem]:col-start-1 @min-[38rem]:row-start-1 @min-[38rem]:flex @min-[38rem]:flex-col @min-[38rem]:gap-3">
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

        <div className="contents">
          <ResultDetailSlot chips={chips} data={details} detail={detail} scope={scope} swap className={cn(GRAPH_SIZE, GRAPH_SIZE_WIDE)}>
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
          <ResultDetailChips chips={chips} detail={detail} scope={scope} swap className="@min-[38rem]:col-start-2 @min-[38rem]:row-start-2" />
          {settings.mode === "quote" && currentQuote && (
            <p className="text-center text-xs text-muted-foreground @min-[38rem]:col-start-2 @min-[38rem]:row-start-3">
              — {currentQuote.author}{currentQuote.source ? `, ${currentQuote.source}` : ""}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
