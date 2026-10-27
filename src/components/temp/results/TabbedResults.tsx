import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChartLineIcon } from "@phosphor-icons/react";
import type { ChipId } from "@/components/typing/results/result-details";
import { cn } from "@/lib/utils";
import { FitChart } from "./FitChart";
import { ActionBar, DetailBody } from "./ResultsControls";
import { StatCard } from "./ResultsScore";
import { CHIPS, STATS, type ResultsLayoutProps } from "./results-layouts";

const TABS = [{ id: "graph" as const, title: "Graph", value: "", tone: "text-primary", Icon: ChartLineIcon }, ...CHIPS];

/** 05: a score card with the buttons; the right side switches between the graph and the details instead of growing. */
export function TabbedResults({ save, replay }: ResultsLayoutProps) {
  const [tab, setTab] = useState<ChipId | "graph">("graph");
  const scope = useId();
  return (
    <div className="flex h-full flex-col gap-3 @min-[38rem]:grid @min-[38rem]:grid-cols-[minmax(13rem,16rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-4 @min-[38rem]:grid-cols-1 @min-[38rem]:gap-6">
          <StatCard kind="wpm" bare />
          <StatCard kind="accuracy" bare delay={0.3} />
        </div>
        <ActionBar save={save} replay={replay} stacked className="mt-auto" />
      </div>
      <div className="flex min-h-[12rem] flex-1 flex-col gap-2 rounded-3xl border border-border bg-card p-3">
        <div role="tablist" aria-label="Result details" className="flex flex-wrap gap-1">
          {TABS.map(({ id, title, value, tone, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls={`${scope}-panel`}
              onClick={() => setTab(id)}
              className="relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-selected:text-foreground"
            >
              {tab === id && <motion.span layoutId={`${scope}-tab`} transition={{ type: "spring", stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-full bg-accent" />}
              <Icon className={cn("relative size-4 shrink-0", tone)} aria-hidden="true" />
              {value && id !== "characters" && <span className={cn("relative font-semibold tabular-nums", tone)}>{value}</span>}
              <span className="relative">{title}</span>
            </button>
          ))}
        </div>
        <div id={`${scope}-panel`} role="tabpanel" className="flex min-h-0 flex-1 flex-col">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="flex min-h-0 flex-1 flex-col p-1">
              {tab === "graph" ? <FitChart average={STATS.wpm.average} className="flex-1" /> : <DetailBody id={tab} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
