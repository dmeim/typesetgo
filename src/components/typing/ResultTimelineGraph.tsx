import { useId, useMemo, useState, type PointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { TimelineSample } from "@/lib/result-timeline";

const WIDTH = 640;
const HEIGHT = 200;
const LEFT = 34;
const RIGHT = 40;
const TOP = 26;
const BOTTOM = 16;
// The accuracy scale starts at the first floor below the lowest reading.
const ACCURACY_SCALES = [
  { floor: 85, step: 5 },
  { floor: 70, step: 10 },
  { floor: 50, step: 25 },
  { floor: 0, step: 25 },
];

function formatSecond(second: number) {
  const whole = Math.round(second);
  return whole < 60 ? `${whole}s` : `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function linePath(points: [number, number][]) {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x},${y}`).join(" ");
}

function describeTimeline(samples: TimelineSample[]) {
  const speeds = samples.map((sample) => sample.wpm);
  const mistakes = samples.filter((sample) => sample.mistake).map((sample) => formatSecond(sample.second));
  const last = samples[samples.length - 1];
  return `Speed and accuracy over ${formatSecond(last.second)}. Speed ranged from ${Math.min(...speeds)} to ${Math.max(...speeds)} words per minute; accuracy ended at ${last.accuracy}%. `
    + (mistakes.length > 0 ? `Mistakes at ${mistakes.join(", ")}.` : "No mistakes.");
}

