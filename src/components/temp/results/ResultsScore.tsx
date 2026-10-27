// The real result scores (`@/components/typing/results/ResultScore`) fed with the fake test.
import { CompareBars as RealCompareBars, DeltaPill as RealDeltaPill, Score as RealScore, StatCard as RealStatCard } from "@/components/typing/results/ResultScore";
import { STATS, type StatKind } from "./results-layouts";

type ScoreProps = Omit<Parameters<typeof RealScore>[0], "stat"> & { kind: StatKind };
type StatCardProps = Omit<Parameters<typeof RealStatCard>[0], "stat"> & { kind: StatKind };

export function DeltaPill({ kind }: { kind: StatKind }) {
  return <RealDeltaPill stat={STATS[kind]} />;
}

export function Score({ kind, ...props }: ScoreProps) {
  return <RealScore stat={STATS[kind]} {...props} />;
}

export function CompareBars({ kind, delay }: { kind: StatKind; delay?: number }) {
  return <RealCompareBars stat={STATS[kind]} delay={delay} />;
}

export function StatCard({ kind, ...props }: StatCardProps) {
  return <RealStatCard stat={STATS[kind]} {...props} />;
}
