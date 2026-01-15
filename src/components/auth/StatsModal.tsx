import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Theme } from "@/lib/typing-constants";

interface StatsModalProps {
  theme: Theme;
  onClose: () => void;
}

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
  wordsCorrect?: number;
  wordsIncorrect?: number;
  charsMissed?: number;
  charsExtra?: number;
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

// Helper to get test type chips data
// Order: Mode, Difficulty, Mode-specific value, Modifiers
function getTestTypeChips(result: TestResult): string[] {
  const chips: string[] = [];
  
  // 1. Mode (always first)
  chips.push(result.mode.charAt(0).toUpperCase() + result.mode.slice(1));
  
  // 2. Difficulty (second, except for quote/preset)
  if (result.mode !== "quote" && result.mode !== "preset") {
    chips.push(result.difficulty.charAt(0).toUpperCase() + result.difficulty.slice(1));
  }
  
  // 3. Mode-specific value (third)
  if (result.mode === "time") {
    const seconds = Math.round(result.duration / 1000);
    chips.push(`${seconds}s`);
  } else if (result.mode === "words") {
    chips.push(`${result.wordCount} words`);
  }
  
  // 4. Modifiers (last)
  if (result.punctuation) chips.push("punctuation");
  if (result.numbers) chips.push("numbers");
  
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
          style={{ backgroundColor: theme.buttonSelected, color: theme.backgroundColor }}
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

// Test Detail Modal Component
function TestDetailModal({
  result,
  theme,
  onClose,
}: {
  result: TestResult;
  theme: Theme;
  onClose: () => void;
}) {
  return (
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
                style={{ backgroundColor: theme.buttonSelected, color: theme.backgroundColor }}
              >
                {chip}
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
        <div className="grid grid-cols-2 gap-4">
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
      </div>
    </div>
  );
}

export default function StatsModal({ theme, onClose }: StatsModalProps) {
  const { user } = useUser();
  const stats = useQuery(
    api.testResults.getUserStats,
    user ? { clerkId: user.id } : "skip"
  );
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);

  const isLoading = stats === undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-lg p-6 shadow-xl mx-4 max-h-[90vh] flex flex-col"
        style={{ backgroundColor: theme.surfaceColor }}
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
              {/* Top Row - 3 Cards */}
              <div className="grid grid-cols-3 gap-3">
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
                className="flex-1 rounded-xl overflow-hidden flex flex-col min-h-0"
                style={{ backgroundColor: `${theme.backgroundColor}80` }}
              >
                {/* Table Header */}
                <div
                  className="grid gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wide border-b"
                  style={{ 
                    color: theme.defaultText, 
                    borderColor: `${theme.defaultText}20`,
                    gridTemplateColumns: "80px 1fr 50px 55px"
                  }}
                >
                  <div>Date</div>
                  <div className="pl-2">Test Type</div>
                  <div className="text-right">WPM</div>
                  <div className="text-right">Acc</div>
                </div>

                {/* Table Body - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                  {stats.allResults.length > 0 ? (
                    stats.allResults.map((result) => (
                      <div
                        key={result._id}
                        className="grid gap-4 px-4 py-2.5 border-b last:border-b-0 hover:bg-white/10 transition-colors cursor-pointer items-center"
                        style={{ 
                          borderColor: `${theme.defaultText}10`,
                          gridTemplateColumns: "80px 1fr 50px 55px"
                        }}
                        onClick={() => setSelectedTest(result as TestResult)}
                      >
                        <div className="text-sm" style={{ color: theme.correctText }}>
                          {formatDate(result.createdAt)}
                        </div>
                        <div className="pl-2">
                          <TestTypeChips result={result as TestResult} theme={theme} />
                        </div>
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
              </div>
            </div>
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
      {selectedTest && (
        <TestDetailModal
          result={selectedTest}
          theme={theme}
          onClose={() => setSelectedTest(null)}
        />
      )}
    </div>
  );
}
