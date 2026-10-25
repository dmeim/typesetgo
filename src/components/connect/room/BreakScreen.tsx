import { useEffect, useRef } from "react";
import { CoffeeIcon, PauseCircleIcon } from "@phosphor-icons/react";
import { breakEndsAt, type ConnectTest } from "@/lib/connect-types";
import { connectTestLabels } from "@/lib/connect-settings";
import { useNow } from "@/hooks/useNow";
import { formatClock } from "@/components/connect/board/board-model";
import { participantTestDetail } from "./test-labels";

const RETRY_MS = 2000;

/**
 * Countdown between tests. Host pacing moves on from the server; in participant pacing
 * `onExpire` asks to move on and is retried until the step changes (unmounting this screen).
 */
export function BreakScreen({ tests, index, startedAt, pausedAt, paused, onExpire }: {
  tests: ConnectTest[];
  index: number;
  startedAt: number | undefined;
  pausedAt: number | undefined;
  paused: boolean;
  onExpire?: () => void;
}) {
  const test = tests[index];
  const now = useNow(!paused, 250);
  const endsAt = test ? breakEndsAt(test, startedAt ?? now, pausedAt, now) : now;
  const remaining = Math.max(0, endsAt - now);
  const expired = remaining === 0;
  const total = (test?.duration ?? 1) * 1000;
  const expireRef = useRef(onExpire);
  useEffect(() => { expireRef.current = onExpire; }, [onExpire]);

  useEffect(() => {
    if (!expired || paused || !expireRef.current) return;
    expireRef.current();
    const timer = setInterval(() => expireRef.current?.(), RETRY_MS);
    return () => clearInterval(timer);
  }, [expired, paused]);

  const labels = connectTestLabels(tests);
  const nextIndex = tests.findIndex((item, position) => position > index && item.mode !== "break");
  const next = nextIndex >= 0 ? tests[nextIndex] : undefined;

  return (
    <section aria-labelledby="break-title" className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 py-10 text-center">
      {paused
        ? <PauseCircleIcon className="size-10 text-primary" weight="regular" aria-hidden="true" />
        : <CoffeeIcon className="size-10 text-primary" weight="regular" aria-hidden="true" />}
      <div className="space-y-1">
        <h2 id="break-title" className="text-2xl font-semibold">{paused ? "Paused by the host" : labels[index]?.title ?? "Break"}</h2>
        <p className="text-muted-foreground">{paused ? "The countdown continues when the host resumes." : expired ? "Starting…" : "Take a breather. The next test starts on its own."}</p>
      </div>
      <p className="font-mono text-6xl font-bold tabular-nums text-primary" role="timer" aria-label={`${formatClock(remaining)} left in the break`}>
        {formatClock(remaining)}
      </p>
      <div className="h-1.5 w-48 overflow-hidden rounded-full bg-foreground/15" aria-hidden="true">
        <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-linear motion-reduce:transition-none"
          style={{ width: `${Math.min(100, ((total - remaining) / total) * 100)}%` }} />
      </div>
      {next && (
        <p className="text-sm text-muted-foreground">
          Up next: <span className="font-medium text-foreground">{labels[nextIndex].title}</span> · {participantTestDetail(next)}
        </p>
      )}
    </section>
  );
}
