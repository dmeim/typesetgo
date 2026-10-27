// The real result chips, detail panel and buttons (`@/components/typing/results/`) fed with the fake test.
import type { ComponentProps } from "react";
import type { ChipId } from "@/components/typing/results/result-details";
import { ResultActions } from "@/components/typing/results/ResultActions";
import { ResultDetailBody, ResultDetailChips, ResultDetailSlot } from "@/components/typing/results/ResultDetails";
import { CHIPS, DETAILS, type ResultsLayoutProps } from "./results-layouts";

export function Chips(props: Omit<ComponentProps<typeof ResultDetailChips>, "chips">) {
  return <ResultDetailChips chips={CHIPS} {...props} />;
}

export function DetailBody({ id }: { id: ChipId }) {
  return <ResultDetailBody id={id} data={DETAILS} />;
}

export function DetailSlot(props: Omit<ComponentProps<typeof ResultDetailSlot>, "chips" | "data">) {
  return <ResultDetailSlot chips={CHIPS} data={DETAILS} {...props} />;
}

/** Saving only animates locally; Repeat and Next both replay the fake test. */
export function ActionBar({ save, replay, stacked = false, className }: ResultsLayoutProps & { stacked?: boolean; className?: string }) {
  return <ResultActions saveState={save.state} onSave={save.save} onRepeat={replay} onNext={replay} stacked={stacked} className={className} />;
}
