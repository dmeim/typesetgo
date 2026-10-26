import { useState, type PointerEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ResultActions, StatTile } from "./ResultsPrimitives";
import { MOCK_CHARACTERS, MOCK_ERROR_SECONDS, MOCK_HISTORY, MOCK_MISTAKES, MOCK_SUMMARY } from "./mock-results";

const WIDTH = 640;
const HEIGHT = 180;
const PAD = 16;
const MAX_WPM = 80;

const x = (second: number) => PAD + (second / (MOCK_HISTORY.length - 1)) * (WIDTH - PAD * 2);
const y = (wpm: number) => HEIGHT - PAD - (wpm / MAX_WPM) * (HEIGHT - PAD * 2);
const LINE = MOCK_HISTORY.map((wpm, second) => `${second === 0 ? "M" : "L"}${x(second)},${y(wpm)}`).join(" ");
const AREA = `${LINE} L${x(MOCK_HISTORY.length - 1)},${HEIGHT - PAD} L${x(0)},${HEIGHT - PAD} Z`;

/** Mockup 3: how the test went, second by second, with a scrubber and error markers. */
export function SpeedGraphResults() {
  const [scrub, setScrub] = useState<number | null>(null);
  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = ((event.clientX - box.left) / box.width * WIDTH - PAD) / (WIDTH - PAD * 2);
    setScrub(Math.max(0, Math.min(MOCK_HISTORY.length - 1, Math.round(ratio * (MOCK_HISTORY.length - 1)))));
  };

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-6">
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="wpm" value={MOCK_SUMMARY.wpm} tone="text-primary" />
        <StatTile label="accuracy" value={MOCK_SUMMARY.accuracy} suffix="%" />
        <StatTile label="raw wpm" value={MOCK_SUMMARY.rawWpm} />
        <StatTile label="mistakes" value={MOCK_MISTAKES.length} tone="text-destructive" />
      </div>

      <div className="relative w-full rounded-xl border border-border bg-card p-3">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full touch-none" onPointerMove={onMove} onPointerLeave={() => setScrub(null)} role="img" aria-label="Speed over time">
          <defs>
            <linearGradient id="speed-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[20, 40, 60].map((tick) => (
            <g key={tick}>
              <line x1={PAD} x2={WIDTH - PAD} y1={y(tick)} y2={y(tick)} className="stroke-border" strokeDasharray="3 5" />
              <text x={PAD} y={y(tick) - 4} className="fill-muted-foreground text-[10px]">{tick}</text>
            </g>
          ))}
          <motion.path d={AREA} fill="url(#speed-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.5 }} />
          <motion.path d={LINE} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: "easeInOut" }} />
          {MOCK_ERROR_SECONDS.map((second, index) => (
            <motion.circle key={second} cx={x(second)} cy={y(MOCK_HISTORY[second])} r={5} className="fill-destructive stroke-card" strokeWidth={2} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15, delay: 1 + index * 0.1 }} />
          ))}
          {scrub !== null && (
            <g>
              <line x1={x(scrub)} x2={x(scrub)} y1={PAD} y2={HEIGHT - PAD} className="stroke-muted-foreground" strokeDasharray="2 3" />
              <circle cx={x(scrub)} cy={y(MOCK_HISTORY[scrub])} r={5} className="fill-primary stroke-card" strokeWidth={2} />
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
              <b className="text-primary">{MOCK_HISTORY[scrub]} wpm</b> at {scrub + 1}s{MOCK_ERROR_SECONDS.includes(scrub) && <span className="text-destructive"> · mistake</span>}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="mt-1 flex justify-between px-1 text-[10px] text-muted-foreground"><span>1s</span><span>{MOCK_SUMMARY.durationSeconds}s</span></div>
      </div>

      <p className="text-sm text-muted-foreground">
        {MOCK_CHARACTERS.correct} letters right, {MOCK_CHARACTERS.incorrect} wrong, {MOCK_CHARACTERS.missed} missed, {MOCK_CHARACTERS.extra} extra
      </p>
      <ResultActions compact />
    </div>
  );
}
