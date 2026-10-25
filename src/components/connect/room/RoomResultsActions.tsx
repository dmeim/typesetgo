import { useEffect, useRef } from "react";
import { ArrowFatRightIcon, ArrowsClockwiseIcon, CircleNotchIcon, HourglassMediumIcon } from "@phosphor-icons/react";
import type { ConnectPacing } from "@/lib/connect-types";
import { Button } from "@/components/ui/button";

interface RoomResultsActionsProps {
  pacing: ConnectPacing;
  isLastTest: boolean;
  /** Self-paced: the final result reached the server, so advancing is allowed. */
  resultDelivered: boolean;
  syncFailed: boolean;
  advancing: boolean;
  advanceError?: string;
  onAdvance: () => void;
  onRetrySync: () => void;
}

/** Replaces solo Next/Repeat on the Connect results screen. */
export function RoomResultsActions({ pacing, isLastTest, resultDelivered, syncFailed, advancing, advanceError, onAdvance, onRetrySync }: RoomResultsActionsProps) {
  const canAdvance = pacing === "participant" && resultDelivered && !advancing;
  const advanceRef = useRef(onAdvance);
  useEffect(() => { advanceRef.current = onAdvance; }, [onAdvance]);

  useEffect(() => {
    if (!canAdvance) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.defaultPrevented || event.isComposing) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      // Focused controls handle Enter themselves (popovers, this button).
      if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement || event.target instanceof HTMLAnchorElement) return;
      event.preventDefault();
      advanceRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canAdvance]);

  const syncNotice = syncFailed && (
    <div role="alert" className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
      Your result hasn't reached the host yet. Retrying…
      <Button variant="outline" size="sm" onClick={onRetrySync}>
        <ArrowsClockwiseIcon aria-hidden="true" />
        Retry sync
      </Button>
    </div>
  );

  if (pacing === "host") {
    return (
      <div className="flex flex-col items-center gap-3">
        <p role="status" className="flex items-center gap-2 text-muted-foreground">
          <HourglassMediumIcon className="size-5" weight="regular" aria-hidden="true" />
          {isLastTest ? "That was the last test" : "Waiting for the host to start the next test"}
        </p>
        {syncNotice}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Button size="lg" onClick={onAdvance} disabled={!canAdvance}>
        {advancing || !resultDelivered
          ? <CircleNotchIcon className="motion-safe:animate-spin" aria-hidden="true" />
          : <ArrowFatRightIcon aria-hidden="true" />}
        {isLastTest ? "Finish" : "Next test"}
      </Button>
      {!resultDelivered && !syncFailed && <p role="status" className="text-sm text-muted-foreground">Sending your result…</p>}
      {advanceError && <p role="alert" className="text-sm text-destructive">{advanceError}</p>}
      {syncNotice}
      {resultDelivered && !advancing && <p className="text-sm text-muted-foreground">Press Enter to continue.</p>}
    </div>
  );
}
