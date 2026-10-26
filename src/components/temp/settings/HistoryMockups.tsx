import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  ArrowDownIcon, ArrowUpIcon, CaretDownIcon, InfinityIcon, KeyboardIcon, ListChecksIcon, QuotesIcon, ShareNetworkIcon, TextAaIcon, TimerIcon, TrashIcon, TrophyIcon,
} from "@phosphor-icons/react";
import { ResultModeLabels, ResultValidity } from "@/components/stats/ResultLabels";
import { getTestTypeLabels } from "@/components/stats/profile-presentation";
import { toast } from "@/lib/toast-manager";
import { Ring, Sparkline, StylePicker } from "./MockCharts";
import { LAB_SPRING } from "./lab-settings";
import { MOCK_RESULTS, MOCK_STATS, clock, relativeDay, type MockResult } from "./mock-profile";

const STYLES = ["Table", "Score cards", "Day timeline", "Expandable rows", "Tiles + filter"];
const details = (result: MockResult) => toast.add({ type: "info", title: `${result.wpm} WPM test`, description: "Opens the test details, as today." });
const seconds = (result: MockResult) => `${Math.round(result.duration / 1000)}s`;
const errors = (result: MockResult) => (result.wordsIncorrect ?? 0) + (result.charsMissed ?? 0) + (result.charsExtra ?? 0);

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

function TestSummary({ result }: { result: MockResult }) {
  const [mode, ...rest] = getTestTypeLabels(result);
  return (
    <span className="flex items-center gap-2">
      <ModeGlyph mode={result.mode} className="size-4 shrink-0 text-primary" />
      <span className="font-semibold">{mode}</span>
      {rest.length > 0 && <span className="text-xs text-muted-foreground">{rest.join(" · ")}</span>}
    </span>
  );
}

type SortKey = "createdAt" | "wpm" | "accuracy";

/** 1 · Table: classic sortable columns; rows glide into their new order. */
function Table() {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "createdAt", desc: true });
  const rows = useMemo(() => [...MOCK_RESULTS].sort((a, b) => (a[sort.key] - b[sort.key]) * (sort.desc ? -1 : 1)), [sort]);
  const header = (key: SortKey, label: string, align = "text-left") => (
    <th scope="col" className={`px-4 py-3 font-medium ${align}`} aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button type="button" onClick={() => setSort((current) => ({ key, desc: current.key === key ? !current.desc : true }))} className="inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        {label}
        {sort.key === key && <motion.span layoutId="history-sort" transition={LAB_SPRING} animate={{ rotate: sort.desc ? 0 : 180 }}><ArrowDownIcon className="size-3.5" aria-hidden="true" /></motion.span>}
      </button>
    </th>
  );
  return (
    <div className="overflow-x-auto rounded-3xl border border-border bg-card">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="border-b border-border text-xs text-muted-foreground">
          <tr>{header("createdAt", "Date")}{header("wpm", "WPM")}{header("accuracy", "Accuracy")}<th scope="col" className="px-4 py-3 text-left font-medium">Test</th><th scope="col" className="px-4 py-3 text-left font-medium">Errors</th><th scope="col" className="px-4 py-3 text-left font-medium">Status</th></tr>
        </thead>
        <LayoutGroup>
          <tbody>
            {rows.map((result) => (
              <motion.tr layout transition={LAB_SPRING} key={result._id} onClick={() => details(result)} className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/60">
                <td className="whitespace-nowrap px-4 py-3"><span className="block">{relativeDay(result.createdAt)}</span><span className="text-xs text-muted-foreground">{clock(result.createdAt)}</span></td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <strong className="w-8 text-lg tabular-nums text-primary">{result.wpm}</strong>
                    <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-muted lg:block"><span className="block h-full rounded-full bg-primary" style={{ width: `${result.wpm / MOCK_STATS.bestWpm * 100}%` }} /></span>
                    {result.personalBest && <PersonalBest />}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">{result.accuracy}%</td>
                <td className="whitespace-nowrap px-4 py-3"><TestSummary result={result} /></td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">{errors(result)}</td>
                <td className="px-4 py-3"><ResultValidity verification={result.verification} /></td>
              </motion.tr>
            ))}
          </tbody>
        </LayoutGroup>
      </table>
    </div>
  );
}

