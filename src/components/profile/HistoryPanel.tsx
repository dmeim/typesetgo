import { useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  ArrowDownIcon, ArrowUpIcon, CaretDownIcon, CircleNotchIcon, InfinityIcon, KeyboardIcon, ListChecksIcon, QuotesIcon, TextAaIcon, TimerIcon, TrashIcon, TrophyIcon,
} from "@phosphor-icons/react";
import { api } from "../../../convex/_generated/api";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ResultValidity } from "@/components/stats/ResultLabels";
import { PROFILE_HISTORY_LIMIT, formatRecordedMetric, getTestTypeLabels, type VerifiedProfileTestResult } from "@/components/stats/profile-presentation";
import { PROFILE_SPRING } from "./profile-sections";
import { clock, countsTowardStats, groupByDay, personalBestId, testsSince } from "./profile-stats";

const seconds = (result: VerifiedProfileTestResult) => `${Math.round(result.duration / 1000)}s`;
const WEEK = 7 * 86_400_000;

function ModeGlyph({ mode, className }: { mode: string; className: string }) {
  const props = { weight: "fill" as const, className, "aria-hidden": true };
  switch (mode) {
    case "time": return <TimerIcon {...props} />;
    case "words": return <TextAaIcon {...props} />;
    case "quote": return <QuotesIcon {...props} />;
    case "zen": return <InfinityIcon {...props} />;
    case "preset": return <ListChecksIcon {...props} />;
    default: return <KeyboardIcon {...props} />;
  }
}

