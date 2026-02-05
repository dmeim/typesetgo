// src/components/typing/TypingArea.tsx
// Reusable typing area component extracted from TypingPractice
// Handles core typing logic, character rendering, and WPM/accuracy calculation

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import type { LegacyTheme } from "@/types/theme";

// --- Types ---
export interface TypingStats {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  progress: number; // 0-100
  correctChars: number;
  incorrectChars: number;
  missedChars: number;
  extraChars: number;
  typedLength: number;
  totalLength: number;
  elapsedMs: number;
  isFinished: boolean;
}

export interface TypingAreaProps {
  /** Text to type */
  targetText: string;
  /** Callback fired when typing stats change */
  onProgress?: (stats: TypingStats) => void;
  /** Callback fired when typing starts */
  onStart?: () => void;
  /** Callback fired when typing finishes (all text typed) */
  onFinish?: (stats: TypingStats) => void;
  /** Enable/disable input */
  isActive?: boolean;
  /** Display mode: "standard" for full text, "race" for feeding tape style */
  mode?: "standard" | "race";
  /** Show inline WPM/accuracy stats */
  showStats?: boolean;
  /** Feeding tape mode: words scroll left-to-right (for race mode) */
  feedingTape?: boolean;
  /** Font size in rem */
  fontSize?: number;
  /** Maximum words per line (for standard mode) */
  maxWordsPerLine?: number;
  /** Number of visible lines (for standard mode with scroll) */
  visibleLines?: number;
  /** Externally controlled typed text (for reconnection support) */
  initialTypedText?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Custom class name for container */
  className?: string;
  /** Text alignment */
  textAlign?: "left" | "center" | "right";
}

// --- Helper Functions ---

/** Compute character-level stats from typed text vs reference */
function computeStats(typed: string, reference: string) {
  const typedWords = typed.split(" ");
  const referenceWords = reference.split(" ");

  let correct = 0;
  let incorrect = 0;
  let missed = 0;
  let extra = 0;

  for (let i = 0; i < typedWords.length; i++) {
    const typedWord = typedWords[i];
    const refWord = referenceWords[i] || "";
    const isCurrentWord = i === typedWords.length - 1;

    if (isCurrentWord) {
      for (let j = 0; j < typedWord.length; j++) {
        if (j < refWord.length) {
          if (typedWord[j] === refWord[j]) {
            correct++;
          } else {
            incorrect++;
          }
        } else {
          extra++;
        }
      }
    } else {
      for (let j = 0; j < refWord.length; j++) {
        if (j < typedWord.length) {
          if (typedWord[j] === refWord[j]) {
            correct++;
          } else {
            incorrect++;
          }
        } else {
          missed++;
        }
      }

      if (typedWord.length > refWord.length) {
        extra += typedWord.length - refWord.length;
      }
    }

    // Count space between words
    if (i < typedWords.length - 1) {
      const refHasNextWord = i < referenceWords.length - 1;
      if (refHasNextWord) {
        if (typedWord.length >= refWord.length) {
          correct++;
        } else {
          incorrect++;
        }
      } else {
        const isSingleTrailingSpace =
          i === typedWords.length - 2 && typedWords[i + 1] === "";
        if (isSingleTrailingSpace) {
          correct++;
        } else {
          extra++;
        }
      }
    }
  }

  return { correct, incorrect, missed, extra };
}