/** 2 · Score cards: each test as a card with its speed line, like a mini results page. */
function ScoreCards() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-4">
      {MOCK_RESULTS.map((result, index) => (
        <motion.button key={result._id} type="button" onClick={() => details(result)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...LAB_SPRING, delay: index * 0.05 }}
          className={`group relative flex flex-col gap-3 overflow-hidden rounded-3xl border bg-card p-5 text-left hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-ring motion-safe:transition-transform motion-safe:hover:-translate-y-0.5 ${result.verification === "invalid" ? "border-destructive/40 opacity-75" : "border-border"}`}>
          <span className="flex items-start justify-between gap-2">
            <ResultModeLabels result={result} />
            {result.personalBest && <PersonalBest />}
          </span>
          <span className="flex items-end justify-between gap-3">
            <span className="flex flex-col">
              <span className="text-5xl font-bold tabular-nums tracking-tight text-primary">{result.wpm}</span>
              <span className="text-xs text-muted-foreground">words per minute</span>
            </span>
            <Ring value={result.accuracy} size={56} stroke={6}><span className="text-[0.7rem] font-bold tabular-nums">{Math.round(result.accuracy)}%</span></Ring>
          </span>
          <Sparkline values={result.timeline} className="h-12 w-full" />
          <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{relativeDay(result.createdAt)} · {clock(result.createdAt)}</span>
            <ResultValidity verification={result.verification} />
          </span>
        </motion.button>
      ))}
    </div>
  );
}

