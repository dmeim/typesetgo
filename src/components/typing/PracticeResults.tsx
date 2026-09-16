import { motion } from "framer-motion";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { useTheme } from "@/hooks/useTheme";
import type { Quote, SettingsState } from "@/lib/typing-constants";
import { tv } from "@/lib/theme-vars";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

// Animated counter display for WPM
function AnimatedWpmDisplay({ value, color }: { value: number; color: string }) {
  const animated = useAnimatedCounter(value, 1000, 200);
  return (
    <div
      className="text-6xl md:text-8xl font-black tabular-nums leading-none tracking-tight"
      style={{ color }}
    >
      {animated}
    </div>
  );
}

// Animated counter display for Accuracy
function AnimatedAccuracyDisplay({ value, color }: { value: number; color: string }) {
  const animated = useAnimatedCounter(value, 1000, 300);
  return (
    <div
      className="text-6xl md:text-8xl font-black tabular-nums leading-none tracking-tight"
      style={{ color }}
    >
      {animated}
      <span className="text-2xl md:text-4xl align-top ml-1 opacity-50">%</span>
    </div>
  );
}

interface PracticeResultsProps {
  wpm: number;
  accuracy: number;
  stats: { correct: number; incorrect: number; missed: number; extra: number };
  wordResults: { correctWords: string[]; incorrectWords: { typed: string; expected: string }[] };
  settings: SettingsState;
  currentQuote: Quote | null;
  lastResultIsValid: boolean | null;
  lastResultInvalidReason?: string;
  connectMode: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  saveResults: () => void;
  generateTest: () => void;
  onLeave?: () => void;
}