// Default fallback theme
const DEFAULT_THEME: LegacyTheme = {
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

const LINE_HEIGHT = 1.6;

// --- Component ---
export default function TypingArea({
  targetText,
  onProgress,
  onStart,
  onFinish,
  isActive = true,
  mode = "standard",
  showStats = false,
  feedingTape = false,
  fontSize = 2,
  maxWordsPerLine = 10,
  visibleLines = 3,
  initialTypedText = "",
  autoFocus = true,
  className = "",
  textAlign = "left",
}: TypingAreaProps) {
  // Theme
  const { legacyTheme } = useTheme();
  const theme: LegacyTheme = legacyTheme ?? DEFAULT_THEME;

  // State
  const [typedText, setTypedText] = useState(initialTypedText);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [tapeOffset, setTapeOffset] = useState(0);

  // Refs
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const tapeContainerRef = useRef<HTMLDivElement | null>(null);
  const tapeContentRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLSpanElement | null>(null);

  // Computed stats
  const stats = useMemo(() => computeStats(typedText, targetText), [typedText, targetText]);

  // Calculate consecutive correct characters from start (for race mode)
  // This counts how many characters from the beginning are typed correctly
  const consecutiveCorrect = useMemo(() => {
    let correct = 0;
    for (let i = 0; i < typedText.length && i < targetText.length; i++) {
      if (typedText[i] === targetText[i]) {
        correct++;
      } else {
        break; // Stop at first mistake
      }
    }
    return correct;
  }, [typedText, targetText]);

  // Check if typing is finished
  // In race mode: must type all characters correctly (no mistakes)
  // In standard mode: just need to type enough characters
  const isFinished = useMemo(() => {
    if (!targetText) return false;
    if (mode === "race") {
      // Race mode: all characters must be typed correctly
      return consecutiveCorrect >= targetText.length;
    }
    return typedText.length >= targetText.length;
  }, [typedText, targetText, mode, consecutiveCorrect]);
  
  const accuracy = useMemo(() => {
    return typedText.length > 0 ? (stats.correct / typedText.length) * 100 : 100;
  }, [stats.correct, typedText.length]);

  const wpm = useMemo(() => {
    const elapsedMinutes = elapsedMs / 60000 || 0.01;
    // In race mode, use consecutive correct for WPM calculation
    const charsToCount = mode === "race" ? consecutiveCorrect : typedText.length;
    return (charsToCount / 5) / elapsedMinutes;
  }, [typedText.length, elapsedMs, mode, consecutiveCorrect]);

  const rawWpm = useMemo(() => {
    const elapsedMinutes = elapsedMs / 60000 || 0.01;
    return (stats.correct / 5) / elapsedMinutes;
  }, [stats.correct, elapsedMs]);

  // Progress calculation
  // In race mode: based on consecutive correct characters (mistakes stop progress)
  // In standard mode: based on total typed length
  const progress = useMemo(() => {
    if (!targetText.length) return 0;
    if (mode === "race") {
      return (consecutiveCorrect / targetText.length) * 100;
    }
    return (typedText.length / targetText.length) * 100;
  }, [typedText.length, targetText.length, mode, consecutiveCorrect]);

  // Build full stats object
  const fullStats: TypingStats = useMemo(() => ({
    wpm: Math.round(wpm) || 0,
    rawWpm: Math.round(rawWpm) || 0,
    accuracy: Math.round(accuracy * 10) / 10,
    progress,
    correctChars: stats.correct,
    incorrectChars: stats.incorrect,
    missedChars: stats.missed,
    extraChars: stats.extra,
    typedLength: typedText.length,
    totalLength: targetText.length,
    elapsedMs,
    isFinished,
  }), [wpm, rawWpm, accuracy, progress, stats, typedText.length, targetText.length, elapsedMs, isFinished]);

  // --- Effects ---

  // Update external state on progress
  useEffect(() => {
    onProgress?.(fullStats);
  }, [fullStats, onProgress]);

  // Timer
  useEffect(() => {
    if (!isRunning || isFinished) return;

    const interval = setInterval(() => {
      if (startTime) {
        setElapsedMs(Date.now() - startTime);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, isFinished, startTime]);

  // Handle finish
  useEffect(() => {
    if (isFinished && isRunning) {
      setIsRunning(false);
      onFinish?.(fullStats);
    }
  }, [isFinished, isRunning, fullStats, onFinish]);

  // Reset when targetText changes
  useEffect(() => {
    setTypedText(initialTypedText);
    setIsRunning(false);
    setStartTime(null);
    setElapsedMs(0);
    setScrollOffset(0);
    setTapeOffset(0);
  }, [targetText, initialTypedText]);

  // Auto focus
  useEffect(() => {
    if (autoFocus && isActive) {
      inputRef.current?.focus();
    }
  }, [autoFocus, isActive]);

  // Scroll handling for standard mode
  useLayoutEffect(() => {
    if (mode !== "standard" || feedingTape) return;
    if (!containerRef.current || !activeWordRef.current) return;

    const container = containerRef.current;
    const activeWord = activeWordRef.current;
    const containerRect = container.getBoundingClientRect();
    const wordRect = activeWord.getBoundingClientRect();

    const relativeTop = wordRect.top - containerRect.top;
    const lineHeight = parseFloat(getComputedStyle(container).lineHeight || "0");

    const targetTop = visibleLines === 1 ? 0 : lineHeight;
    const diff = relativeTop - targetTop;

    if (Math.abs(diff) > 10) {
      setScrollOffset((prev) => Math.max(0, prev + diff));
    }
  }, [typedText, fontSize, visibleLines, mode, feedingTape]);

  // Scroll handling for feeding tape mode - keep cursor centered
  // The tape starts with the cursor at the center and text scrolls LEFT through it
  useLayoutEffect(() => {
    if (!feedingTape || !tapeContentRef.current || !cursorRef.current) return;

    const content = tapeContentRef.current;
    const cursor = cursorRef.current;
    const container = content.parentElement;
    if (!container) return;

    // Get the character span that contains the cursor
    const charSpan = cursor.parentElement;
    if (!charSpan) return;

    // Use getBoundingClientRect for positions
    const contentRect = content.getBoundingClientRect();
    const charRect = charSpan.getBoundingClientRect();
    
    // Content has paddingLeft: 50% of container width
    const paddingLeft = container.clientWidth / 2;
    
    // The cursor's distance from where text begins (after the 50% padding).
    // The transform (-tapeOffset) is already applied to both content and char,
    // so it cancels out in the subtraction.
    // charRect.left - contentRect.left gives us: paddingLeft + charPositionInText - tapeOffset + tapeOffset
    // Wait no, the transform applies to both equally, so:
    // charRect.left = contentLeftBeforeTransform - tapeOffset + paddingLeft + charPositionInText
    // contentRect.left = contentLeftBeforeTransform - tapeOffset
    // charRect.left - contentRect.left = paddingLeft + charPositionInText
    const charPositionWithPadding = charRect.left - contentRect.left;
    const charPositionInText = charPositionWithPadding - paddingLeft;
    
    // Set tapeOffset to this position so the cursor stays at the center (the padding mark)
    setTapeOffset(Math.max(0, charPositionInText));
  }, [typedText, feedingTape]);

  // --- Handlers ---

  const handleInput = useCallback((value: string) => {
    if (isFinished) return;
    if (!isActive) return;

    // Prevent typing more than target text
    if (value.length > targetText.length) {
      value = value.slice(0, targetText.length);
    }

    if (!isRunning) {
      setIsRunning(true);
      setStartTime(Date.now());
      onStart?.();
    }

    setTypedText(value);
  }, [isFinished, isActive, isRunning, targetText.length, onStart]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent default tab behavior
    if (e.key === "Tab") {
      e.preventDefault();
      // Could trigger restart if needed
    }
    // Prevent pasting
    if ((e.ctrlKey || e.metaKey) && e.key === "v") {
      e.preventDefault();
    }
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  // --- Render Character ---
  const renderCharacter = useCallback((
    char: string,
    charIdx: number,
    wordStartIndex: number,
    typedWord: string,
    isPastWord: boolean,
    isCurrentWord: boolean,
  ) => {
    const globalCharIndex = wordStartIndex + charIdx;
    const typedChar = typedWord[charIdx];
    const isTyped = typedChar !== undefined;
    const isCorrect = typedChar === char;
    const isCursor = isCurrentWord && charIdx === typedWord.length;

    let charColor = theme.defaultText;
    if (!isTyped) {
      if (isPastWord) charColor = theme.incorrectText;
      else if (isCursor) charColor = theme.upcomingText;
    } else {
      charColor = isCorrect ? theme.correctText : theme.incorrectText;
    }

    return (
      <span key={`${globalCharIndex}-${charIdx}`} className="relative" style={{ color: charColor }}>
        {char}
        {isCursor && (
          <span
            className="absolute left-0 top-0 h-full w-0.5 animate-pulse"
            style={{ backgroundColor: theme.cursor }}
          />
        )}
      </span>
    );
  }, [theme]);

  // --- Render Standard Mode ---
  const renderStandardMode = () => {
    const wordsArray = targetText.split(" ");
    const typedWords = typedText.split(" ");
    const currentWordIndex = typedWords.length - 1;

    return wordsArray.reduce<{ nodes: React.ReactNode[]; currentIndex: number }>(
      (acc, word, wordIdx) => {
        const wordStartIndex = acc.currentIndex;
        const typedWord = typedWords[wordIdx] || "";
        const isCurrentWord = wordIdx === currentWordIndex;
        const isPastWord = wordIdx < currentWordIndex;

        const wordNode = (
          <span
            key={wordIdx}
            ref={isCurrentWord ? activeWordRef : null}
            className="inline-block mr-[0.5em] relative"
          >
            {word.split("").map((char, charIdx) =>
              renderCharacter(char, charIdx, wordStartIndex, typedWord, isPastWord, isCurrentWord)
            )}
            {/* Extra characters beyond the word */}
            {(isCurrentWord || isPastWord) && typedWord.length > word.length && (
              <span style={{ color: theme.incorrectText }}>{typedWord.slice(word.length)}</span>
            )}
            {/* Cursor at end of word */}
            {isCurrentWord && typedWord.length === word.length && (
              <span className="relative">
                <span
                  className="absolute left-0 top-0 h-full w-0.5 animate-pulse"
                  style={{ backgroundColor: theme.cursor }}
                />
              </span>
            )}
          </span>
        );

        acc.nodes.push(wordNode);
        // Insert line break after maxWordsPerLine
        if ((wordIdx + 1) % maxWordsPerLine === 0 && wordIdx < wordsArray.length - 1) {
          acc.nodes.push(<br key={`br-${wordIdx}`} />);
        }
        acc.currentIndex += word.length + 1;
        return acc;
      },
      { nodes: [], currentIndex: 0 }
    ).nodes;
  };

  // --- Render Feeding Tape Mode (cursor-centered) ---
  const renderFeedingTapeMode = () => {
    const wordsArray = targetText.split(" ");
    const typedWords = typedText.split(" ");
    const currentWordIndex = typedWords.length - 1;

    return wordsArray.map((word, wordIdx) => {
      const wordStartIndex = wordsArray.slice(0, wordIdx).reduce((sum, w) => sum + w.length + 1, 0);
      const typedWord = typedWords[wordIdx] || "";
      const isCurrentWord = wordIdx === currentWordIndex;
      const isPastWord = wordIdx < currentWordIndex;

      return (
        <span
          key={wordIdx}
          ref={isCurrentWord ? activeWordRef : null}
          className={`inline-block mr-[0.75em] transition-opacity duration-200 ${
            isPastWord ? "opacity-40" : "opacity-100"
          }`}
        >
          {word.split("").map((char, charIdx) => {
            const globalCharIndex = wordStartIndex + charIdx;
            const typedChar = typedWord[charIdx];
            const isTyped = typedChar !== undefined;
            const isCorrect = typedChar === char;
            const isCursor = isCurrentWord && charIdx === typedWord.length;

            let charColor = theme.defaultText;
            if (!isTyped) {
              if (isPastWord) charColor = theme.incorrectText;
              else if (isCursor) charColor = theme.upcomingText;
            } else {
              charColor = isCorrect ? theme.correctText : theme.incorrectText;
            }

            return (
              <span key={`${globalCharIndex}-${charIdx}`} className="relative" style={{ color: charColor }}>
                {char}
                {isCursor && (
                  <span
                    ref={cursorRef}
                    className="absolute left-0 top-0 h-full w-0.5 animate-pulse"
                    style={{ backgroundColor: theme.cursor }}
                  />
                )}
              </span>
            );
          })}
          {/* Extra characters beyond the word */}
          {(isCurrentWord || isPastWord) && typedWord.length > word.length && (
            <span style={{ color: theme.incorrectText }}>{typedWord.slice(word.length)}</span>
          )}
          {/* Cursor at end of word (after all characters typed) */}
          {isCurrentWord && typedWord.length === word.length && (
            <span className="relative">
              <span
                ref={cursorRef}
                className="absolute left-0 top-0 h-full w-0.5 animate-pulse"
                style={{ backgroundColor: theme.cursor }}
              />
            </span>
          )}
        </span>
      );
    });
  };

  // --- Main Render ---
  const containerHeight = `${visibleLines * fontSize * LINE_HEIGHT}rem`;

  return (
    <div
      className={`relative w-full ${className}`}
      onClick={handleContainerClick}
      style={{ cursor: "text" }}
    >
      {/* Hidden input for capturing keyboard events */}
      <input
        ref={inputRef}
        type="text"
        className="absolute opacity-0 pointer-events-none"
        style={{ position: "absolute", left: "-9999px" }}
        value={typedText}
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
        disabled={!isActive || isFinished}
      />

      {/* Inline Stats */}
      {showStats && isRunning && (
        <div
          className="flex items-center justify-center gap-6 mb-4 text-sm font-medium"
          style={{ color: theme.textSecondary }}
        >
          <span>
            <span style={{ color: theme.textPrimary }}>{Math.round(wpm)}</span> WPM
          </span>
          <span>
            <span style={{ color: theme.textPrimary }}>{Math.round(accuracy)}%</span> ACC
          </span>
        </div>
      )}

      {/* Typing Display */}
      {feedingTape ? (
        // Feeding Tape Mode - cursor always centered horizontally and vertically
        // The tape has 50% padding on left/right so cursor starts and ends in center
        <div
          className="h-full flex items-center overflow-hidden relative"
          ref={tapeContainerRef}
        >
          <div
            ref={tapeContentRef}
            className="whitespace-nowrap transition-transform duration-100 ease-out relative"
            style={{
              fontSize: `${fontSize}rem`,
              lineHeight: LINE_HEIGHT,
              transform: `translateX(-${tapeOffset}px)`,
              // 50% padding ensures cursor can be centered at start and end
              paddingLeft: "50%",
              paddingRight: "50%",
            }}
          >
            {renderFeedingTapeMode()}
          </div>
          {/* Fade edges for visual polish */}
          <div
            className="absolute inset-y-0 left-0 w-24 pointer-events-none z-10"
            style={{
              background: `linear-gradient(to right, ${theme.surfaceColor}, transparent)`,
            }}
          />
          <div
            className="absolute inset-y-0 right-0 w-24 pointer-events-none z-10"
            style={{
              background: `linear-gradient(to left, ${theme.surfaceColor}, transparent)`,
            }}
          />
          {/* Center line indicator (the fixed cursor position) */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 pointer-events-none z-0"
            style={{
              height: `${fontSize * 1.2}rem`,
              backgroundColor: `${theme.cursor}20`,
            }}
          />
        </div>
      ) : (
        // Standard Mode - vertical scroll
        <div
          ref={containerRef}
          className="overflow-hidden relative"
          style={{
            fontSize: `${fontSize}rem`,
            lineHeight: LINE_HEIGHT,
            height: containerHeight,
            textAlign,
          }}
        >
          <div
            className="transition-transform duration-100"
            style={{ transform: `translateY(-${scrollOffset}px)` }}
          >
            {renderStandardMode()}
          </div>

          {/* Focus indicator overlay */}
          {!isFocused && isActive && !isFinished && (
            <div
              className="absolute inset-0 flex items-center justify-center backdrop-blur-sm cursor-pointer"
              style={{ backgroundColor: `${theme.backgroundColor}80` }}
            >
              <p
                className="text-lg font-medium"
                style={{ color: theme.textSecondary }}
              >
                Click to focus
              </p>
            </div>
          )}
        </div>
      )}

      {/* Progress bar for race mode */}
      {mode === "race" && (
        <div
          className="mt-4 h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: theme.surfaceColor }}
        >
          <div
            className="h-full transition-all duration-100 rounded-full"
            style={{
              width: `${progress}%`,
              backgroundColor: theme.accentColor,
            }}
          />
        </div>
      )}
    </div>
  );
}