/** 3 · Day timeline: tests grouped by day, each compared with your average. */
function DayTimeline() {
  const days = MOCK_RESULTS.reduce<Record<string, MockResult[]>>((groups, result) => {
    (groups[relativeDay(result.createdAt)] ??= []).push(result);
    return groups;
  }, {});
  return (
    <div className="flex flex-col gap-6">
      {Object.entries(days).map(([day, results], dayIndex) => (
        <section key={day} className="flex flex-col gap-3">
          <h3 className="flex items-baseline gap-3 px-1"><span className="text-lg font-bold">{day}</span><span className="text-xs text-muted-foreground">{results.length} {results.length === 1 ? "test" : "tests"} · best {Math.max(...results.map((result) => result.wpm))} WPM</span></h3>
          <ol className="relative ml-3 flex flex-col gap-2 border-l-2 border-border pl-6">
            {results.map((result, index) => {
              return (
                <motion.li key={result._id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...LAB_SPRING, delay: dayIndex * 0.08 + index * 0.05 }} className="relative">
                  <span aria-hidden="true" className={`absolute -left-[2.3rem] top-3.5 flex size-7 items-center justify-center rounded-full border-4 border-background ${result.verification === "invalid" ? "bg-destructive text-background" : "bg-primary text-primary-foreground"}`}><ModeGlyph mode={result.mode} className="size-3.5" /></span>
                  <button type="button" onClick={() => details(result)} className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-border bg-card px-4 py-3 text-left hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-ring">
                    <span className="w-16 text-xs text-muted-foreground">{clock(result.createdAt)}</span>
                    <span className="min-w-40 flex-1 text-sm">{getTestTypeLabels(result).join(" · ")}</span>
                    <span className="flex items-baseline gap-2"><strong className="text-2xl tabular-nums text-primary">{result.wpm}</strong><span className="text-xs text-muted-foreground">wpm</span></span>
                    <Delta wpm={result.wpm} />
                    <span className="w-16 text-right text-sm tabular-nums">{result.accuracy}%</span>
                    {result.personalBest ? <PersonalBest /> : <ResultValidity verification={result.verification} />}
                  </button>
                </motion.li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** 4 · Expandable rows: compact list; a row opens in place to show the full breakdown. */
function ExpandableRows() {
  const [open, setOpen] = useState<string | null>(MOCK_RESULTS[0]._id);
  return (
    <LayoutGroup>
      <ul className="flex flex-col gap-2">
        {MOCK_RESULTS.map((result) => {
          const expanded = open === result._id;
          return (
            <motion.li layout transition={LAB_SPRING} key={result._id} className={`overflow-hidden rounded-2xl border bg-card ${expanded ? "border-primary/40 shadow-lg" : "border-border"}`}>
              <motion.button layout="position" type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : result._id)} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-ring">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><ModeGlyph mode={result.mode} className="size-4" /></span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm">{getTestTypeLabels(result).join(" · ")}</span>
                  <span className="text-xs text-muted-foreground">{relativeDay(result.createdAt)} · {clock(result.createdAt)}</span>
                </span>
                <strong className="text-xl tabular-nums text-primary">{result.wpm}</strong>
                <span className="w-14 text-right text-sm tabular-nums text-muted-foreground">{Math.round(result.accuracy)}%</span>
                <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={LAB_SPRING}><CaretDownIcon className="size-4 text-muted-foreground" aria-hidden="true" /></motion.span>
              </motion.button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div key="detail" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={LAB_SPRING}>
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
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ul>
    </LayoutGroup>
  );
}

const FILTERS = [["all", "All"], ["time", "Time"], ["words", "Words"], ["quote", "Quote"]] as const;

/** 5 · Tiles + filter: big glanceable numbers; filter chips reshuffle the grid. */
function TilesWithFilter() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const shown = MOCK_RESULTS.filter((result) => filter === "all" || result.mode === filter);
  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Filter tests" className="flex w-fit gap-1 rounded-2xl bg-muted/60 p-1">
        {FILTERS.map(([value, label]) => (
          <button key={value} type="button" role="radio" aria-checked={filter === value} onClick={() => setFilter(value)} className={`relative rounded-xl px-4 py-1.5 text-sm ${filter === value ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {filter === value && <motion.span layoutId="history-filter" transition={LAB_SPRING} className="absolute inset-0 rounded-xl bg-primary" />}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>
      <motion.div layout className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
        <AnimatePresence mode="popLayout">
          {shown.map((result) => {
            return (
              <motion.button layout key={result._id} type="button" onClick={() => details(result)} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={LAB_SPRING}
                className={`relative flex aspect-square flex-col justify-between rounded-3xl border p-4 text-left focus-visible:outline-2 focus-visible:outline-ring ${result.personalBest ? "border-[#E8B931] bg-[#E8B931]/10" : result.verification === "invalid" ? "border-dashed border-destructive/50 bg-card opacity-70" : "border-border bg-card"}`}>
                <span className="flex items-center justify-between text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><ModeGlyph mode={result.mode} className="size-4 text-primary" />{getTestTypeLabels(result)[0]}</span>{result.personalBest && <TrophyIcon weight="fill" className="size-4 text-[#E8B931]" aria-label="Personal best" />}</span>
                <span className="flex flex-col">
                  <span className="text-6xl font-bold leading-none tabular-nums tracking-tighter">{result.wpm}</span>
                  <span className="text-xs text-muted-foreground">wpm · {Math.round(result.accuracy)}% accuracy</span>
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${result.accuracy}%` }} /></span>
                <span className="text-[0.7rem] text-muted-foreground">{relativeDay(result.createdAt)} · {clock(result.createdAt)}</span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

const VARIANTS = [Table, ScoreCards, DayTimeline, ExpandableRows, TilesWithFilter];

/** History tab: saved tests with five candidate layouts to compare. */
export function HistoryPanel() {
  const [style, setStyle] = useState(0);
  const Variant = VARIANTS[style];
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
      <div className="flex flex-col gap-2">
        <span className="px-1 text-xs uppercase tracking-wider text-muted-foreground">History style (mockup)</span>
        <StylePicker label="History style" value={style} onChange={setStyle} names={STYLES} />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={style} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          <Variant />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
