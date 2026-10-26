import { CheckIcon, CoffeeIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import type { ConnectTest } from "@/lib/connect-types";
import { connectTestLabels } from "@/lib/connect-settings";
import { cn } from "@/lib/utils";
import { participantTestDetail, testPhase } from "./test-labels";

interface TestListProps {
  tests: ConnectTest[];
  /** Index highlighted as current/next; earlier tests show as done. -1 marks every test upcoming. */
  currentIndex: number;
  animated?: boolean;
  className?: string;
}

/** The room's test list with done ✓, current highlighted, and upcoming entries. */
export function TestList({ tests, currentIndex, animated = false, className }: TestListProps) {
  const reducedMotion = useReducedMotion();
  const labels = connectTestLabels(tests);
  const animate = animated && !reducedMotion;
  return (
    <ol className={cn("flex w-full flex-col gap-1.5", className)} aria-label="Tests in this room">
      {tests.map((test, index) => {
        const phase = currentIndex < 0 ? "upcoming" : testPhase(index, currentIndex);
        return (
          <motion.li
            key={test.id}
            data-phase={phase}
            aria-current={phase === "current" ? "step" : undefined}
            initial={animate ? { opacity: 0, x: -12 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: animate ? 0.15 + index * 0.06 : 0, ease: "easeOut" }}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
              phase === "current" && "border-primary bg-accent text-accent-foreground",
              phase === "done" && "border-transparent bg-muted text-muted-foreground",
              phase === "upcoming" && "border-border bg-card text-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                phase === "current" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {phase === "done" ? <CheckIcon className="size-3.5" aria-label="Done" /> : index + 1}
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate font-medium">
              {test.mode === "break" && <CoffeeIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
              {labels[index].title}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{participantTestDetail(test)}</span>
          </motion.li>
        );
      })}
    </ol>
  );
}
