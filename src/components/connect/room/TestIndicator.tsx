import type { ConnectTest } from "@/lib/connect-types";
import { connectTestLabels } from "@/lib/connect-settings";
import { cn } from "@/lib/utils";
import { participantTestDetail, testPhase } from "./test-labels";

const SEGMENT_CLASS = { done: "bg-success", current: "bg-primary", upcoming: "bg-foreground/10" } as const;

/** "Test 2 of 4" beside a done/current/upcoming strip, with "2nd timed test · Time · 5:00" below. */
export function TestIndicator({ tests, currentIndex, className }: { tests: ConnectTest[]; currentIndex: number; className?: string }) {
  const test = tests[currentIndex];
  if (!test) return null;
  const label = connectTestLabels(tests)[currentIndex];
  return (
    <div className={cn("flex w-full max-w-md flex-col gap-1.5", className)}>
      <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
        <span className="shrink-0 tabular-nums text-foreground">Test {currentIndex + 1} of {tests.length}</span>
        {tests.length > 1 && (
          <div className="flex h-2 min-w-0 flex-1 gap-1" aria-hidden="true" data-testid="test-strip">
            {tests.map((item, index) => {
              const phase = testPhase(index, currentIndex);
              return <span key={item.id} data-phase={phase} className={cn("h-full min-w-1 flex-1 rounded-full transition-colors", SEGMENT_CLASS[phase])} />;
            })}
          </div>
        )}
      </div>
      <p className="truncate text-xs text-muted-foreground">{label.title} · {participantTestDetail(test)}</p>
    </div>
  );
}
