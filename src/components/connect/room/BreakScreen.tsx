import { useEffect, useRef } from "react";
import { CoffeeIcon, PauseCircleIcon } from "@phosphor-icons/react";
import { breakEndsAt, type ConnectTest } from "@/lib/connect-types";
import { connectTestLabels } from "@/lib/connect-settings";
import { useNow } from "@/hooks/useNow";
import { formatClock } from "@/components/connect/board/board-model";
import { participantTestDetail } from "./test-labels";

const RETRY_MS = 2000;
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

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
  const left = Math.min(1, remaining / total);
  const clock = formatClock(remaining);

  return (
    <section aria-labelledby="break-title" className="mx-auto flex w-full max-w-md flex-col items-center gap-5 px-4 py-10 text-center">
      <div className="relative size-40">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="10" className="stroke-muted" />
          <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="10" strokeLinecap="round" className="stroke-primary transition-[stroke-dashoffset] duration-300 ease-linear motion-reduce:transition-none"
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - left)} />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center" role="timer" aria-label={`${clock} left in the break`}>
          {paused
            ? <PauseCircleIcon weight="fill" className="size-6 text-primary" aria-hidden="true" />
            : <CoffeeIcon weight="fill" className="size-6 text-primary" aria-hidden="true" />}
          <span className="text-3xl font-black tabular-nums">{clock}</span>
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <h2 id="break-title" className="text-2xl font-black">{paused ? "Paused by the host" : labels[index]?.title ?? "Break"}</h2>
        <p className="text-muted-foreground">{paused ? "The countdown continues when the host resumes." : expired ? "Starting…" : "Shake out your hands and wiggle those fingers."}</p>
      </div>
      {next && (
        <p className="rounded-full bg-muted px-4 py-1.5 text-sm">
          Up next: <strong>{labels[nextIndex].title}</strong> <span className="text-muted-foreground">· {participantTestDetail(next)}</span>
        </p>
      )}
    </section>
  );
}
