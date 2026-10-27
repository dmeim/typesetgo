import { useId, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { TimelineSample } from "@/lib/result-timeline";
import { cn } from "@/lib/utils";

const LEFT = 30;
const RIGHT = 40;
const TOP = 8;
const BOTTOM = 20;
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

interface ResultsChartProps {
  /** Per-second speed and accuracy; needs at least two samples. */
  samples: TimelineSample[];
  /** A dashed reference speed, such as your recent average or the ghost. */
  guide?: { wpm: number; label: string };
  /** Hides the legend row when the numbers around the chart already say what each line is. */
  legend?: boolean;
  className?: string;
}

/**
 * Speed (left axis) and accuracy (right axis) through the test, with mistakes marked on both lines.
 * Drawn at whatever size its box is, so it can fill leftover height instead of setting it.
 */
export function ResultsChart({ samples, guide, legend = true, className }: ResultsChartProps) {
  const gradientId = useId();
  const reducedMotion = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 640, height: 200 });
  const [scrub, setScrub] = useState<number | null>(null);

  useLayoutEffect(() => {
    const node = box.current;
    if (!node) return;
    const apply = (width: number, height: number) => {
      if (width <= 0 || height <= 0) return;
      setSize({ width: Math.max(160, width), height: Math.max(60, height) });
    };
    const rect = node.getBoundingClientRect();
    apply(rect.width, rect.height);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) apply(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { width, height } = size;
  const chart = useMemo(() => {
    const first = samples[0].second;
    const last = samples[samples.length - 1].second;
    const maxWpm = Math.max(40, Math.ceil(Math.max(guide?.wpm ?? 0, ...samples.map((sample) => sample.wpm)) / 20) * 20);
    const lowestAccuracy = Math.min(...samples.map((sample) => sample.accuracy));
    const scale = ACCURACY_SCALES.find((candidate) => candidate.floor <= lowestAccuracy) ?? ACCURACY_SCALES[ACCURACY_SCALES.length - 1];
    const x = (second: number) => LEFT + ((second - first) / Math.max(last - first, 1)) * (width - LEFT - RIGHT);
    const yWpm = (wpm: number) => height - BOTTOM - (wpm / maxWpm) * (height - TOP - BOTTOM);
    const yAcc = (accuracy: number) => height - BOTTOM - ((Math.max(accuracy, scale.floor) - scale.floor) / (100 - scale.floor)) * (height - TOP - BOTTOM);
    const wpmLine = linePath(samples.map((sample) => [x(sample.second), yWpm(sample.wpm)]));
    // Fewer gridlines when the graph is squat, so labels never collide.
    const squat = height < 140;
    const steps = squat ? 2 : 4;
    return {
      x, yWpm, yAcc, first, last,
      wpmTicks: Array.from({ length: steps + 1 }, (_, index) => (maxWpm / steps) * index),
      accTicks: squat ? [scale.floor, 100] : Array.from({ length: (100 - scale.floor) / scale.step + 1 }, (_, index) => scale.floor + index * scale.step),
      wpmLine,
      accLine: linePath(samples.map((sample) => [x(sample.second), yAcc(sample.accuracy)])),
      wpmArea: `${wpmLine} L${x(last)},${height - BOTTOM} L${x(first)},${height - BOTTOM} Z`,
    };
  }, [samples, guide?.wpm, width, height]);

  const mistakes = samples.filter((sample) => sample.mistake);
  const active = scrub === null ? null : samples[scrub] ?? null;

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const pointer = event.clientX - event.currentTarget.getBoundingClientRect().left;
    let nearest = 0;
    for (let index = 1; index < samples.length; index++) {
      if (Math.abs(chart.x(samples[index].second) - pointer) < Math.abs(chart.x(samples[nearest].second) - pointer)) nearest = index;
    }
    setScrub(nearest);
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {legend && (
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 px-1 text-xs" aria-hidden="true">
          <span className="flex items-center gap-2 text-primary"><span className="h-0.5 w-4 rounded bg-primary" />wpm</span>
          {mistakes.length > 0 && <span className="flex items-center gap-2 text-destructive"><span className="size-2 rounded-full bg-destructive" />mistake</span>}
          <span className="flex items-center gap-2 text-(--accent-emphasis)">accuracy<span className="h-0 w-4 border-t-2 border-dashed border-(--accent-emphasis)" /></span>
        </div>
      )}
      <div ref={box} className="relative min-h-[3.5rem] flex-1">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="absolute inset-0 touch-none select-none"
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
              <line x1={LEFT} x2={width - RIGHT} y1={chart.yWpm(tick)} y2={chart.yWpm(tick)} className="stroke-border" strokeDasharray="3 5" />
              <text x={LEFT - 6} y={chart.yWpm(tick) + 4} textAnchor="end" className="fill-primary text-[11px]">{Math.round(tick)}</text>
            </g>
          ))}
          {chart.accTicks.map((tick) => (
            <text key={tick} x={width - RIGHT + 6} y={chart.yAcc(tick) + 4} className="fill-(--accent-emphasis) text-[11px]">{tick}%</text>
          ))}
          <text x={LEFT} y={height - 4} className="fill-muted-foreground text-[10px]">{formatSecond(chart.first)}</text>
          <text x={width - RIGHT} y={height - 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{formatSecond(chart.last)}</text>

          {guide && (
            <g>
              <line x1={LEFT} x2={width - RIGHT} y1={chart.yWpm(guide.wpm)} y2={chart.yWpm(guide.wpm)} className="stroke-muted-foreground/70" strokeDasharray="8 6" />
              <text x={width - RIGHT - 4} y={chart.yWpm(guide.wpm) - 5} textAnchor="end" className="fill-muted-foreground text-[11px]">{guide.label}</text>
            </g>
          )}

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
              <line x1={chart.x(active.second)} x2={chart.x(active.second)} y1={TOP} y2={height - BOTTOM} className="stroke-muted-foreground" strokeDasharray="2 3" />
              <circle cx={chart.x(active.second)} cy={chart.yWpm(active.wpm)} r={5} className="fill-primary stroke-card" strokeWidth={2} />
              <circle cx={chart.x(active.second)} cy={chart.yAcc(active.accuracy)} r={4} className="fill-(--accent-emphasis) stroke-card" strokeWidth={2} />
            </g>
          )}
        </svg>
        <AnimatePresence>
          {active && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0, left: `${Math.min(82, Math.max(18, (chart.x(active.second) / width) * 100))}%` }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 600, damping: 40 }}
              className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs shadow"
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
      </div>
    </div>
  );
}
