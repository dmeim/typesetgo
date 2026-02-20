import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useTheme } from "@/hooks/useTheme";
import type { LegacyTheme } from "@/types/theme";
import { motion } from "framer-motion";

// Local type alias for components
type Theme = LegacyTheme;

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatarUrl: string | null;
  wpm: number;
  createdAt: number;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function getMedalEmoji(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}

const TIMEZONE = "America/New_York";

// Get today's date formatted as "Tuesday, Jan 12" in ET
function getTodayTitleET(): string {
  return new Date().toLocaleDateString("en-US", {
    timeZone: TIMEZONE,
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

// Get the 7-day range title formatted as "Jan 15 - Jan 22" in ET
function getWeekRangeTitleET(): string {
  const now = new Date();

  // Get today's date in ET
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find((p) => p.type === "year")!.value);
  const month = parseInt(parts.find((p) => p.type === "month")!.value) - 1;
  const day = parseInt(parts.find((p) => p.type === "day")!.value);

  // Create dates for today and 7 days ago
  const endDate = new Date(year, month, day);
  const startDate = new Date(year, month, day - 7);

  const formatDateShort = (d: Date) => {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;
}

interface PodiumCardProps {
  entry: LeaderboardEntry;
  theme: Theme;
  height: number;
}

function getUsernameFontSize(username: string): string {
  const len = username.length;
  if (len <= 8) return "11px";
  if (len <= 12) return "10px";
  if (len <= 16) return "9px";
  if (len <= 20) return "8px";
  return "7px";
}

function PodiumCard({ entry, theme, height }: PodiumCardProps) {
  // Stagger delay: 3rd -> 2nd -> 1st (award ceremony style)
  const revealOrder = entry.rank === 3 ? 0 : entry.rank === 2 ? 1 : 2;
  const delay = revealOrder * 0.3;

  return (
    <motion.div
      className="w-36 min-w-0 flex flex-col items-center rounded-t-xl pt-4 pb-3 px-2"
      style={{
        backgroundColor: `${theme.backgroundColor}90`,
        border: `1px solid ${theme.borderSubtle}`,
        borderBottom: "none",
        overflow: "hidden",
      }}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: `${height}px`, opacity: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {/* Row 1: Avatar + Medal */}
      <div className="flex items-center gap-1.5 mb-2">
        {entry.avatarUrl ? (
          <img
            src={entry.avatarUrl}
            alt={entry.username}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center text-base font-medium"
            style={{
              backgroundColor: theme.buttonSelected,
              color: theme.backgroundColor,
            }}
          >
            {entry.username.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-3xl">{getMedalEmoji(entry.rank)}</span>
      </div>

      {/* Row 2: Username */}
      <div
        className="font-medium w-full text-center mb-1.5 break-words leading-tight"
        style={{ 
          color: theme.textPrimary,
          fontSize: getUsernameFontSize(entry.username),
        }}
      >
        {entry.username}
      </div>

      {/* Row 3: WPM Stat */}
      <div
        className="text-xl font-bold mb-1"
        style={{ color: theme.buttonSelected }}
      >
        {entry.wpm} <span className="text-xs font-normal">WPM</span>
      </div>

      {/* Row 4: Date */}
      <div
        className="text-xs"
        style={{ color: theme.textSecondary }}
      >
        {formatDate(entry.createdAt)}
      </div>
    </motion.div>
  );
}

interface LeaderboardColumnProps {
  title: string;
  leaderboard: LeaderboardEntry[] | undefined;
  theme: Theme;
  isLoading: boolean;
  emptyMessage: string;
}

function LeaderboardColumn({
  title,
  leaderboard,
  theme,
  isLoading,
  emptyMessage,
}: LeaderboardColumnProps) {
  const top3 = leaderboard?.slice(0, 3) ?? [];
  const remaining = leaderboard?.slice(3) ?? [];

  const first = top3.find((e) => e.rank === 1);
  const second = top3.find((e) => e.rank === 2);
  const third = top3.find((e) => e.rank === 3);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Column Header */}
      <div className="shrink-0 mb-3">
        <h2
          className="text-lg font-semibold text-center"
          style={{ color: theme.textPrimary }}
        >
          {title}
        </h2>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div
            className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: theme.buttonSelected,
              borderTopColor: "transparent",
            }}
          />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && leaderboard && leaderboard.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-3xl mb-2">🏆</div>
          <p
            className="text-sm font-medium text-center"
            style={{ color: theme.textPrimary }}
          >
            No scores yet
          </p>
          <p className="text-xs text-center px-4" style={{ color: theme.textSecondary }}>
            {emptyMessage}
          </p>
        </div>
      )}

      {/* Leaderboard Content */}
      {!isLoading && leaderboard && leaderboard.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Podium Section */}
          {top3.length > 0 && (
            <div className="shrink-0 flex justify-center items-end gap-2 mb-4">
              {second && <PodiumCard entry={second} theme={theme} height={180} />}
              {first && <PodiumCard entry={first} theme={theme} height={210} />}
              {third && <PodiumCard entry={third} theme={theme} height={160} />}
            </div>
          )}

          {/* Remaining List - Scrollable */}
          {remaining.length > 0 && (
            <div
              className="flex-1 rounded-xl overflow-hidden flex flex-col min-h-0"
              style={{ backgroundColor: `${theme.backgroundColor}80` }}
            >
              {/* List Header */}
              <div
                className="grid gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide border-b shrink-0"
                style={{
                  color: theme.textSecondary,
                  borderColor: theme.borderSubtle,
                  gridTemplateColumns: "28px 28px 1fr 50px",
                }}
              >
                <div className="text-center">#</div>
                <div className="text-center"></div>
                <div>User</div>
                <div className="text-right">WPM</div>
              </div>

              {/* List Body - Scrollable */}
              <div className="flex-1 overflow-y-auto">
                {remaining.map((entry, index) => (
                  <motion.div
                    key={`${entry.username}-${entry.rank}`}
                    className="grid gap-2 px-3 py-1.5 border-b last:border-b-0 items-center"
                    style={{
                      borderColor: theme.borderSubtle,
                      gridTemplateColumns: "28px 28px 1fr 50px",
                    }}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + index * 0.04, duration: 0.25 }}
                  >
                    {/* Rank */}
                    <div
                      className="text-center text-xs font-medium"
                      style={{ color: theme.textSecondary }}
                    >
                      {entry.rank}
                    </div>

                    {/* Avatar */}
                    <div className="flex justify-center">
                      {entry.avatarUrl ? (
                        <img
                          src={entry.avatarUrl}
                          alt={entry.username}
                          className="h-5 w-5 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium"
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
                    <div
                      className="font-medium truncate text-xs"
                      style={{ color: theme.textPrimary }}
                    >
                      {entry.username}
                    </div>

                    {/* WPM */}
                    <div
                      className="text-right font-bold text-xs"
                      style={{ color: theme.buttonSelected }}
                    >
                      {entry.wpm}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Leaderboard() {
  const { legacyTheme } = useTheme();
  
  // Fallback theme
  const theme: LegacyTheme = legacyTheme ?? {
    cursor: "#3cb5ee",
    defaultText: "#4b5563",
    upcomingText: "#4b5563",
    correctText: "#d1d5db",
    incorrectText: "#ef4444",
    ghostCursor: "#a855f7",
    buttonUnselected: "#3cb5ee",
    buttonSelected: "#0097b2",
    accentColor: "#a855f7",
    accentMuted: "rgba(168, 85, 247, 0.3)",
    accentSubtle: "rgba(168, 85, 247, 0.1)",
    backgroundColor: "#323437",
    surfaceColor: "#2c2e31",
    elevatedColor: "#37383b",
    overlayColor: "rgba(0, 0, 0, 0.5)",
    textPrimary: "#d1d5db",
    textSecondary: "#4b5563",
    textMuted: "rgba(75, 85, 99, 0.6)",
    textInverse: "#ffffff",
    borderDefault: "rgba(75, 85, 99, 0.3)",
    borderSubtle: "rgba(75, 85, 99, 0.15)",
    borderFocus: "#3cb5ee",
    statusSuccess: "#22c55e",
    statusSuccessMuted: "rgba(34, 197, 94, 0.3)",
    statusError: "#ef4444",
    statusErrorMuted: "rgba(239, 68, 68, 0.3)",
    statusWarning: "#f59e0b",
    statusWarningMuted: "rgba(245, 158, 11, 0.3)",
  };

  // Fetch all three leaderboards in parallel
  const allTimeLeaderboard = useQuery(api.testResults.getLeaderboard, {
    timeRange: "all-time",
    limit: 50,
  });
  const todayLeaderboard = useQuery(api.testResults.getLeaderboard, {
    timeRange: "today",
    limit: 50,
  });
  const weekLeaderboard = useQuery(api.testResults.getLeaderboard, {
    timeRange: "week",
    limit: 50,
  });

  const isAllTimeLoading = allTimeLeaderboard === undefined;
  const isTodayLoading = todayLeaderboard === undefined;
  const isWeekLoading = weekLeaderboard === undefined;

  return (
    <div
      className="min-h-[100dvh] flex flex-col font-mono"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      {/* Header */}
      <header className="shrink-0 px-4 py-4 md:px-6 md:py-5 flex items-center justify-between">
        <Link
          to="/"
          className="transition text-sm hover:opacity-100"
          style={{ color: theme.textSecondary, opacity: 0.7 }}
        >
          ← Back to Homepage
        </Link>
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
          <h1
            className="text-xl font-semibold"
            style={{ color: theme.textPrimary }}
          >
            Leaderboard
          </h1>
        </div>
        <div className="w-[120px]" /> {/* Spacer for centering */}
      </header>

      {/* Requirements Info */}
      <div className="shrink-0 px-4 pb-3 md:px-6">
        <p
          className="text-xs text-center"
          style={{ color: theme.textSecondary }}
        >
          Requires 90%+ accuracy and at least 30 seconds or 50 words to qualify
        </p>
      </div>

      {/* Three Column Layout */}
      <div className="flex-1 px-4 pb-4 md:px-6 md:pb-6">
        <div className="min-h-[500px] grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* All Time Column */}
          <div
            className="rounded-xl p-4 flex flex-col min-h-0 lg:flex"
            style={{ backgroundColor: theme.surfaceColor }}
          >
            <LeaderboardColumn
              title="All-Time"
              leaderboard={allTimeLeaderboard}
              theme={theme}
              isLoading={isAllTimeLoading}
              emptyMessage="Complete a typing test and save your results to appear on the leaderboard!"
            />
          </div>

          {/* Today Column */}
          <div
            className="rounded-xl p-4 flex-col min-h-0 hidden lg:flex"
            style={{ backgroundColor: theme.surfaceColor }}
          >
            <LeaderboardColumn
              title={getTodayTitleET()}
              leaderboard={todayLeaderboard}
              theme={theme}
              isLoading={isTodayLoading}
              emptyMessage="No one has completed a test today yet. Be the first!"
            />
          </div>

          {/* This Week Column */}
          <div
            className="rounded-xl p-4 flex-col min-h-0 hidden lg:flex"
            style={{ backgroundColor: theme.surfaceColor }}
          >
            <LeaderboardColumn
              title={getWeekRangeTitleET()}
              leaderboard={weekLeaderboard}
              theme={theme}
              isLoading={isWeekLoading}
              emptyMessage="No tests completed this week. Start typing to claim the top spot!"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="shrink-0 px-4 pb-4 md:px-6 text-center"
        style={{ color: theme.textSecondary, opacity: 0.7 }}
      >
        <div className="text-xs flex items-center justify-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Leaderboard shows verified tests only
        </div>
      </footer>
    </div>
  );
}
