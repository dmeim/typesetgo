import { useState, type PointerEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ResultChips } from "./ResultChips";
import { ResultActions, StatTile } from "./ResultsPrimitives";
import { MOCK_ACCURACY_HISTORY, MOCK_ERROR_SECONDS, MOCK_HISTORY, MOCK_SUMMARY } from "./mock-results";

const WIDTH = 640;
const HEIGHT = 200;
const LEFT = 34;
const RIGHT = 40;
const TOP = 26;
const BOTTOM = 16;
const MAX_WPM = 80;
const MIN_ACC = 85;
const WPM_TICKS = [0, 20, 40, 60, 80];
const ACC_TICKS = [85, 90, 95, 100];

const x = (second: number) => LEFT + (second / (MOCK_HISTORY.length - 1)) * (WIDTH - LEFT - RIGHT);
const yWpm = (wpm: number) => HEIGHT - BOTTOM - (wpm / MAX_WPM) * (HEIGHT - TOP - BOTTOM);
const yAcc = (accuracy: number) => HEIGHT - BOTTOM - ((Math.max(accuracy, MIN_ACC) - MIN_ACC) / (100 - MIN_ACC)) * (HEIGHT - TOP - BOTTOM);
const path = (values: number[], y: (value: number) => number) => values.map((value, second) => `${second === 0 ? "M" : "L"}${x(second)},${y(value)}`).join(" ");
const WPM_LINE = path(MOCK_HISTORY, yWpm);
const ACC_LINE = path(MOCK_ACCURACY_HISTORY, yAcc);
const WPM_AREA = `${WPM_LINE} L${x(MOCK_HISTORY.length - 1)},${HEIGHT - BOTTOM} L${x(0)},${HEIGHT - BOTTOM} Z`;

/** Mockup 6: the speed graph with accuracy on a second axis, and the morphing chips in place of the summary sentence. */
export function DualAxisGraphResults() {
  const [scrub, setScrub] = useState<number | null>(null);
  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = ((event.clientX - box.left) / box.width * WIDTH - LEFT) / (WIDTH - LEFT - RIGHT);
    setScrub(Math.max(0, Math.min(MOCK_HISTORY.length - 1, Math.round(ratio * (MOCK_HISTORY.length - 1)))));
  };

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-6">
      <div className="grid w-full grid-cols-3 gap-3">
        <StatTile label="wpm" value={MOCK_SUMMARY.wpm} tone="text-primary" />
        <StatTile label="accuracy" value={MOCK_SUMMARY.accuracy} suffix="%" tone="text-(--accent-emphasis)" />
        <StatTile label="raw wpm" value={MOCK_SUMMARY.rawWpm} />
      </div>

      <div className="relative w-full rounded-xl border border-border bg-card p-3">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
          <span className="flex items-center gap-2 text-primary"><span className="h-0.5 w-4 rounded bg-primary" />wpm</span>
          <span className="flex items-center gap-2 text-destructive"><span className="size-2 rounded-full bg-destructive" />mistake</span>
          <span className="flex items-center gap-2 text-(--accent-emphasis)">accuracy<span className="h-0 w-4 border-t-2 border-dashed border-(--accent-emphasis)" /></span>
        </div>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full touch-none" onPointerMove={onMove} onPointerLeave={() => setScrub(null)} role="img" aria-label="Speed and accuracy over time">
          <defs>
            <linearGradient id="dual-speed-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {WPM_TICKS.map((tick) => (
            <g key={tick}>
              <line x1={LEFT} x2={WIDTH - RIGHT} y1={yWpm(tick)} y2={yWpm(tick)} className="stroke-border" strokeDasharray="3 5" />
              <text x={LEFT - 6} y={yWpm(tick) + 3} textAnchor="end" className="fill-primary text-[10px]">{tick}</text>
            </g>
          ))}
          {ACC_TICKS.map((tick) => (
            <text key={tick} x={WIDTH - RIGHT + 6} y={yAcc(tick) + 3} className="fill-(--accent-emphasis) text-[10px]">{tick}%</text>
          ))}
          <text x={LEFT - 6} y={TOP - 12} textAnchor="end" className="fill-muted-foreground text-[9px]">wpm</text>
          <text x={WIDTH - RIGHT + 6} y={TOP - 12} className="fill-muted-foreground text-[9px]">acc</text>

          <motion.path d={WPM_AREA} fill="url(#dual-speed-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.5 }} />
          <motion.path d={WPM_LINE} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: "easeInOut" }} />
          <motion.path d={ACC_LINE} fill="none" className="stroke-(--accent-emphasis)" strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} />

          {MOCK_ERROR_SECONDS.map((second, index) => (
            <motion.g key={second} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 + index * 0.1 }}>
              <line x1={x(second)} x2={x(second)} y1={yWpm(MOCK_HISTORY[second])} y2={yAcc(MOCK_ACCURACY_HISTORY[second])} className="stroke-destructive/50" strokeDasharray="2 3" />
              <motion.circle cx={x(second)} cy={yWpm(MOCK_HISTORY[second])} r={5} className="fill-destructive stroke-card" strokeWidth={2} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15, delay: 1 + index * 0.1 }} />
              <motion.circle cx={x(second)} cy={yAcc(MOCK_ACCURACY_HISTORY[second])} r={3.5} className="fill-destructive stroke-card" strokeWidth={1.5} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15, delay: 1.05 + index * 0.1 }} />
            </motion.g>
          ))}

          {scrub !== null && (
            <g>
              <line x1={x(scrub)} x2={x(scrub)} y1={TOP} y2={HEIGHT - BOTTOM} className="stroke-muted-foreground" strokeDasharray="2 3" />
              <circle cx={x(scrub)} cy={yWpm(MOCK_HISTORY[scrub])} r={5} className="fill-primary stroke-card" strokeWidth={2} />
              <circle cx={x(scrub)} cy={yAcc(MOCK_ACCURACY_HISTORY[scrub])} r={4} className="fill-(--accent-emphasis) stroke-card" strokeWidth={2} />
            </g>
          )}
        </svg>
        <AnimatePresence>
          {scrub !== null && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0, left: `${(x(scrub) / WIDTH) * 100}%` }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 600, damping: 40 }}
              className="pointer-events-none absolute top-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs shadow"
            >
              <span className="text-muted-foreground">{scrub + 1}s · </span>
              <b className="text-primary">{MOCK_HISTORY[scrub]} wpm</b>
              <span className="text-muted-foreground"> · </span>
              <b className="text-(--accent-emphasis)">{MOCK_ACCURACY_HISTORY[scrub]}%</b>
              {MOCK_ERROR_SECONDS.includes(scrub) && <span className="text-destructive"> · mistake</span>}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground" style={{ paddingLeft: `${(LEFT / WIDTH) * 100}%`, paddingRight: `${(RIGHT / WIDTH) * 100}%` }}>
          <span>1s</span><span>{MOCK_SUMMARY.durationSeconds}s</span>
        </div>
      </div>

      <ResultChips />
      <ResultActions compact />
    </div>
  );
}
