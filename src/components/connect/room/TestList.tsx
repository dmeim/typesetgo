import { useId } from "react";
import { useReducedMotion } from "framer-motion";
import type { ConnectTest } from "@/lib/connect-types";
import { connectTestLabels } from "@/lib/connect-settings";
import { cn } from "@/lib/utils";
import { TestRow } from "@/components/connect/ConnectBadges";
import { participantTestDetail, testPhase } from "./test-labels";

interface TestListProps {
  tests: ConnectTest[];
  /** Index highlighted as current/next; earlier tests show as done. -1 marks every test upcoming. */
  currentIndex: number;
  animated?: boolean;
  className?: string;
}

/** The room's test list with done ticks, the current test highlighted, and upcoming entries. */
export function TestList({ tests, currentIndex, animated = false, className }: TestListProps) {
  const highlightId = useId();
  const reducedMotion = useReducedMotion();
  const labels = connectTestLabels(tests);
  const animate = animated && !reducedMotion;
  return (
    <ol className={cn("flex w-full flex-col gap-1 text-left", className)} aria-label="Tests in this room">
      {tests.map((test, index) => (
        <TestRow key={test.id} test={test} title={labels[index].title} detail={participantTestDetail(test)} position={index}
          phase={currentIndex < 0 ? "upcoming" : testPhase(index, currentIndex)} highlightId={highlightId} appearDelay={animate ? 0.1 + index * 0.05 : undefined} />
      ))}
    </ol>
  );
}
