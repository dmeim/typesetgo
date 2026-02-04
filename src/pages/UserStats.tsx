import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useTheme } from "@/hooks/useTheme";
import type { LegacyTheme } from "@/types/theme";
import AchievementsCategoryGrid from "@/components/auth/AchievementsCategoryGrid";

// Helper type for components that receive theme
type Theme = LegacyTheme;

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
function getTestTypeChips(result: TestResult): ChipData[] {
  const chips: ChipData[] = [];
  
  chips.push({ label: result.mode.charAt(0).toUpperCase() + result.mode.slice(1) });
  
  if (result.mode !== "quote" && result.mode !== "preset") {
    chips.push({ label: result.difficulty.charAt(0).toUpperCase() + result.difficulty.slice(1) });
  }
  
  if (result.mode === "time") {
    const seconds = Math.round(result.duration / 1000);
    chips.push({ label: `${seconds}s` });
  } else if (result.mode === "words") {
    chips.push({ label: `${result.wordCount} words` });
  }
  
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

// Valid Icon Component
function ValidIcon({ 
  result, 
  theme 
}: { 
  result: TestResult; 
  theme: Theme;
}) {
  const isValid = result.isValid !== false;
  
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
  isOwner,
  onClose,
  onDeleted,
}: {
  result: TestResult;
  theme: Theme;
  clerkId: string | null;
  isOwner: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteResult = useMutation(api.testResults.deleteResult);

  const handleDelete = async () => {
    if (!clerkId) return;
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

          {/* Delete Button - Only show if owner */}
          {isOwner && (
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
          )}
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

// Stat Card Component
function StatCard({
  label,
  value,
  theme,
  color = "buttonSelected",
}: {
  label: string;
  value: string | number;
  theme: Theme;
  color?: "buttonSelected" | "correctText";
}) {
  return (
    <div
      className="p-4 rounded-xl flex flex-col justify-center"
      style={{ 
        backgroundColor: theme.surfaceColor,
        border: `1px solid ${theme.defaultText}20`
      }}
    >
      <div className="text-sm font-semibold uppercase tracking-wide mb-1.5" style={{ color: theme.defaultText }}>
        {label}
      </div>
      <div className="text-2xl font-bold" style={{ color: theme[color] }}>
        {value}
      </div>
    </div>
  );
}

export default function UserStats() {
  const { legacyTheme } = useTheme();
  const { userId } = useParams<{ userId: string }>();

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
  const { user: clerkUser } = useUser();

  // Fetch the profile user's data by Convex user ID
  const profileUser = useQuery(
    api.users.getUserById,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );
  const stats = useQuery(
    api.testResults.getUserStatsByUserId,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );
  const achievements = useQuery(
    api.achievements.getUserAchievementsByUserId,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  // Fetch current user's Convex ID to determine ownership
  const currentConvexUser = useQuery(
    api.users.getUser,
    clerkUser ? { clerkId: clerkUser.id } : "skip"
  );

  const isOwner = currentConvexUser?._id === userId;

  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const isLoading = profileUser === undefined || stats === undefined;

  // Sort results based on current sort state
  const allResults = stats?.allResults;
  const sortedResults = useMemo(() => {
    if (!allResults) return [];
    return [...allResults].sort((a, b) => {
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
  }, [allResults, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // User not found state
  if (profileUser === null) {
    return (
      <div
        className="h-[100dvh] flex flex-col items-center justify-center font-mono"
        style={{ backgroundColor: theme.backgroundColor }}
      >
        <div className="text-4xl mb-4">404</div>
        <h1 className="text-xl font-semibold mb-2" style={{ color: theme.correctText }}>
          User Not Found
        </h1>
        <p className="text-sm mb-6" style={{ color: theme.defaultText }}>
          The user profile you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="px-4 py-2 rounded-lg font-medium transition hover:opacity-80"
          style={{ backgroundColor: theme.buttonSelected, color: theme.backgroundColor }}
        >
          Back to Homepage
        </Link>
      </div>
    );
  }

  return (
    <div
      className="h-[100dvh] flex flex-col font-mono overflow-hidden"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      {/* Header */}
      <header className="shrink-0 px-4 py-4 md:px-6 md:py-5 relative">
        {/* Back button - positioned left */}
        <Link
          to="/"
          className="transition text-sm hover:opacity-100"
          style={{ color: theme.defaultText, opacity: 0.7 }}
        >
          ← Back to Homepage
        </Link>
        {/* Avatar and username - absolutely centered on screen */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3">
          {profileUser?.avatarUrl ? (
            <img
              src={profileUser.avatarUrl}
              alt="Avatar"
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-lg font-medium"
              style={{ backgroundColor: theme.buttonSelected, color: theme.backgroundColor }}
            >
              {(profileUser?.username ?? "U")[0].toUpperCase()}
            </div>
          )}
          <h1
            className="text-xl font-semibold"
            style={{ color: theme.correctText }}
          >
            {profileUser?.username ?? "User"}
          </h1>
        </div>
      </header>

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div
            className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: theme.buttonSelected, borderTopColor: "transparent" }}
          />
        </div>
      )}

      {/* Main Content */}
      {!isLoading && stats && (
        <div className="flex-1 flex flex-col min-h-0 px-4 pb-4 md:px-6 md:pb-6 gap-4">
          {/* Top Row - 6 Stat Cards */}
          <div className="shrink-0 grid grid-cols-3 md:grid-cols-6 gap-3">
            <StatCard label="Typing Time" value={formatDuration(stats.totalTimeTyped)} theme={theme} />
            <StatCard label="Best WPM" value={stats.bestWpm} theme={theme} />
            <StatCard label="Avg WPM" value={stats.averageWpm} theme={theme} color="correctText" />
            <StatCard label="Avg Accuracy" value={`${stats.averageAccuracy}%`} theme={theme} color="correctText" />
            <StatCard label="Words Typed" value={stats.totalWordsTyped.toLocaleString()} theme={theme} />
            <StatCard label="Characters" value={stats.totalCharactersTyped.toLocaleString()} theme={theme} />
          </div>

          {/* Two Column Layout */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
            {/* Left Column - Achievements */}
            <div
              className="rounded-xl p-4 flex flex-col min-h-0 overflow-auto"
              style={{ backgroundColor: theme.surfaceColor }}
            >
              <AchievementsCategoryGrid
                earnedAchievements={achievements ?? {}}
              />
            </div>

            {/* Right Column - Test History */}
            <div
              className="rounded-xl flex flex-col min-h-0 overflow-hidden"
              style={{ backgroundColor: theme.surfaceColor }}
            >
              {/* Table Header */}
              <div
                className="grid gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wide border-b shrink-0"
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

              {/* Table Body - Scrollable */}
              <div className="flex-1 overflow-y-auto">
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
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="text-3xl mb-2 opacity-50">📊</div>
                    <p className="text-sm" style={{ color: theme.defaultText }}>
                      No tests saved yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Detail Modal */}
      {selectedTest && (
        <TestDetailModal
          result={selectedTest}
          theme={theme}
          clerkId={clerkUser?.id ?? null}
          isOwner={isOwner}
          onClose={() => setSelectedTest(null)}
          onDeleted={() => setSelectedTest(null)}
        />
      )}
    </div>
  );
}
