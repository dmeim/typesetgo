import { useEffect, useRef } from "react";
import { ArrowFatRightIcon, ArrowsClockwiseIcon, CircleNotchIcon, CoffeeIcon, HourglassMediumIcon, PauseCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { resultsEndAt, resultsMs, type ConnectPacing, type ConnectTest } from "@/lib/connect-types";
import { useNow } from "@/hooks/useNow";
import { formatClock } from "@/components/connect/board/board-model";

const RETRY_MS = 2000;

interface RoomResultsActionsProps {
  pacing: ConnectPacing;
  tests: ConnectTest[];
  index: number;
  /** When results began: the room's end of the test (host) or this participant's finish (self-paced). */
  endedAt?: number;
  pausedAt?: number;
  paused: boolean;
  /** Title of the step after results, or undefined after the last test. */
  nextTitle?: string;
  /** Title of a break that plays during these results. */
  breakTitle?: string;
  /** Self-paced: the final result reached the server, so advancing is allowed. */
  resultDelivered: boolean;
  syncFailed: boolean;
  advancing: boolean;
  advanceError?: string;
  /** Self-paced: move on now (`manual`) or because the countdown ran out. */
  onAdvance: (manual: boolean) => void;
  onRetrySync: () => void;
}

/** Replaces solo Next/Repeat on the Connect results screen with the countdown to the next step. */
export function RoomResultsActions({
  pacing, tests, index, endedAt, pausedAt, paused, nextTitle, breakTitle,
  resultDelivered, syncFailed, advancing, advanceError, onAdvance, onRetrySync,
}: RoomResultsActionsProps) {
  const counting = endedAt !== undefined;
  const now = useNow(counting && !paused, 250);
  const endsAt = counting ? resultsEndAt(tests, index, endedAt, pausedAt, now) : now;
  const remaining = Math.max(0, endsAt - now);
  const total = resultsMs(tests, index);
  const selfPaced = pacing === "participant";
  const expired = counting && remaining === 0 && !paused;
  // A break must run its course; plain results can be skipped.
  const canSkip = selfPaced && !breakTitle && resultDelivered && !advancing;

  const advanceRef = useRef(onAdvance);
  useEffect(() => { advanceRef.current = onAdvance; }, [onAdvance]);

  useEffect(() => {
    if (!selfPaced || !expired) return;
    advanceRef.current(false);
    const timer = setInterval(() => advanceRef.current(false), RETRY_MS);
    return () => clearInterval(timer);
  }, [selfPaced, expired]);

  useEffect(() => {
    if (!canSkip) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.defaultPrevented || event.isComposing) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      // Focused controls handle Enter themselves (popovers, this button).
      if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement || event.target instanceof HTMLAnchorElement) return;
      event.preventDefault();
      advanceRef.current(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canSkip]);

  const syncNotice = syncFailed && (
    <div role="alert" className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
      Your result hasn't reached the host yet. Retrying…
      <Button variant="outline" size="sm" onClick={onRetrySync}>
        <ArrowsClockwiseIcon aria-hidden="true" />
        Retry sync
      </Button>
    </div>
  );

  const clock = formatClock(remaining);
  const nextText = nextTitle ? <>Next: <span className="font-medium text-foreground">{nextTitle}</span> in {clock}</> : <>Finishing in {clock}</>;
  let status;
  if (!counting) {
    status = (
      <p role="status" className="flex items-center gap-2 text-muted-foreground">
        {selfPaced
          ? <><CircleNotchIcon className="size-5 motion-safe:animate-spin" aria-hidden="true" />Sending your result…</>
          : <><HourglassMediumIcon className="size-5" weight="regular" aria-hidden="true" />Waiting for everyone to finish</>}
      </p>
    );
  } else {
    const Icon = paused ? PauseCircleIcon : breakTitle ? CoffeeIcon : HourglassMediumIcon;
    status = (
      <div className="flex w-full max-w-sm flex-col items-center gap-2">
        <p role="timer" className="flex flex-wrap items-center justify-center gap-x-2 text-center text-muted-foreground">
          <Icon className="size-5 shrink-0 text-primary" weight="regular" aria-hidden="true" />
          {paused ? <>Paused by the host · {clock}</> : breakTitle ? <><span className="font-medium text-foreground">{breakTitle}</span> · {nextText}</> : nextText}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/15" aria-hidden="true">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-linear motion-reduce:transition-none"
            style={{ width: `${Math.min(100, ((total - remaining) / total) * 100)}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {status}
      {selfPaced && !breakTitle && (
        <Button size="lg" onClick={() => onAdvance(true)} disabled={!canSkip}>
          {advancing ? <CircleNotchIcon className="motion-safe:animate-spin" aria-hidden="true" /> : <ArrowFatRightIcon aria-hidden="true" />}
          {nextTitle ? "Next test" : "Finish"}
        </Button>
      )}
      {advanceError && <p role="alert" className="text-sm text-destructive">{advanceError}</p>}
      {syncNotice}
      {canSkip && <p className="text-sm text-muted-foreground">Press Enter to continue.</p>}
    </div>
  );
}
