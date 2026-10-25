import { cn } from "@/lib/utils";
import type { SegmentState } from "@/components/connect/board/board-model";

const SEGMENT_CLASS: Record<SegmentState, string> = {
  done: "bg-primary/70",
  current: "bg-primary ring-1 ring-primary ring-offset-1 ring-offset-card",
  // `bg-muted` can match the card surface in some themes, which hides upcoming tests.
  upcoming: "bg-foreground/15",
};

/** Segmented strip of the room's test list: done / current / upcoming. */
export function TestStrip({ segments, labels, className }: { segments: SegmentState[]; labels?: string[]; className?: string }) {
  if (segments.length < 2) return null;
  const done = segments.filter((segment) => segment === "done").length;
  return (
    <ol
      className={cn("flex w-full gap-[0.2em]", className)}
      aria-label={`${done} of ${segments.length} tests done`}
    >
      {segments.map((segment, index) => (
        <li
          key={index}
          data-segment={segment}
          title={labels?.[index] ? `Test ${index + 1}: ${labels[index]}` : `Test ${index + 1}`}
          className={cn("h-[0.35em] min-w-[0.25em] flex-1 rounded-full transition-colors", SEGMENT_CLASS[segment])}
        >
          <span className="sr-only">{`Test ${index + 1} ${segment}`}</span>
        </li>
      ))}
    </ol>
  );
}
