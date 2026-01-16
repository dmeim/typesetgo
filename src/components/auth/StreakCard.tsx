import type { Theme } from "@/lib/typing-constants";

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  theme: Theme;
}

export default function StreakCard({
  currentStreak,
  longestStreak,
  theme,
}: StreakCardProps) {
  return (
    <div
      className="p-4 rounded-xl flex flex-col items-center justify-center h-full"
      style={{ backgroundColor: `${theme.backgroundColor}80` }}
    >
      {/* Flame Icon */}
      <div
        className="text-4xl mb-2"
        style={{
          filter: currentStreak > 0 ? "none" : "grayscale(100%)",
          opacity: currentStreak > 0 ? 1 : 0.5,
        }}
      >
        🔥
      </div>

      {/* Current Streak Number */}
      <div
        className="text-4xl font-bold leading-none mb-1"
        style={{ color: currentStreak > 0 ? theme.buttonSelected : theme.defaultText }}
      >
        {currentStreak}
      </div>

      {/* Day Streak Label */}
      <div
        className="text-xs font-semibold uppercase tracking-wide mb-3"
        style={{ color: theme.defaultText }}
      >
        day streak
      </div>

      {/* Longest Streak */}
      <div
        className="text-xs text-center"
        style={{ color: theme.defaultText }}
      >
        <span className="opacity-70">Best:</span>{" "}
        <span className="font-medium" style={{ color: theme.correctText }}>
          {longestStreak}
        </span>
      </div>
    </div>
  );
}
