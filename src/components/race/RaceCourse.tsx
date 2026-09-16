import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { tv } from "@/lib/theme-vars";

interface Racer {
  sessionId: string;
  name: string;
  emoji: string;
  progress: number;
  wpm: number;
  isFinished: boolean;
  position?: number;
  isCurrentUser?: boolean;
}

export default function RaceCourse({
  racers,
  isRaceActive,
}: {
  racers: Racer[];
  isRaceActive: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const sortedRacers = useMemo(
    () =>
      [...racers].sort((a, b) => {
        if (a.isFinished !== b.isFinished) return a.isFinished ? -1 : 1;
        return a.isFinished
          ? (a.position ?? Infinity) - (b.position ?? Infinity)
          : b.progress - a.progress;
      }),
    [racers],
  );

  return (
    <div
      className="w-full max-w-6xl mx-auto p-4 sm:p-6"
      aria-label={isRaceActive ? "Live race positions" : "Race positions"}
    >
      <div className="space-y-4">
        {sortedRacers.map((racer, index) => {
          const progress = Math.max(0, Math.min(100, racer.progress));
          return (
            <motion.div
              key={racer.sessionId}
              layout={reducedMotion ? false : "position"}
              transition={{ duration: reducedMotion ? 0 : 0.15 }}
              className="min-w-0"
            >
              <div className="flex items-baseline justify-between gap-3 mb-2 text-sm">
                <p
                  className="min-w-0 [overflow-wrap:anywhere] font-semibold"
                  style={{
                    color: racer.isCurrentUser
                      ? tv.ui.primary
                      : tv.ui.foreground,
                  }}
                >
                  <span
                    className="mr-2"
                    style={{ color: tv.ui.mutedForeground }}
                  >
                    #{index + 1}
                  </span>
                  {racer.name}
                  {racer.isCurrentUser && (
                    <span className="font-normal"> (you)</span>
                  )}
                </p>
                <span
                  className="shrink-0 tabular-nums"
                  style={{ color: tv.ui.mutedForeground }}
                >
                  {racer.wpm} WPM{racer.isFinished ? " · Finished" : ""}
                </span>
              </div>
              <div
                data-race-track
                className="relative h-14 rounded-lg border"
                style={{
                  borderColor: racer.isCurrentUser
                    ? tv.ui.primary
                    : tv.ui.border,
                  backgroundColor: tv.ui.secondary,
                }}
              >
                <div
                  className="absolute inset-0 overflow-hidden rounded-[inherit]"
                  aria-hidden="true"
                >
                  <div
                    className="h-full motion-safe:transition-[width] motion-safe:duration-150"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: racer.isFinished
                        ? tv.status.success.muted
                        : tv.interactive.accent.subtle,
                    }}
                  />
                </div>
                <div
                  className="absolute inset-y-2 left-6 border-l"
                  style={{ borderColor: tv.ui.border }}
                  aria-hidden="true"
                />
                <div
                  className="absolute inset-y-2 right-6 border-l-2 border-dashed"
                  style={{ borderColor: tv.ui.mutedForeground }}
                  aria-hidden="true"
                />
                <div
                  className="absolute inset-y-0 left-6 right-6"
                  aria-hidden="true"
                >
                  <div
                    data-race-avatar
                    className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 size-10 rounded-full flex items-center justify-center text-xl border-2 ${racer.isCurrentUser ? "" : "motion-safe:transition-[left] motion-safe:duration-150"}`}
                    style={{
                      left: `${progress}%`,
                      backgroundColor: tv.ui.card,
                      borderColor: racer.isFinished
                        ? tv.status.success.DEFAULT
                        : racer.isCurrentUser
                          ? tv.ui.primary
                          : tv.ui.border,
                    }}
                  >
                    {racer.emoji}
                  </div>
                </div>
                <span className="sr-only">
                  {Math.round(progress)} percent complete
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
      {racers.length === 0 && (
        <p
          className="text-center py-8"
          style={{ color: tv.ui.mutedForeground }}
        >
          No connected racers.
        </p>
      )}
    </div>
  );
}
