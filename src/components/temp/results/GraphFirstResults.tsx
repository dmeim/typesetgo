import { useId } from "react";
import { FitChart } from "./FitChart";
import { ActionBar, Chips, DetailSlot } from "./ResultsControls";
import { Score } from "./ResultsScore";
import { RESULT, STATS, useDetail, type ResultsLayoutProps } from "./results-layouts";

/** 03: one big graph card; speed and accuracy sit in its corners, over the axes they share a colour with. */
export function GraphFirstResults({ save, replay }: ResultsLayoutProps) {
  const detail = useDetail();
  const scope = useId();
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-3xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <Score kind="wpm" />
          <span className="mt-1 hidden rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground @min-[40rem]:inline">{RESULT.testLabel}</span>
          <Score kind="accuracy" mirrored delay={0.3} />
        </div>
        <DetailSlot detail={detail} scope={scope} className="min-h-[7rem] flex-1">
          <FitChart average={STATS.wpm.average} legend={false} className="h-full" />
        </DetailSlot>
        <Chips detail={detail} scope={scope} className="border-t border-border pt-3" />
      </div>
      <ActionBar save={save} replay={replay} />
    </div>
  );
}
