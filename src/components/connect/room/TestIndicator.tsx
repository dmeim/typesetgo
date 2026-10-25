import type { ConnectTest } from "@/lib/connect-types";
import { connectTestLabels } from "@/lib/connect-settings";
import { cn } from "@/lib/utils";
import { participantTestDetail, testPhase } from "./test-labels";

const SEGMENT_CLASS = { done: "bg-primary/45", current: "bg-primary", upcoming: "bg-foreground/15" } as const;

/** "Test 2 of 4 · 2nd timed test · Time · 5:00" with a done/current/upcoming strip. */
export function TestIndicator({ tests, currentIndex, className }: { tests: ConnectTest[]; currentIndex: number; className?: string }) {
  const test = tests[currentIndex];
  if (!test) return null;
  const label = connectTestLabels(tests)[currentIndex];
  return (
    <div className={cn("flex w-full max-w-md flex-col items-center gap-1.5", className)}>
      <p className="text-center text-xs text-muted-foreground sm:text-sm">
        <span className="font-medium text-foreground">Test {currentIndex + 1} of {tests.length}</span>
        {" · "}{label.title}{" · "}{participantTestDetail(test)}
      </p>
      {tests.length > 1 && (
        <div className="flex h-1.5 w-full gap-1" aria-hidden="true" data-testid="test-strip">
          {tests.map((item, index) => {
            const phase = testPhase(index, currentIndex);
            return <span key={item.id} data-phase={phase} className={cn("h-full flex-1 rounded-full", SEGMENT_CLASS[phase])} />;
          })}
        </div>
      )}
    </div>
  );
}
