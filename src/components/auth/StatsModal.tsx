import { useState, useMemo, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useTheme } from "@/hooks/useTheme";
import type { LegacyTheme } from "@/types/theme";
import AchievementsGrid from "./AchievementsGrid";

// Helper type for components that receive theme
type Theme = LegacyTheme;

interface StatsModalProps {
  onClose: () => void;
}

// Sort types for the test history table
type SortColumn = "date" | "wpm" | "accuracy";
type SortDirection = "asc" | "desc";

// Type for test result from DB (new stats are optional for backwards compatibility)
interface TestResult {
  _id: string;
  wpm: number;
  accuracy: number;
  mode: string;
  duration: number;
  wordCount: number;
  difficulty: string;
  punctuation: boolean;
  numbers: boolean;
  capitalization?: boolean;
  wordsCorrect?: number;
  wordsIncorrect?: number;
  charsMissed?: number;
  charsExtra?: number;
  isValid?: boolean; // undefined = legacy (treated as valid)
  invalidReason?: string;
  createdAt: number;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${month}/${day}/${year} at ${hour12}:${minutes} ${ampm}`;
}

// Chip data for test type
interface ChipData {
  label: string;
}

// Helper to get test type chips data
// Order: Mode, Difficulty, Mode-specific value, Modifiers
function getTestTypeChips(result: TestResult): ChipData[] {
  const chips: ChipData[] = [];
  
  // 1. Mode (always first)
  chips.push({ label: result.mode.charAt(0).toUpperCase() + result.mode.slice(1) });
  
  // 2. Difficulty (second, except for quote/preset)
  if (result.mode !== "quote" && result.mode !== "preset") {
    chips.push({ label: result.difficulty.charAt(0).toUpperCase() + result.difficulty.slice(1) });
  }
  
  // 3. Mode-specific value (third)
  if (result.mode === "time") {
    const seconds = Math.round(result.duration / 1000);
    chips.push({ label: `${seconds}s` });
  } else if (result.mode === "words") {
    chips.push({ label: `${result.wordCount} words` });
  }
  
  // 4. Modifiers
  if (result.capitalization) chips.push({ label: "caps" });
  if (result.punctuation) chips.push({ label: "punctuation" });
  if (result.numbers) chips.push({ label: "numbers" });
  
  return chips;
}

// Chip component for test type
function TestTypeChips({ 
  result, 
  theme 
}: { 
  result: TestResult; 
  theme: Theme;
}) {
  const chips = getTestTypeChips(result);
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((chip, idx) => (
        <span
          key={idx}
          className="px-2 py-0.5 rounded text-xs font-medium"
          style={{ 
            backgroundColor: theme.buttonSelected, 
            color: theme.backgroundColor 
          }}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}

// Valid Icon Component - shows checkmark or X based on test validity
function ValidIcon({ 
  result, 
  theme 
}: { 
  result: TestResult; 
  theme: Theme;
}) {
  const isValid = result.isValid !== false; // undefined = legacy (treated as valid)
  
  return (
    <div 
      className="flex items-center justify-center"
      title={!isValid && result.invalidReason ? `Invalid: ${result.invalidReason}` : undefined}
    >
      {isValid ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: theme.correctText }}
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: theme.incorrectText }}
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      )}
    </div>
  );
}

// Sortable Header Component
function SortableHeader({
  label,
  column,
  currentColumn,
  currentDirection,
  onSort,
  theme,
  align = "left",
}: {
  label: string;
  column: SortColumn;
  currentColumn: SortColumn;
  currentDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  theme: Theme;
  align?: "left" | "right";
}) {
  const isActive = currentColumn === column;
  
  return (
    <button
      onClick={() => onSort(column)}
      className={`flex items-center gap-1 hover:opacity-80 transition-opacity ${
        align === "right" ? "justify-end ml-auto" : ""
      }`}
      style={{ color: isActive ? theme.buttonSelected : theme.defaultText }}
    >
      <span>{label}</span>
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
        style={{ 
          opacity: isActive ? 1 : 0.4,
          transform: isActive && currentDirection === "asc" ? "rotate(180deg)" : "none",
          transition: "transform 0.15s ease"
        }}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

// Delete Confirmation Modal Component
function DeleteConfirmModal({
  theme,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  theme: Theme;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-lg p-6 shadow-xl mx-4"
        style={{ backgroundColor: theme.surfaceColor }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-semibold text-center mb-6" style={{ color: theme.correctText }}>
          Are You Sure?
        </h3>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-3 px-4 rounded-lg font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ 
              backgroundColor: theme.buttonSelected, 
              color: theme.backgroundColor 
            }}
          >
            NOOO!!!
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-3 px-4 rounded-lg font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ 
              backgroundColor: theme.incorrectText, 
              color: theme.backgroundColor 
            }}
          >
            {isDeleting ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Test Detail Modal Component
function TestDetailModal({
  result,
  theme,
  clerkId,
  onClose,
  onDeleted,
}: {
  result: TestResult;
  theme: Theme;
  clerkId: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteResult = useMutation(api.testResults.deleteResult);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteResult({
        resultId: result._id as Id<"testResults">,
        clerkId,
      });
      onDeleted();
    } catch (error) {
      console.error("Failed to delete test result:", error);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg rounded-lg p-8 shadow-xl mx-4"
          style={{ backgroundColor: theme.surfaceColor }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold" style={{ color: theme.correctText }}>
              Test Details
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition hover:bg-gray-700/50"
              style={{ color: theme.defaultText }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
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

          {/* Date & Test Type Chips */}
          <div className="mb-5 text-center">
            <div className="text-sm mb-2" style={{ color: theme.defaultText }}>
              {formatDateTime(result.createdAt)}
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {getTestTypeChips(result).map((chip, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{ 
                    backgroundColor: theme.buttonSelected, 
                    color: theme.backgroundColor 
                  }}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          </div>

          {/* Main Stats - WPM & Accuracy */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div
              className="p-5 rounded-xl text-center"
              style={{ backgroundColor: `${theme.backgroundColor}80` }}
            >
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: theme.defaultText }}>
                WPM
              </div>
              <div className="text-5xl font-bold" style={{ color: theme.buttonSelected }}>
                {result.wpm}
              </div>
            </div>
            <div
              className="p-5 rounded-xl text-center"
              style={{ backgroundColor: `${theme.backgroundColor}80` }}
            >
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: theme.defaultText }}>
                Accuracy
              </div>
              <div className="text-5xl font-bold" style={{ color: theme.buttonSelected }}>
                {Math.round(result.accuracy)}%
              </div>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            {/* Words */}
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: `${theme.backgroundColor}80` }}
            >
              <div className="text-xs font-semibold uppercase tracking-wide mb-3 text-center" style={{ color: theme.defaultText }}>
                Words
              </div>
              <div className="flex justify-around">
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: theme.correctText }}>
                    {result.wordsCorrect ?? 0}
                  </div>
                  <div className="text-xs mt-1" style={{ color: theme.defaultText }}>Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: theme.incorrectText }}>
                    {result.wordsIncorrect ?? 0}
                  </div>
                  <div className="text-xs mt-1" style={{ color: theme.defaultText }}>Incorrect</div>
                </div>
              </div>
            </div>

            {/* Characters */}
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: `${theme.backgroundColor}80` }}
            >
              <div className="text-xs font-semibold uppercase tracking-wide mb-3 text-center" style={{ color: theme.defaultText }}>
                Characters
              </div>
              <div className="flex justify-around">
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: theme.correctText }}>
                    {result.charsMissed ?? 0}
                  </div>
                  <div className="text-xs mt-1" style={{ color: theme.defaultText }}>Missed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: theme.correctText }}>
                    {result.charsExtra ?? 0}
                  </div>
                  <div className="text-xs mt-1" style={{ color: theme.defaultText }}>Extra</div>
                </div>
              </div>
            </div>
          </div>

          {/* Delete Button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-2.5 rounded-lg font-medium transition-opacity hover:opacity-80"
            style={{ 
              backgroundColor: `${theme.incorrectText}20`, 
              color: theme.incorrectText 
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          theme={theme}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}

// Constants for table sizing
const ROW_HEIGHT_PX = 44;
const VISIBLE_ROWS = 7;
const PEEK_PERCENTAGE = 0.3; // Show 30% of 8th row

export default function StatsModal({ onClose }: StatsModalProps) {
  const { user } = useUser();
  const { legacyTheme } = useTheme();

  // Fallback theme (complete)
  const theme: LegacyTheme = legacyTheme ?? {
    cursor: "#3cb5ee",
    defaultText: "#4b5563",
    upcomingText: "#4b5563",
    correctText: "#d1d5db",
    incorrectText: "#ef4444",
    buttonUnselected: "#3cb5ee",
    buttonSelected: "#0097b2",
    backgroundColor: "#323437",
    surfaceColor: "#2c2e31",
    ghostCursor: "#a855f7",
  };
  const stats = useQuery(
    api.testResults.getUserStats,
    user ? { clerkId: user.id } : "skip"
  );
  const streak = useQuery(
    api.streaks.getUserStreak,
    user ? { clerkId: user.id } : "skip"
  );
  const achievements = useQuery(
    api.achievements.getUserAchievements,
    user ? { clerkId: user.id } : "skip"
  );
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isLargeScreen, setIsLargeScreen] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  // Track screen size for responsive table height
  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isLoading = stats === undefined;

  // Sort results based on current sort state
  const sortedResults = useMemo(() => {
    if (!stats?.allResults) return [];
    return [...stats.allResults].sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case "date":
          comparison = a.createdAt - b.createdAt;
          break;
        case "wpm":
          comparison = a.wpm - b.wpm;
          break;
        case "accuracy":
          comparison = a.accuracy - b.accuracy;
          break;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });
  }, [stats?.allResults, sortColumn, sortDirection]);

  // Handle sort column click - toggle direction if same column, otherwise set new column with desc
  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full rounded-lg shadow-xl mx-4 max-h-[90vh] flex flex-col"
        style={{ 
          backgroundColor: theme.surfaceColor,
          maxWidth: "clamp(320px, 85vw, 896px)",
          padding: "clamp(1rem, 2vw, 1.5rem)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {user?.imageUrl && (
              <img
                src={user.imageUrl}
                alt="Avatar"
                className="h-10 w-10 rounded-full object-cover"
              />
            )}
            <div>
              <h2 className="text-xl font-semibold" style={{ color: theme.correctText }}>
                Your Stats
              </h2>
              <p className="text-sm" style={{ color: theme.defaultText }}>
                {user?.username ?? user?.firstName ?? "User"}
              </p>
            </div>
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

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div
              className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: theme.buttonSelected, borderTopColor: "transparent" }}
            />
          </div>
        )}

        {/* Stats Content */}
        {!isLoading && stats && (
          <div className="flex-1 flex gap-6 min-h-0">
            {/* Left Column - Key Stats (1x4 vertical) */}
            <div className="flex flex-col gap-3 w-36 flex-shrink-0">
              <div
                className="p-4 rounded-xl flex-1 flex flex-col justify-center"
                style={{ backgroundColor: `${theme.backgroundColor}80` }}
              >
                <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: theme.defaultText }}>
                  Typing Time
                </div>
                <div className="text-2xl font-bold" style={{ color: theme.buttonSelected }}>
                  {formatDuration(stats.totalTimeTyped)}
                </div>
              </div>

              <div
                className="p-4 rounded-xl flex-1 flex flex-col justify-center"
                style={{ backgroundColor: `${theme.backgroundColor}80` }}
              >
                <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: theme.defaultText }}>
                  Best WPM
                </div>
                <div className="text-2xl font-bold" style={{ color: theme.buttonSelected }}>
                  {stats.bestWpm}
                </div>
              </div>

              <div
                className="p-4 rounded-xl flex-1 flex flex-col justify-center"
                style={{ backgroundColor: `${theme.backgroundColor}80` }}
              >
                <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: theme.defaultText }}>
                  Avg WPM
                </div>
                <div className="text-2xl font-bold" style={{ color: theme.correctText }}>
                  {stats.averageWpm}
                </div>
              </div>

              <div
                className="p-4 rounded-xl flex-1 flex flex-col justify-center"
                style={{ backgroundColor: `${theme.backgroundColor}80` }}
              >
                <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: theme.defaultText }}>
                  Avg Accuracy
                </div>
                <div className="text-2xl font-bold" style={{ color: theme.correctText }}>
                  {stats.averageAccuracy}%
                </div>
              </div>
            </div>

            {/* Right Column - Additional Stats + History */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {/* Top Row - 4 Cards */}
              <div className="grid grid-cols-4 gap-3">
                {/* Streak Card */}
                <div
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: `${theme.backgroundColor}80` }}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: theme.defaultText }}>
                    Day Streak
                  </div>
                  <div className="text-lg font-bold flex items-center gap-1" style={{ color: theme.buttonSelected }}>
                    {streak?.currentStreak ?? 0}
                    <span
                      className="text-lg"
                      style={{
                        filter: (streak?.currentStreak ?? 0) > 0 ? "none" : "grayscale(100%)",
                        opacity: (streak?.currentStreak ?? 0) > 0 ? 1 : 0.5,
                      }}
                    >
                      🔥
                    </span>
                  </div>
                </div>

                <div
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: `${theme.backgroundColor}80` }}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: theme.defaultText }}>
                    Saved Tests
                  </div>
                  <div className="text-lg font-bold" style={{ color: theme.buttonSelected }}>
                    {stats.totalTests}
                  </div>
                </div>

                <div
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: `${theme.backgroundColor}80` }}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: theme.defaultText }}>
                    Words Typed
                  </div>
                  <div className="text-lg font-bold" style={{ color: theme.buttonSelected }}>
                    {stats.totalWordsTyped.toLocaleString()}
                  </div>
                </div>

                <div
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: `${theme.backgroundColor}80` }}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: theme.defaultText }}>
                    Characters Typed
                  </div>
                  <div className="text-lg font-bold" style={{ color: theme.buttonSelected }}>
                    {stats.totalCharactersTyped.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Test History Table */}
              <div
                className="flex-1 rounded-xl overflow-hidden flex flex-col min-h-0 relative"
                style={{ backgroundColor: `${theme.backgroundColor}80` }}
              >
                {/* Table Header */}
                <div
                  className="grid gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wide border-b"
                  style={{ 
                    color: theme.defaultText, 
                    borderColor: `${theme.defaultText}20`,
                    gridTemplateColumns: "80px 1fr 40px 50px 55px"
                  }}
                >
                  <SortableHeader
                    label="Date"
                    column="date"
                    currentColumn={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    theme={theme}
                  />
                  <div className="pl-2">Test Type</div>
                  <div className="text-center">Valid</div>
                  <SortableHeader
                    label="WPM"
                    column="wpm"
                    currentColumn={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    theme={theme}
                    align="right"
                  />
                  <SortableHeader
                    label="Acc"
                    column="accuracy"
                    currentColumn={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    theme={theme}
                    align="right"
                  />
                </div>

                {/* Table Body - Scrollable (shows 7 entries + 8th peeking ~30% on large screens) */}
                <div 
                  className="overflow-y-auto flex-1"
                  style={isLargeScreen ? { 
                    maxHeight: `calc(${VISIBLE_ROWS + PEEK_PERCENTAGE} * ${ROW_HEIGHT_PX}px)`,
                    flex: "none"
                  } : undefined}
                >
                  {sortedResults.length > 0 ? (
                    sortedResults.map((result) => (
                      <div
                        key={result._id}
                        className="grid gap-4 px-4 py-2.5 border-b last:border-b-0 hover:bg-white/10 transition-colors cursor-pointer items-center"
                        style={{ 
                          borderColor: `${theme.defaultText}10`,
                          gridTemplateColumns: "80px 1fr 40px 50px 55px"
                        }}
                        onClick={() => setSelectedTest(result as TestResult)}
                      >
                        <div className="text-sm" style={{ color: theme.correctText }}>
                          {formatDate(result.createdAt)}
                        </div>
                        <div className="pl-2">
                          <TestTypeChips result={result as TestResult} theme={theme} />
                        </div>
                        <ValidIcon result={result as TestResult} theme={theme} />
                        <div className="text-sm text-right font-medium" style={{ color: theme.correctText }}>
                          {result.wpm}
                        </div>
                        <div className="text-sm text-right font-medium" style={{ color: theme.buttonSelected }}>
                          {Math.round(result.accuracy)}%
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-sm" style={{ color: theme.defaultText }}>
                        No tests saved yet
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Fade overlay to indicate more content (only on large screens with peek effect) */}
                {isLargeScreen && sortedResults.length > VISIBLE_ROWS && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none rounded-b-xl"
                    style={{ 
                      background: `linear-gradient(transparent, ${theme.backgroundColor}80)` 
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Achievements Section */}
        {!isLoading && stats && stats.totalTests > 0 && (
          <div className="mt-6">
            <AchievementsGrid
              earnedAchievements={achievements ?? {}}
              maxVisibleRows={2}
            />
          </div>
        )}

        {/* Empty State - Only show when no data at all */}
        {!isLoading && stats && stats.totalTests === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-lg font-medium" style={{ color: theme.correctText }}>
              No tests saved yet
            </p>
            <p className="text-sm" style={{ color: theme.defaultText }}>
              Complete a typing test and click "Save Results" to track your progress!
            </p>
          </div>
        )}
      </div>

      {/* Test Detail Modal */}
      {selectedTest && user && (
        <TestDetailModal
          result={selectedTest}
          theme={theme}
          clerkId={user.id}
          onClose={() => setSelectedTest(null)}
          onDeleted={() => setSelectedTest(null)}
        />
      )}
    </div>
  );
}
