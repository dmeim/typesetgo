import { useId } from "react";
import { FitChart } from "./FitChart";
import { ActionBar, Chips, DetailSlot } from "./ResultsControls";
import { Score } from "./ResultsScore";
import { STATS, useDetail, type ResultsLayoutProps } from "./results-layouts";

/** 02: every number in one slim strip, the graph in the middle, the buttons in one row. */
export function ScoreboardResults({ save, replay }: ResultsLayoutProps) {
  const detail = useDetail();
  const scope = useId();
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid shrink-0 grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card @min-[44rem]:grid-cols-[auto_auto_minmax(0,1fr)]">
        <div className="p-4 pr-6"><Score kind="wpm" size="md" /></div>
        <div className="border-l border-border p-4 pr-6"><Score kind="accuracy" size="md" delay={0.3} /></div>
        <Chips
          detail={detail}
          scope={scope}
          variant="cell"
          className="col-span-2 grid grid-cols-2 gap-1 border-t border-border p-1.5 @min-[30rem]:grid-cols-4 @min-[44rem]:col-span-1 @min-[44rem]:border-t-0 @min-[44rem]:border-l"
        />
      </div>
      <DetailSlot detail={detail} scope={scope} className="min-h-[8rem] flex-1">
        <FitChart average={STATS.wpm.average} className="h-full rounded-2xl border border-border bg-card p-3" />
      </DetailSlot>
      <ActionBar save={save} replay={replay} />
    </div>
  );
}