export default function PracticeResults({
  wpm, accuracy, stats, wordResults, settings, currentQuote, lastResultIsValid,
  lastResultInvalidReason, connectMode, saveState, saveResults, generateTest, onLeave,
}: PracticeResultsProps) {
  const { colors } = useTheme();
  return (
    <>
          <div className="w-full max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* WPM */}
              <motion.div
                className="relative overflow-hidden rounded-2xl p-6 md:p-10 flex flex-col items-center justify-center group transition-colors"
                style={{ backgroundColor: tv.bg.surface, borderWidth: 1, borderColor: tv.border.subtle }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: tv.text.secondary }}>
                  Words Per Minute
                </div>
                <AnimatedWpmDisplay value={Math.round(wpm)} color={tv.interactive.secondary.DEFAULT} />
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity" style={{ color: tv.text.primary }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </motion.div>

              {/* Accuracy */}
              <motion.div
                className="relative overflow-hidden rounded-2xl p-6 md:p-10 flex flex-col items-center justify-center group transition-colors"
                style={{ backgroundColor: tv.bg.surface, borderWidth: 1, borderColor: tv.border.subtle }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
              >
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: tv.text.secondary }}>
                  Accuracy
                </div>
                <AnimatedAccuracyDisplay value={Math.round(accuracy)} color={tv.interactive.secondary.DEFAULT} />
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity" style={{ color: tv.text.primary }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
              </motion.div>
            </div>

            {/* Secondary Stats - Grouped by Words and Characters */}
            <motion.div
              className="flex flex-col md:flex-row gap-4 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
            >
              {/* Words Group */}
              <div className="flex-1 rounded-xl p-4" style={{ backgroundColor: `${colors.bg.surface}80`, borderWidth: 1, borderColor: tv.border.subtle }}>
                <div className="text-xs font-semibold uppercase tracking-wide text-center mb-3" style={{ color: tv.text.secondary }}>Words</div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Correct Words with Hover */}
                  <HoverCard openDelay={100} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity">
                        <div className="text-3xl font-bold mb-1" style={{ color: tv.status.success.DEFAULT }}>{wordResults.correctWords.length}</div>
                        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: tv.text.secondary }}>Correct</div>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent
                      className="w-56 p-0"
                      style={{ backgroundColor: tv.bg.surface, borderColor: tv.border.subtle }}
                    >
                      <div className="p-3" style={{ borderBottomWidth: 1, borderColor: tv.border.subtle }}>
                        <div className="text-sm font-semibold" style={{ color: tv.text.primary }}>Correct Words</div>
                        <div className="text-xs" style={{ color: tv.text.secondary }}>{wordResults.correctWords.length} words</div>
                      </div>
                      <div className="max-h-32 overflow-y-auto">
                        {wordResults.correctWords.length > 0 ? (
                          <div className="p-2 flex flex-wrap gap-1.5">
                            {wordResults.correctWords.map((word, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-xs rounded-md font-mono"
                                style={{ backgroundColor: `${colors.interactive.secondary.DEFAULT}30`, color: tv.interactive.secondary.DEFAULT }}
                              >
                                {word}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 text-center text-sm" style={{ color: tv.text.secondary }}>
                            No correct words
                          </div>
                        )}
                      </div>
                    </HoverCardContent>
                  </HoverCard>

                  {/* Incorrect Words with Hover */}
                  <HoverCard openDelay={100} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity">
                        <div className="text-3xl font-bold mb-1" style={{ color: tv.status.error.DEFAULT }}>{wordResults.incorrectWords.length}</div>
                        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: tv.text.secondary }}>Incorrect</div>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent
                      className="w-64 p-0"
                      style={{ backgroundColor: tv.bg.surface, borderColor: tv.border.subtle }}
                    >
                      <div className="p-3" style={{ borderBottomWidth: 1, borderColor: tv.border.subtle }}>
                        <div className="text-sm font-semibold" style={{ color: tv.text.primary }}>Incorrect Words</div>
                        <div className="text-xs" style={{ color: tv.text.secondary }}>{wordResults.incorrectWords.length} mistakes</div>
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {wordResults.incorrectWords.length > 0 ? (
                          <div className="p-2 space-y-1.5">
                            {wordResults.incorrectWords.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 px-2 py-1 rounded text-xs font-mono"
                                style={{ backgroundColor: tv.bg.surface }}
                              >
                                <span style={{ color: tv.status.error.DEFAULT }}>{item.typed}</span>
                                <span style={{ color: tv.text.secondary }}>→</span>
                                <span style={{ color: tv.interactive.secondary.DEFAULT }}>{item.expected}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 text-center text-sm" style={{ color: tv.text.secondary }}>
                            No mistakes - perfect!
                          </div>
                        )}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </div>

              {/* Characters Group */}
              <div className="flex-1 rounded-xl p-4" style={{ backgroundColor: `${colors.bg.surface}80`, borderWidth: 1, borderColor: tv.border.subtle }}>
                <div className="text-xs font-semibold uppercase tracking-wide text-center mb-3" style={{ color: tv.text.secondary }}>Characters</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-bold mb-1" style={{ color: tv.text.primary }}>{stats.missed}</div>
                    <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: tv.text.secondary }}>Missed</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-bold mb-1" style={{ color: tv.text.primary }}>{stats.extra}</div>
                    <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: tv.text.secondary }}>Extra</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quote Attribution */}
            {settings.mode === "quote" && currentQuote && (
              <div className="text-center mb-8" style={{ color: tv.text.secondary }}>
                — {currentQuote.author}
                {currentQuote.source && `, ${currentQuote.source}`}
              </div>
            )}

            {/* Unverified Test Warning */}
            {lastResultIsValid === false && (
              <div
                className="w-full mb-6 p-4 rounded-lg border"
                style={{
                  backgroundColor: colors.status.error.muted,
                  borderColor: tv.status.error.DEFAULT,
                }}
              >
                <div className="flex items-center gap-3">
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
                    className="flex-shrink-0"
                    style={{ color: tv.status.error.DEFAULT }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div className="flex-1">
                    <span className="font-medium" style={{ color: tv.status.error.DEFAULT }}>
                      Unverified
                    </span>
                    <span className="text-sm ml-2" style={{ color: tv.text.secondary }}>
                      {lastResultInvalidReason?.includes("progress")
                        ? "Not enough typing activity reached the server"
                        : lastResultInvalidReason?.includes("WPM exceeds")
                          ? "Speed exceeded the 300 WPM cap"
                          : lastResultInvalidReason?.includes("Burst") || lastResultInvalidReason?.includes("paste")
                            ? "Input appeared faster than allowed"
                            : lastResultInvalidReason?.includes("too fast")
                              ? "Test completed too quickly (need full duration)"
                              : lastResultInvalidReason?.includes("Session was not established")
                                ? "Could not verify this test with a server session"
                              : "Could not verify this test"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <motion.div
              className="flex gap-4 justify-center"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
            >
              {/* Save Results Button */}
              {!connectMode && (
                <button
                  type="button"
                  onClick={() => saveResults()}
                  disabled={saveState === "saving" || saveState === "saved" || lastResultIsValid === false}
                  className="group relative inline-flex items-center justify-center px-8 py-3 font-medium transition-all duration-200 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: lastResultIsValid === false
                      ? colors.status.error.muted
                      : saveState === "saved"
                        ? colors.status.success.muted
                        : saveState === "error"
                          ? colors.status.error.muted
                          : tv.interactive.secondary.DEFAULT,
                    color: lastResultIsValid === false
                      ? tv.status.error.DEFAULT
                      : saveState === "saved"
                        ? tv.status.success.DEFAULT
                        : saveState === "error"
                          ? tv.status.error.DEFAULT
                          : tv.text.inverse
                  }}
                >
                  {lastResultIsValid === false && (
                    <>
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
                        className="mr-2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      Invalid
                    </>
                  )}
                  {lastResultIsValid !== false && saveState === "idle" && (
                    <>
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
                        className="mr-2"
                      >
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                      Save Results
                    </>
                  )}
                  {lastResultIsValid !== false && saveState === "saving" && (
                    <>
                      <div
                        className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin mr-2"
                        style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
                      />
                      Saving...
                    </>
                  )}
                  {lastResultIsValid !== false && saveState === "saved" && (
                    <>
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
                        className="mr-2"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Saved
                    </>
                  )}
                  {lastResultIsValid !== false && saveState === "error" && (
                    <>
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
                        className="mr-2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      Error - Try Again
                    </>
                  )}
                </button>
              )}
              {!connectMode && (
                <button
                  type="button"
                  onClick={() => generateTest()}
                  className="group relative inline-flex items-center justify-center px-8 py-3 font-medium transition-all duration-200 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ backgroundColor: tv.bg.surface, color: tv.text.primary }}
                >
                  <span className="mr-2 transition-transform group-hover:rotate-180">↻</span>
                  Next Test
                  <div className="absolute bottom-0 left-0 h-1 w-full scale-x-0 transition-transform duration-200 group-hover:scale-x-100 rounded-b-lg" style={{ backgroundColor: tv.interactive.secondary.DEFAULT }}></div>
                </button>
              )}
              {connectMode && onLeave && (
                <button
                  type="button"
                  onClick={onLeave}
                  className="px-8 py-3 font-medium transition-all duration-200 rounded-lg hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ color: tv.status.error.DEFAULT, backgroundColor: colors.status.error.muted, borderWidth: 1, borderColor: tv.status.error.DEFAULT }}
                >
                  Leave Room
                </button>
              )}
            </motion.div>

            <motion.div
              className="mt-6 text-center text-sm"
              style={{ color: tv.text.secondary }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
            >
              <div>
                {lastResultIsValid === true && (
                  <>
                    Verified
                    {" · "}
                  </>
                )}
                {lastResultIsValid !== false && saveState !== "saved" && saveState !== "saving" && (
                  <>
                    Press <kbd className="px-1.5 py-0.5 rounded font-sans" style={{ backgroundColor: tv.bg.surface, color: tv.text.primary }}>Space</kbd> to save
                    {" · "}
                  </>
                )}
                <kbd className="px-1.5 py-0.5 rounded font-sans" style={{ backgroundColor: tv.bg.surface, color: tv.text.primary }}>Enter</kbd> to continue
              </div>
              <div className="mt-1">
                Press <kbd className="px-1.5 py-0.5 rounded font-sans" style={{ backgroundColor: tv.bg.surface, color: tv.text.primary }}>Tab</kbd> to repeat this test
              </div>
            </motion.div>
          </div>
    </>
  );
}
