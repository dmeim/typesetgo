import type { ReactNode } from "react";
import { ArrowClockwiseIcon, ArrowFatRightIcon, CheckCircleIcon, CircleNotchIcon, FloppyDiskIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { tv } from "@/lib/theme-vars";
import { cn } from "@/lib/utils";

export type ResultSaveState = "idle" | "saving" | "saved" | "error";

const SAVE_LABELS: Record<ResultSaveState, string> = {
  idle: "Save Results",
  saving: "Saving...",
  saved: "Saved",
  error: "Error - Try Again",
};

const BUTTON = "inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** A key printed on its button; decorative, since the button names its shortcut. */
function Kbd({ children }: { children: ReactNode }) {
  return <kbd aria-hidden="true" className="hidden rounded border border-current/30 px-1 font-mono text-[0.6rem] font-normal leading-4 opacity-60 @min-[30rem]:inline">{children}</kbd>;
}

interface ResultActionsProps {
  saveState: ResultSaveState;
  /** The result failed verification and can never be saved. */
  invalid?: boolean;
  /** Omitted where results are not saved by hand (Connect rooms). */
  onSave?: () => void;
  onRepeat?: () => void;
  onNext: () => void;
  /** Repeat and Next wait for saving to finish. */
  advanceBlocked?: boolean;
  /** Save across the top, then Repeat and Next side by side. */
  stacked?: boolean;
  className?: string;
}

/**
 * Save, Repeat and Next together, with their keys printed on them instead of a hint paragraph.
 * Handlers are called without the click event, since the practice callbacks take optional arguments.
 */
export function ResultActions({ saveState, invalid = false, onSave, onRepeat, onNext, advanceBlocked = false, stacked = false, className }: ResultActionsProps) {
  const failed = invalid || saveState === "error";
  const canSave = !invalid && (saveState === "idle" || saveState === "error");
  const SaveIcon = failed ? WarningCircleIcon : saveState === "saved" ? CheckCircleIcon : saveState === "saving" ? CircleNotchIcon : FloppyDiskIcon;
  const saveButton = onSave && (
    <button
      type="button"
      onClick={() => onSave()}
      disabled={!canSave}
      aria-keyshortcuts={canSave ? "Space" : undefined}
      className={cn(BUTTON, "px-4 hover:brightness-110 disabled:cursor-not-allowed disabled:hover:brightness-100", stacked && "w-full")}
      style={{
        backgroundColor: failed ? tv.ui.destructive : saveState === "saved" ? tv.ui.secondary : tv.ui.primary,
        color: failed ? tv.ui.destructiveForeground : saveState === "saved" ? tv.ui.secondaryForeground : tv.ui.primaryForeground,
      }}
    >
      <SaveIcon className={cn("size-[18px] shrink-0", saveState === "saving" && !invalid && "motion-safe:animate-spin")} aria-hidden="true" />
      {invalid ? "Invalid" : SAVE_LABELS[saveState]}
      {canSave && <Kbd>space</Kbd>}
    </button>
  );
  const repeat = onRepeat && (
    <button
      type="button"
      onClick={() => onRepeat()}
      disabled={advanceBlocked}
      aria-label="Repeat Test"
      className={cn(BUTTON, "border border-border bg-background text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50")}
    >
      <ArrowClockwiseIcon className="size-[18px] shrink-0" aria-hidden="true" />
      Repeat
    </button>
  );
  const next = (
    <button
      type="button"
      onClick={() => onNext()}
      disabled={advanceBlocked}
      aria-label="Next Test"
      aria-keyshortcuts={advanceBlocked ? undefined : "Enter"}
      className={cn(BUTTON, "bg-card text-foreground ring-1 ring-border hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50")}
    >
      <ArrowFatRightIcon className="size-[18px] shrink-0" aria-hidden="true" />
      {stacked ? "Next" : "Next test"}
      {!advanceBlocked && <Kbd>enter</Kbd>}
    </button>
  );

  if (stacked) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {saveButton}
        <div className={cn("grid gap-2", repeat ? "grid-cols-2" : "grid-cols-1")}>{repeat}{next}</div>
      </div>
    );
  }
  return <div className={cn("flex flex-wrap items-center justify-center gap-2", className)}>{repeat}{saveButton}{next}</div>;
}