function Delta({ wpm, average }: { wpm: number; average: number }) {
  const delta = Math.round(wpm - average);
  const Arrow = delta >= 0 ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${delta >= 0 ? "text-success" : "text-destructive"}`}>
      <Arrow className="size-3" aria-hidden="true" />{Math.abs(delta)} vs avg
    </span>
  );
}

function PersonalBest() {
  return <span className="inline-flex items-center gap-1 rounded-full bg-[#E8B931] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-black"><TrophyIcon weight="fill" className="size-3" aria-hidden="true" />Best</span>;
}

const actionClass = "min-h-11 rounded-md border border-border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50";

/** Owner only: confirm, then delete one saved test. */
function DeleteTest({ result, clerkId }: { result: VerifiedProfileTestResult; clerkId: string }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const deleteResult = useMutation(api.testResults.deleteResult);
  const confirm = async () => {
    if (pending.current) return;
    pending.current = true;
    setDeleting(true);
    setError(null);
    try {
      await deleteResult({ resultId: result._id, clerkId });
      setOpen(false);
    } catch {
      setError("Could not delete this test. Please try again.");
    } finally {
      pending.current = false;
      setDeleting(false);
    }
  };
  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!pending.current) { setOpen(next); setError(null); } }}>
      <AlertDialogTrigger asChild>
        <button type="button" className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 focus-visible:outline-2 focus-visible:outline-ring">
          <TrashIcon className="size-3.5" aria-hidden="true" />Delete test
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-card text-card-foreground shadow-none sm:max-w-sm" onEscapeKeyDown={(event) => { if (pending.current) event.preventDefault(); }}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this test?</AlertDialogTitle>
          <AlertDialogDescription>This removes the saved test{countsTowardStats(result.verification) ? " and updates your statistics" : " from your history"}. This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting} className={actionClass}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={deleting} onClick={(event) => { event.preventDefault(); void confirm(); }} className={actionClass}>
            {deleting ? <CircleNotchIcon className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" /> : <TrashIcon className="size-4 shrink-0" aria-hidden="true" />}
            {deleting ? "Deleting…" : "Confirm delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** The full breakdown a row opens into. */
function ResultDetail({ result, averageWpm, clerkId }: { result: VerifiedProfileTestResult; averageWpm: number; clerkId: string | null }) {
  const metrics = [
    ["Words right", formatRecordedMetric(result.wordsCorrect)],
    ["Words wrong", formatRecordedMetric(result.wordsIncorrect)],
    ["Letters missed", formatRecordedMetric(result.charsMissed)],
    ["Extra letters", formatRecordedMetric(result.charsExtra)],
    ["Length", seconds(result)],
  ] as const;
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={PROFILE_SPRING}>
      <div className="flex flex-col gap-4 border-t border-border p-4">
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-muted/50 px-3 py-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>
          ))}
          <div className="rounded-xl bg-muted/50 px-3 py-2"><dt className="text-xs text-muted-foreground">Status</dt><dd><ResultValidity verification={result.verification} /></dd></div>
        </dl>
        {result.verification === "unverified" && <p className="text-xs text-warning">Saved for history only. It does not count toward stats, achievements, streaks or leaderboards.</p>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {result.verification === "invalid"
            ? <span className="text-xs text-destructive">Not counted{result.invalidReason ? `: ${result.invalidReason.toLowerCase()}` : ""}</span>
            : <Delta wpm={result.wpm} average={averageWpm} />}
          {clerkId && <DeleteTest result={result} clerkId={clerkId} />}
        </div>
      </div>
    </motion.div>
  );
}

/** History tab: your latest saved tests on a day timeline; rows open in place. */
export function HistoryPanel({ results, averageWpm, bestWpm, clerkId }: {
  results: readonly VerifiedProfileTestResult[];
  averageWpm: number;
  bestWpm: number;
  /** Lets the owner delete tests. */
  clerkId: string | null;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const days = useMemo(() => groupByDay(results, now), [results, now]);
  const bestId = useMemo(() => personalBestId(results, bestWpm), [results, bestWpm]);
  const thisWeek = testsSince(results, now - WEEK);
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">History</h2>
          <p className="text-sm text-muted-foreground">Your latest {PROFILE_HISTORY_LIMIT} saved tests, including ones that didn’t count.</p>
        </div>
        <div className="flex gap-6 text-sm">
          <span className="flex flex-col"><span className="text-xs text-muted-foreground">This week</span><strong className="text-xl tabular-nums">{thisWeek} {thisWeek === 1 ? "test" : "tests"}</strong></span>
          <span className="flex flex-col"><span className="text-xs text-muted-foreground">Average</span><strong className="text-xl tabular-nums">{averageWpm} wpm</strong></span>
        </div>
      </section>
      {days.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No tests saved yet. Finish a test on Home and it shows up here.</p>
      ) : (
        <LayoutGroup>
          <div className="flex flex-col gap-6">
            {days.map((day) => (
              <motion.section layout="position" transition={PROFILE_SPRING} key={day.key} aria-label={day.label} className="flex flex-col gap-3">
                <h3 className="flex flex-wrap items-baseline gap-x-3 px-1"><span className="text-lg font-bold">{day.label}</span><span className="text-xs text-muted-foreground">{day.results.length} {day.results.length === 1 ? "test" : "tests"} · best {Math.max(...day.results.map((result) => result.wpm))} WPM</span></h3>
                <ol className="relative ml-3 flex flex-col gap-2 border-l-2 border-border pl-6">
                  {day.results.map((result) => {
                    const expanded = open === result._id;
                    const invalid = result.verification === "invalid";
                    return (
                      <motion.li layout transition={PROFILE_SPRING} key={result._id} className="relative">
                        <motion.span layout="position" aria-hidden="true" className={`absolute -left-[2.3rem] top-3.5 flex size-7 items-center justify-center rounded-full border-4 border-background ${invalid ? "bg-destructive text-background" : expanded ? "bg-primary text-primary-foreground ring-4 ring-primary/25" : "bg-primary text-primary-foreground"}`}>
                          <ModeGlyph mode={result.mode} className="size-3.5" />
                        </motion.span>
                        <div className={`overflow-hidden rounded-2xl border bg-card ${expanded ? "border-primary/40 shadow-lg" : "border-border"}`}>
                          <motion.button layout="position" type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : result._id)}
                            aria-label={`${getTestTypeLabels(result).join(", ")} at ${clock(result.createdAt)}: ${result.wpm} WPM, ${Math.round(result.accuracy)}% accuracy. Test details`}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/40 sm:gap-4 focus-visible:outline-2 focus-visible:outline-ring">
                            <span className="flex min-w-0 flex-1 flex-col gap-1">
                              <span className="truncate text-sm font-semibold">{getTestTypeLabels(result).join(" · ")}</span>
                              <span className="flex items-center gap-3 overflow-hidden whitespace-nowrap text-xs text-muted-foreground">
                                <time dateTime={new Date(result.createdAt).toISOString()}>{clock(result.createdAt)}</time>
                                {result._id === bestId ? <PersonalBest /> : invalid || result.verification === "unverified" ? <ResultValidity verification={result.verification} /> : <span className="hidden sm:inline"><Delta wpm={result.wpm} average={averageWpm} /></span>}
                              </span>
                            </span>
                            <span className="flex items-baseline gap-1.5"><strong className="text-2xl tabular-nums text-primary">{result.wpm}</strong><span className="hidden text-xs text-muted-foreground sm:inline">wpm</span></span>
                            <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">{Math.round(result.accuracy)}%</span>
                            <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={PROFILE_SPRING}><CaretDownIcon className="size-4 text-muted-foreground" aria-hidden="true" /></motion.span>
                          </motion.button>
                          <AnimatePresence initial={false}>
                            {expanded && <ResultDetail key="detail" result={result} averageWpm={averageWpm} clerkId={clerkId} />}
                          </AnimatePresence>
                        </div>
                      </motion.li>
                    );
                  })}
                </ol>
              </motion.section>
            ))}
          </div>
        </LayoutGroup>
      )}
    </div>
  );
}