/** Speed (left axis) and accuracy (right axis) through the test, with mistakes marked on both lines. */
export function ResultTimelineGraph({ samples }: { samples: TimelineSample[] }) {
  const gradientId = useId();
  const reducedMotion = useReducedMotion();
  const [scrub, setScrub] = useState<number | null>(null);

  const chart = useMemo(() => {
    const first = samples[0].second;
    const last = samples[samples.length - 1].second;
    const maxWpm = Math.max(40, Math.ceil(Math.max(...samples.map((sample) => sample.wpm)) / 20) * 20);
    const lowestAccuracy = Math.min(...samples.map((sample) => sample.accuracy));
    const scale = ACCURACY_SCALES.find((candidate) => candidate.floor <= lowestAccuracy) ?? ACCURACY_SCALES[ACCURACY_SCALES.length - 1];
    const x = (second: number) => LEFT + ((second - first) / Math.max(last - first, 1)) * (WIDTH - LEFT - RIGHT);
    const yWpm = (wpm: number) => HEIGHT - BOTTOM - (wpm / maxWpm) * (HEIGHT - TOP - BOTTOM);
    const yAcc = (accuracy: number) => HEIGHT - BOTTOM - ((accuracy - scale.floor) / (100 - scale.floor)) * (HEIGHT - TOP - BOTTOM);
    const wpmLine = linePath(samples.map((sample) => [x(sample.second), yWpm(sample.wpm)]));
    return {
      x, yWpm, yAcc, first, last,
      wpmTicks: [0, 1, 2, 3, 4].map((step) => (maxWpm / 4) * step),
      accTicks: Array.from({ length: (100 - scale.floor) / scale.step + 1 }, (_, index) => scale.floor + index * scale.step),
      wpmLine,
      accLine: linePath(samples.map((sample) => [x(sample.second), yAcc(sample.accuracy)])),
      wpmArea: `${wpmLine} L${x(last)},${HEIGHT - BOTTOM} L${x(first)},${HEIGHT - BOTTOM} Z`,
    };
  }, [samples]);

  const mistakes = samples.filter((sample) => sample.mistake);
  const active = scrub === null ? null : samples[scrub];

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - box.left) / box.width) * WIDTH;
    let nearest = 0;
    for (let index = 1; index < samples.length; index++) {
      if (Math.abs(chart.x(samples[index].second) - svgX) < Math.abs(chart.x(samples[nearest].second) - svgX)) nearest = index;
    }
    setScrub(nearest);
  };

  return (
    <div className="relative w-full rounded-2xl border border-border bg-card p-3">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 px-1 text-xs" aria-hidden="true">
        <span className="flex items-center gap-2 text-primary"><span className="h-0.5 w-4 rounded bg-primary" />wpm</span>
        {mistakes.length > 0 && <span className="flex items-center gap-2 text-destructive"><span className="size-2 rounded-full bg-destructive" />mistake</span>}
        <span className="flex items-center gap-2 text-(--accent-emphasis)">accuracy<span className="h-0 w-4 border-t-2 border-dashed border-(--accent-emphasis)" /></span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none select-none"
        onPointerMove={onMove}
        onPointerLeave={() => setScrub(null)}
        role="img"
        aria-label={describeTimeline(samples)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {chart.wpmTicks.map((tick) => (
          <g key={tick}>
            <line x1={LEFT} x2={WIDTH - RIGHT} y1={chart.yWpm(tick)} y2={chart.yWpm(tick)} className="stroke-border" strokeDasharray="3 5" />
            <text x={LEFT - 6} y={chart.yWpm(tick) + 3} textAnchor="end" className="fill-primary text-[10px]">{tick}</text>
          </g>
        ))}
        {chart.accTicks.map((tick) => (
          <text key={tick} x={WIDTH - RIGHT + 6} y={chart.yAcc(tick) + 3} className="fill-(--accent-emphasis) text-[10px]">{tick}%</text>
        ))}
        <text x={LEFT - 6} y={TOP - 12} textAnchor="end" className="fill-muted-foreground text-[9px]">wpm</text>
        <text x={WIDTH - RIGHT + 6} y={TOP - 12} className="fill-muted-foreground text-[9px]">acc</text>

        <motion.path d={chart.wpmArea} fill={`url(#${gradientId})`} initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.5 }} />
        <motion.path d={chart.wpmLine} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" initial={reducedMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: "easeInOut" }} />
        <motion.path d={chart.accLine} fill="none" className="stroke-(--accent-emphasis)" strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} />

        {mistakes.map((sample, index) => (
          <motion.g key={sample.second} initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 + Math.min(index, 10) * 0.08 }}>
            <line x1={chart.x(sample.second)} x2={chart.x(sample.second)} y1={chart.yWpm(sample.wpm)} y2={chart.yAcc(sample.accuracy)} className="stroke-destructive/50" strokeDasharray="2 3" />
            <circle cx={chart.x(sample.second)} cy={chart.yWpm(sample.wpm)} r={5} className="fill-destructive stroke-card" strokeWidth={2} />
            <circle cx={chart.x(sample.second)} cy={chart.yAcc(sample.accuracy)} r={3.5} className="fill-destructive stroke-card" strokeWidth={1.5} />
          </motion.g>
        ))}

        {active && (
          <g>
            <line x1={chart.x(active.second)} x2={chart.x(active.second)} y1={TOP} y2={HEIGHT - BOTTOM} className="stroke-muted-foreground" strokeDasharray="2 3" />
            <circle cx={chart.x(active.second)} cy={chart.yWpm(active.wpm)} r={5} className="fill-primary stroke-card" strokeWidth={2} />
            <circle cx={chart.x(active.second)} cy={chart.yAcc(active.accuracy)} r={4} className="fill-(--accent-emphasis) stroke-card" strokeWidth={2} />
          </g>
        )}
      </svg>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, left: `${Math.min(82, Math.max(18, (chart.x(active.second) / WIDTH) * 100))}%` }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 600, damping: 40 }}
            className="pointer-events-none absolute top-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs shadow"
            aria-hidden="true"
          >
            <span className="text-muted-foreground">{formatSecond(active.second)} · </span>
            <b className="text-primary">{active.wpm} wpm</b>
            <span className="text-muted-foreground"> · </span>
            <b className="text-(--accent-emphasis)">{active.accuracy}%</b>
            {active.mistake && <span className="text-destructive"> · mistake</span>}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground" aria-hidden="true" style={{ paddingLeft: `${(LEFT / WIDTH) * 100}%`, paddingRight: `${(RIGHT / WIDTH) * 100}%` }}>
        <span>{formatSecond(chart.first)}</span><span>{formatSecond(chart.last)}</span>
      </div>
    </div>
  );
}
