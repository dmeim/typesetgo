import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  ArrowDownIcon, ArrowUpIcon, CaretDownIcon, InfinityIcon, KeyboardIcon, ListChecksIcon, QuotesIcon, ShareNetworkIcon, TextAaIcon, TimerIcon, TrashIcon, TrophyIcon,
} from "@phosphor-icons/react";
import { ResultValidity } from "@/components/stats/ResultLabels";
import { getTestTypeLabels } from "@/components/stats/profile-presentation";
import { Sparkline } from "./MockCharts";
import { LAB_SPRING } from "./lab-settings";
import { MOCK_RESULTS, MOCK_STATS, clock, relativeDay, type MockResult } from "./mock-profile";

const seconds = (result: MockResult) => `${Math.round(result.duration / 1000)}s`;

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

function Delta({ wpm }: { wpm: number }) {
  const delta = wpm - MOCK_STATS.averageWpm;
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

/** The full breakdown a row opens into. */
function ResultDetail({ result }: { result: MockResult }) {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={LAB_SPRING}>
      <div className="grid gap-4 border-t border-border p-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Speed during the test</span>
          <Sparkline values={result.timeline} className="h-24 w-full" />
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {([["Words right", result.wordsCorrect], ["Words wrong", result.wordsIncorrect], ["Letters missed", result.charsMissed], ["Extra letters", result.charsExtra], ["Length", seconds(result)]] as const).map(([label, value]) => (
            <div key={label} className="rounded-xl bg-muted/50 px-3 py-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>
          ))}
          <div className="rounded-xl bg-muted/50 px-3 py-2"><dt className="text-xs text-muted-foreground">Status</dt><dd><ResultValidity verification={result.verification} /></dd></div>
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-2 md:col-span-2">
          {result.invalidReason ? <span className="text-xs text-destructive">Not counted: {result.invalidReason.toLowerCase()}</span> : <Delta wpm={result.wpm} />}
          <span className="flex gap-2">
            <button type="button" className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent"><ShareNetworkIcon className="size-3.5" aria-hidden="true" />Share</button>
            <button type="button" className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"><TrashIcon className="size-3.5" aria-hidden="true" />Delete</button>
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/** Tests grouped by day on a timeline; any row opens in place for the full breakdown. */
function TimelineRows() {
  const [open, setOpen] = useState<string | null>(MOCK_RESULTS[0]._id);
  const days = MOCK_RESULTS.reduce<Record<string, MockResult[]>>((groups, result) => {
    (groups[relativeDay(result.createdAt)] ??= []).push(result);
    return groups;
  }, {});
  return (
    <LayoutGroup>
      <div className="flex flex-col gap-6">
        {Object.entries(days).map(([day, results]) => (
          <motion.section layout="position" transition={LAB_SPRING} key={day} className="flex flex-col gap-3">
            <h3 className="flex items-baseline gap-3 px-1"><span className="text-lg font-bold">{day}</span><span className="text-xs text-muted-foreground">{results.length} {results.length === 1 ? "test" : "tests"} · best {Math.max(...results.map((result) => result.wpm))} WPM</span></h3>
            <ol className="relative ml-3 flex flex-col gap-2 border-l-2 border-border pl-6">
              {results.map((result) => {
                const expanded = open === result._id;
                const invalid = result.verification === "invalid";
                return (
                  <motion.li layout transition={LAB_SPRING} key={result._id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="relative">
                    <motion.span layout="position" aria-hidden="true" className={`absolute -left-[2.3rem] top-3.5 flex size-7 items-center justify-center rounded-full border-4 border-background ${invalid ? "bg-destructive text-background" : expanded ? "bg-primary text-primary-foreground ring-4 ring-primary/25" : "bg-primary text-primary-foreground"}`}>
                      <ModeGlyph mode={result.mode} className="size-3.5" />
                    </motion.span>
                    <div className={`overflow-hidden rounded-2xl border bg-card ${expanded ? "border-primary/40 shadow-lg" : "border-border"}`}>
                      <motion.button layout="position" type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : result._id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/40 sm:gap-4 focus-visible:outline-2 focus-visible:outline-ring">
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="truncate text-sm font-semibold">{getTestTypeLabels(result).join(" · ")}</span>
                          <span className="flex items-center gap-3 overflow-hidden whitespace-nowrap text-xs text-muted-foreground">
                            {clock(result.createdAt)}
                            {result.personalBest ? <PersonalBest /> : invalid ? <ResultValidity verification={result.verification} /> : <span className="hidden sm:inline"><Delta wpm={result.wpm} /></span>}
                          </span>
                        </span>
                        <span className="flex items-baseline gap-1.5"><strong className="text-2xl tabular-nums text-primary">{result.wpm}</strong><span className="hidden text-xs text-muted-foreground sm:inline">wpm</span></span>
                        <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">{Math.round(result.accuracy)}%</span>
                        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={LAB_SPRING}><CaretDownIcon className="size-4 text-muted-foreground" aria-hidden="true" /></motion.span>
                      </motion.button>
                      <AnimatePresence initial={false}>
                        {expanded && <ResultDetail key="detail" result={result} />}
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
  );
}

/** History tab: saved tests on a day timeline; rows open in place. */
export function HistoryPanel() {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">History</h2>
          <p className="text-sm text-muted-foreground">Your latest 100 saved tests, including ones that didn’t count. A few examples below.</p>
        </div>
        <div className="flex gap-6 text-sm">
          <span className="flex flex-col"><span className="text-xs text-muted-foreground">This week</span><strong className="text-xl tabular-nums">23 tests</strong></span>
          <span className="flex flex-col"><span className="text-xs text-muted-foreground">Average</span><strong className="text-xl tabular-nums">{MOCK_STATS.averageWpm} wpm</strong></span>
        </div>
      </section>
      <TimelineRows />
    </div>
  );
}
