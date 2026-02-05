// src/components/race/RaceCourse.tsx
// Horizontal lane-based race track visualization
import { useMemo } from "react";
import { motion, LayoutGroup } from "framer-motion";
import type { LegacyTheme } from "@/types/theme";

interface Racer {
  sessionId: string;
  name: string;
  emoji: string;
  progress: number; // 0-100
  wpm: number;
  isFinished: boolean;
  position?: number;
  isCurrentUser?: boolean;
}

interface RaceCourseProps {
  racers: Racer[];
  theme: LegacyTheme;
  isRaceActive: boolean;
}

// Position ordinal suffixes
function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function RaceCourse({
  racers,
  theme,
  isRaceActive,
}: RaceCourseProps) {
  // Sort racers by progress (descending) for position labels
  const sortedRacers = useMemo(() => {
    return [...racers].sort((a, b) => {
      // Finished racers first, by position
      if (a.isFinished && !b.isFinished) return -1;
      if (!a.isFinished && b.isFinished) return 1;
      if (a.isFinished && b.isFinished) {
        return (a.position || 0) - (b.position || 0);
      }
      // Then by progress
      return b.progress - a.progress;
    });
  }, [racers]);

  // Assign current positions based on progress
  const racersWithPositions = useMemo(() => {
    return sortedRacers.map((racer, index) => ({
      ...racer,
      currentPosition: index + 1,
    }));
  }, [sortedRacers]);

  return (
    <div className="w-full h-full flex flex-col gap-2 py-4 px-4 overflow-y-auto">
      {/* Track header */}
      <div className="flex items-center justify-between px-4 mb-2">
        <div
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: theme.textSecondary }}
        >
          Start
        </div>
        <div
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: theme.textSecondary }}
        >
          Finish
        </div>
      </div>

      {/* Race lanes */}
      <LayoutGroup>
        <div className="flex-1 flex flex-col gap-3">
          {racersWithPositions.map((racer) => (
            <motion.div
              key={racer.sessionId}
              layout
              layoutId={racer.sessionId}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
              className="relative flex items-center gap-3 min-h-[60px]"
            >
            {/* Position label */}
            <div
              className="w-10 text-center font-bold text-sm shrink-0"
              style={{
                color: racer.currentPosition <= 3
                  ? [theme.statusWarning, theme.textSecondary, theme.statusError][racer.currentPosition - 1] || theme.textSecondary
                  : theme.textMuted,
              }}
            >
              {getOrdinal(racer.currentPosition)}
            </div>

            {/* Lane track */}
            <div
              className="flex-1 relative h-12 rounded-lg overflow-hidden"
              style={{
                backgroundColor: racer.isCurrentUser
                  ? theme.accentSubtle
                  : theme.elevatedColor,
                border: racer.isCurrentUser
                  ? `2px solid ${theme.accentColor}`
                  : `1px solid ${theme.borderSubtle}`,
              }}
            >
              {/* Progress bar */}
              <div
                className={`absolute inset-y-0 left-0 ${
                  racer.isCurrentUser ? "transition-none" : "transition-all duration-100 ease-out"
                }`}
                style={{
                  width: `${Math.min(100, racer.progress)}%`,
                  backgroundColor: racer.isFinished
                    ? theme.statusSuccessMuted
                    : racer.isCurrentUser
                    ? theme.accentMuted
                    : theme.borderSubtle,
                }}
              />

              {/* Start line */}
              <div
                className="absolute left-2 inset-y-0 w-0.5"
                style={{ backgroundColor: theme.borderDefault }}
              />

              {/* Finish line (checkered pattern simulation) */}
              <div
                className="absolute right-2 inset-y-0 w-1 flex flex-col"
                style={{ backgroundColor: theme.textPrimary }}
              >
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-1"
                    style={{
                      backgroundColor: i % 2 === 0 ? theme.textPrimary : theme.backgroundColor,
                    }}
                  />
                ))}
              </div>

              {/* Racer avatar - positioned based on progress */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center gap-2 z-10 ${
                  racer.isCurrentUser ? "transition-none" : "transition-all duration-100 ease-out"
                }`}
                style={{
                  // Progress 0: avatar center at start line (8px from left)
                  // Progress 100: avatar center at finish line (10px from right)
                  // Linear interpolation: left = 8px*(1-p) + (100%-10px)*p
                  // Simplified: left = calc(p% + (8 - 0.18*p)px)
                  left: `calc(${racer.progress}% + ${8 - 0.18 * racer.progress}px)`,
                }}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg ${
                    isRaceActive && !racer.isFinished ? "animate-bounce" : ""
                  }`}
                  style={{
                    backgroundColor: racer.isCurrentUser
                      ? theme.accentColor
                      : theme.surfaceColor,
                    border: `2px solid ${racer.isFinished ? theme.statusSuccess : theme.borderDefault}`,
                    animationDuration: "0.5s",
                  }}
                >
                  {racer.emoji}
                </div>
              </div>
            </div>

            {/* Racer info */}
            <div className="w-24 shrink-0 text-right">
              <p
                className="font-bold text-sm truncate"
                style={{
                  color: racer.isCurrentUser ? theme.accentColor : theme.textPrimary,
                }}
              >
                {racer.name}
              </p>
              <p
                className="text-xs"
                style={{ color: theme.textSecondary }}
              >
                {racer.wpm} WPM
              </p>
            </div>
          </motion.div>
          ))}
        </div>
      </LayoutGroup>

      {/* Legend */}
      {racers.length > 0 && (
        <div
          className="flex items-center justify-center gap-4 mt-2 text-xs"
          style={{ color: theme.textMuted }}
        >
          <span>Progress: {Math.round(racers.find(r => r.isCurrentUser)?.progress || 0)}%</span>
          <span>•</span>
          <span>{racers.filter(r => r.isFinished).length} / {racers.length} finished</span>
        </div>
      )}
    </div>
  );
}
