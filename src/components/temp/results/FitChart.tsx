// The real fit-to-box results graph (`@/components/typing/results/ResultsChart`) fed with the fake test.
import { ResultsChart } from "@/components/typing/results/ResultsChart";
import { RESULT } from "./results-layouts";

interface FitChartProps {
  /** Draws your recent average speed as a reference line. */
  average?: number;
  legend?: boolean;
  className?: string;
}

export function FitChart({ average, legend, className }: FitChartProps) {
  return (
    <ResultsChart
      samples={RESULT.timeline}
      guide={average === undefined ? undefined : { wpm: average, label: `your avg ${average}` }}
      legend={legend}
      className={className}
    />
  );
}
