// src/components/race/Podium.tsx
// Podium display for race results
import type { LegacyTheme } from "@/types/theme";
import { Trophy, Medal, Award } from "lucide-react";

interface RaceRanking {
  sessionId: string;
  name: string;
  emoji?: string;
  position: number;
  wpm: number;
  accuracy: number;
  finishTime?: number;
  didFinish: boolean;
}

interface PodiumProps {
  rankings: RaceRanking[];
  currentSessionId: string;
  theme: LegacyTheme;
  showTable?: boolean;
  showPodium?: boolean;
}

// Format milliseconds to readable time
function formatTime(ms: number | undefined): string {
  if (!ms) return "--:--";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function Podium({
  rankings,
  currentSessionId,
  theme,
  showTable = true,
  showPodium = true,
}: PodiumProps) {
  // Get top 3 for podium display
  const top3 = rankings.slice(0, 3);

  // Podium positions are displayed: 2nd | 1st | 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  const getPodiumStyles = (position: number) => {
    switch (position) {
      case 1:
        return {
          height: "160px",
          color: theme.statusWarning,
          bgColor: theme.statusWarningMuted,
          icon: Trophy,
          label: "1st",
        };
      case 2:
        return {
          height: "120px",
          color: theme.textSecondary,
          bgColor: theme.surfaceColor,
          icon: Medal,
          label: "2nd",
        };
      case 3:
        return {
          height: "80px",
          color: "#cd7f32", // Bronze color
          bgColor: "rgba(205, 127, 50, 0.2)",
          icon: Award,
          label: "3rd",
        };
      default:
        return {
          height: "60px",
          color: theme.textMuted,
          bgColor: theme.elevatedColor,
          icon: Award,
          label: `${position}th`,
        };
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Podium visualization */}
      {showPodium && (
      <div className={`flex items-end justify-center gap-4 ${showTable ? "mb-8" : ""}`}>
        {podiumOrder.map((racer) => {
          if (!racer) return null;
          const styles = getPodiumStyles(racer.position);
          const Icon = styles.icon;
          const isCurrentUser = racer.sessionId === currentSessionId;

          return (
            <div
              key={racer.sessionId}
              className="flex flex-col items-center"
            >
              {/* Racer info */}
              <div
                className="mb-3 text-4xl"
                style={{
                  filter: isCurrentUser ? "drop-shadow(0 0 10px currentColor)" : "none",
                }}
              >
                {racer.emoji || "🏎️"}
              </div>
              <p
                className={`font-bold mb-1 ${racer.position === 1 ? "text-lg" : "text-sm"}`}
                style={{
                  color: isCurrentUser ? theme.accentColor : theme.textPrimary,
                }}
              >
                {racer.name}
              </p>
              <p
                className="text-sm font-medium mb-2"
                style={{ color: styles.color }}
              >
                {racer.wpm} WPM
              </p>

              {/* Podium stand */}
              <div
                className="w-28 rounded-t-lg flex flex-col items-center justify-center transition-all duration-500"
                style={{
                  height: styles.height,
                  backgroundColor: styles.bgColor,
                  border: `2px solid ${styles.color}`,
                  borderBottom: "none",
                }}
              >
                <Icon
                  size={racer.position === 1 ? 32 : 24}
                  style={{ color: styles.color }}
                  fill={racer.position === 1 ? styles.color : "none"}
                />
                <span
                  className="font-black text-xl mt-1"
                  style={{ color: styles.color }}
                >
                  {styles.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Full results table */}
      {showTable && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: theme.surfaceColor,
            border: `1px solid ${theme.borderDefault}`,
          }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: theme.elevatedColor }}>
                <th
                  className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider"
                  style={{ color: theme.textSecondary }}
                >
                  Rank
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider"
                  style={{ color: theme.textSecondary }}
                >
                  Racer
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider"
                  style={{ color: theme.textSecondary }}
                >
                  WPM
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider"
                  style={{ color: theme.textSecondary }}
                >
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((racer, index) => {
                const isCurrentUser = racer.sessionId === currentSessionId;
                return (
                  <tr
                    key={racer.sessionId}
                    style={{
                      backgroundColor: isCurrentUser
                        ? theme.accentSubtle
                        : index % 2 === 0
                        ? "transparent"
                        : theme.elevatedColor,
                    }}
                  >
                    <td className="px-4 py-3">
                      <span
                        className="font-bold"
                        style={{
                          color:
                            racer.position === 1
                              ? theme.statusWarning
                              : racer.position === 2
                              ? theme.textSecondary
                              : racer.position === 3
                              ? "#cd7f32"
                              : theme.textMuted,
                        }}
                      >
                        {racer.position}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{racer.emoji || "🏎️"}</span>
                        <span
                          className="font-medium"
                          style={{
                            color: isCurrentUser
                              ? theme.accentColor
                              : theme.textPrimary,
                          }}
                        >
                          {racer.name}
                          {isCurrentUser && (
                            <span
                              className="ml-2 text-xs"
                              style={{ color: theme.textSecondary }}
                            >
                              (you)
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono font-bold"
                      style={{ color: theme.textPrimary }}
                    >
                      {racer.wpm}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono"
                      style={{
                        color: racer.didFinish
                          ? theme.textPrimary
                          : theme.statusError,
                      }}
                    >
                      {racer.didFinish ? formatTime(racer.finishTime) : "DNF"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
