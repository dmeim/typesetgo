import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Theme } from "@/lib/typing-constants";

interface LeaderboardModalProps {
  theme: Theme;
  onClose: () => void;
}

type TimeRange = "all-time" | "week" | "today";

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

export default function LeaderboardModal({
  theme,
  onClose,
}: LeaderboardModalProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("all-time");

  const leaderboard = useQuery(api.testResults.getLeaderboard, { timeRange });
  const isLoading = leaderboard === undefined;

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: "all-time", label: "All-Time" },
    { value: "week", label: "This Week" },
    { value: "today", label: "Today" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg p-6 shadow-xl mx-4 max-h-[90vh] flex flex-col"
        style={{ backgroundColor: theme.surfaceColor }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: theme.buttonSelected }}
            >
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            <h2
              className="text-xl font-semibold"
              style={{ color: theme.correctText }}
            >
              Leaderboard
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition hover:bg-gray-700/50"
            style={{ color: theme.defaultText }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Time Range Tabs */}
        <div className="flex gap-2 mb-6">
          {timeRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition"
              style={{
                backgroundColor:
                  timeRange === option.value
                    ? theme.buttonSelected
                    : `${theme.backgroundColor}80`,
                color:
                  timeRange === option.value
                    ? theme.backgroundColor
                    : theme.correctText,
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div
              className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{
                borderColor: theme.buttonSelected,
                borderTopColor: "transparent",
              }}
            />
          </div>
        )}

        {/* Leaderboard Table */}
        {!isLoading && leaderboard && leaderboard.length > 0 && (
          <div
            className="flex-1 rounded-xl overflow-hidden flex flex-col min-h-0"
            style={{ backgroundColor: `${theme.backgroundColor}80` }}
          >
            {/* Table Header */}
            <div
              className="grid gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wide border-b"
              style={{
                color: theme.defaultText,
                borderColor: `${theme.defaultText}20`,
                gridTemplateColumns: "48px 1fr 80px 100px",
              }}
            >
              <div className="text-center">User</div>
              <div>Username</div>
              <div className="text-right">WPM</div>
              <div className="text-right">Date</div>
            </div>

            {/* Table Body - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              {leaderboard.map((entry) => (
                <div
                  key={`${entry.username}-${entry.rank}`}
                  className="grid gap-4 px-4 py-3 border-b last:border-b-0 items-center"
                  style={{
                    borderColor: `${theme.defaultText}10`,
                    gridTemplateColumns: "48px 1fr 80px 100px",
                  }}
                >
                  {/* Avatar */}
                  <div className="flex justify-center">
                    {entry.avatarUrl ? (
                      <img
                        src={entry.avatarUrl}
                        alt={entry.username}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium"
                        style={{
                          backgroundColor: theme.buttonSelected,
                          color: theme.backgroundColor,
                        }}
                      >
                        {entry.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Username */}
                  <div className="flex items-center gap-2">
                    {entry.rank <= 3 && (
                      <span
                        className="text-sm"
                        style={{
                          color:
                            entry.rank === 1
                              ? "#FFD700"
                              : entry.rank === 2
                                ? "#C0C0C0"
                                : "#CD7F32",
                        }}
                      >
                        {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                      </span>
                    )}
                    <span
                      className="font-medium truncate"
                      style={{ color: theme.correctText }}
                    >
                      {entry.username}
                    </span>
                  </div>

                  {/* WPM */}
                  <div
                    className="text-right font-bold"
                    style={{ color: theme.buttonSelected }}
                  >
                    {entry.wpm}
                  </div>

                  {/* Date */}
                  <div
                    className="text-right text-sm"
                    style={{ color: theme.defaultText }}
                  >
                    {formatDate(entry.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && leaderboard && leaderboard.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🏆</div>
            <p
              className="text-lg font-medium"
              style={{ color: theme.correctText }}
            >
              No scores yet
            </p>
            <p className="text-sm" style={{ color: theme.defaultText }}>
              {timeRange === "today"
                ? "No one has completed a test today yet. Be the first!"
                : timeRange === "week"
                  ? "No tests completed this week. Start typing to claim the top spot!"
                  : "Complete a typing test and save your results to appear on the leaderboard!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
