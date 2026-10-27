import { useId } from "react";
import { FitChart } from "./FitChart";
import { ActionBar, Chips, DetailSlot } from "./ResultsControls";
import { Score } from "./ResultsScore";
import { RESULT, useDetail, type ResultsLayoutProps } from "./results-layouts";

/** 04: a grid of tiles. Scores over the buttons on the left; the graph over four detail tiles on the right. */
export function BentoResults({ save, replay }: ResultsLayoutProps) {
  const detail = useDetail();
  const scope = useId();
  return (
    <div className="flex h-full flex-col gap-3 @min-[38rem]:grid @min-[38rem]:grid-cols-[minmax(12rem,15rem)_minmax(0,1fr)] @min-[38rem]:grid-rows-[minmax(min-content,1fr)_auto]">
      <div className="grid grid-cols-2 gap-3 @min-[38rem]:col-start-1 @min-[38rem]:row-start-1 @min-[38rem]:flex @min-[38rem]:flex-col">
        <div className="flex flex-col justify-center rounded-2xl border border-border bg-card p-4 @min-[38rem]:flex-1"><Score kind="wpm" /></div>
        <div className="flex flex-col justify-center rounded-2xl border border-border bg-card p-4 @min-[38rem]:flex-1"><Score kind="accuracy" delay={0.3} /></div>
      </div>
      <DetailSlot detail={detail} scope={scope} className="min-h-[8rem] flex-1 @min-[38rem]:col-start-2 @min-[38rem]:row-start-1">
        <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-3">
          <div className="mb-1 flex items-center justify-between px-1 text-xs">
            <span className="font-semibold">How it went</span>
            <span className="text-muted-foreground">{RESULT.testLabel}</span>
          </div>
          <FitChart className="flex-1" />
        </div>
      </DetailSlot>
      <Chips detail={detail} scope={scope} variant="tile" className="grid grid-cols-4 gap-3 @min-[38rem]:col-start-2 @min-[38rem]:row-start-2" />
      <ActionBar save={save} replay={replay} stacked className="@min-[38rem]:col-start-1 @min-[38rem]:row-start-2 @min-[38rem]:justify-end" />
    </div>
  );
}
