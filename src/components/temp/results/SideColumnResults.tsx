import { useId } from "react";
import { FitChart } from "./FitChart";
import { ActionBar, Chips, DetailSlot } from "./ResultsControls";
import { CompareBars, Score } from "./ResultsScore";
import { useDetail, type ResultsLayoutProps } from "./results-layouts";

/** 01: one score card and the buttons in a left column; the graph and chips fill the right. */
export function SideColumnResults({ save, replay }: ResultsLayoutProps) {
  const detail = useDetail();
  const scope = useId();
  return (
    // Narrow screens drop the two columns (display: contents) and stack everything, buttons last.
    <div className="flex h-full flex-col gap-3 @min-[38rem]:grid @min-[38rem]:grid-cols-[minmax(13rem,16rem)_minmax(0,1fr)]">
      <div className="contents @min-[38rem]:flex @min-[38rem]:min-h-0 @min-[38rem]:flex-col @min-[38rem]:gap-3">
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card p-4 @min-[38rem]:flex @min-[38rem]:flex-1 @min-[38rem]:flex-col @min-[38rem]:justify-around">
          <div className="flex flex-col gap-3">
            <Score kind="wpm" context={false} />
            <CompareBars kind="wpm" />
          </div>
          <div className="flex flex-col gap-3 @min-[38rem]:border-t @min-[38rem]:border-border @min-[38rem]:pt-4">
            <Score kind="accuracy" context={false} delay={0.3} />
            <CompareBars kind="accuracy" delay={0.4} />
          </div>
        </div>
        <ActionBar save={save} replay={replay} stacked className="order-last @min-[38rem]:order-none" />
      </div>
      <div className="contents @min-[38rem]:flex @min-[38rem]:min-h-0 @min-[38rem]:flex-col @min-[38rem]:gap-3">
        <DetailSlot detail={detail} scope={scope} swap className="min-h-[8rem] flex-1">
          <FitChart className="h-full rounded-2xl border border-border bg-card p-3" />
        </DetailSlot>
        <Chips detail={detail} scope={scope} swap />
      </div>
    </div>
  );
}
