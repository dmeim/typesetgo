import { TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { computeStats, sanitizeTypingInput, getInputPosition, getNextTypingKey,
  hasCompletedPrompt, placeCaretAtEnd, constrainEditingKey } from "./practice-input";
import PracticeText from "./PracticeText";
import { useTypingScroll } from "./useTypingScroll";
import { usePracticeClock } from "./usePracticeClock";
import { useTheme } from "@/hooks/useTheme";
import { tv } from "@/lib/theme-vars";
import { getTypingFontFamily } from "@/lib/typing-fonts";
import { DEFAULT_SETTINGS, loadSettings } from "@/lib/storage-utils";
import type { KeyboardLayoutId } from "@/lib/keyboard-layouts";
import OnScreenKeyboard from "@/components/typing/keyboard/OnScreenKeyboard";

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
  typedText: string;
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
  /** Initial input restored once on mount; use a React key for a new run. */
  initialInput?: string;
  /** Active time restored with initial input; stopped room time is excluded. */
  initialElapsedMs?: number;
  /** Backward-compatible alias for initialInput, also applied only on mount. */
  initialTypedText?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Custom class name for container */
  className?: string;
  /** Text alignment */
  textAlign?: "left" | "center" | "right";
  /** Font family key from typing-fonts (reads from localStorage if not provided) */
  typingFontFamily?: string;
  /** Show on-screen keyboard below typing area */
  showOnScreenKeyboard?: boolean;
  /** Keyboard layout to use */
  keyboardLayout?: KeyboardLayoutId;
}

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
  initialInput,
  initialElapsedMs = 0,
  autoFocus = true,
  className = "",
  textAlign = "left",
  typingFontFamily: typingFontFamilyProp,
  showOnScreenKeyboard: showOnScreenKeyboardProp,
  keyboardLayout: keyboardLayoutProp,
}: TypingAreaProps) {
  // Theme
  const { colors } = useTheme();

  const { resolvedFontFamily, showOnScreenKeyboard, keyboardLayout } = useMemo(() => {
    const stored = loadSettings();
    return {
      resolvedFontFamily: getTypingFontFamily(typingFontFamilyProp ?? stored?.typingFontFamily),
      showOnScreenKeyboard: showOnScreenKeyboardProp
        ?? stored?.showOnScreenKeyboard ?? DEFAULT_SETTINGS.showOnScreenKeyboard,
      keyboardLayout: keyboardLayoutProp ?? stored?.keyboardLayout ?? DEFAULT_SETTINGS.keyboardLayout,
    };
  }, [typingFontFamilyProp, showOnScreenKeyboardProp, keyboardLayoutProp]);

  // State
  const [typedText, setTypedText] = useState(() => sanitizeTypingInput(initialInput ?? initialTypedText));
  const [isRunning, setIsRunning] = useState(() => Boolean(initialInput ?? initialTypedText) || initialElapsedMs > 0);
  const { elapsedMs, resetClock } = usePracticeClock(isRunning && isActive, Math.max(0, initialElapsedMs));
  const [isFocused, setIsFocused] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const activeKeyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Refs
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const composingRef = useRef(false);
  const [compositionDraft, setCompositionDraft] = useState<string | null>(null);
  const tapeContainerRef = useRef<HTMLDivElement | null>(null);
  const tapeContentRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLSpanElement | null>(null);

  const callbacksRef = useRef({ onProgress, onStart, onFinish });
  useLayoutEffect(() => {
    callbacksRef.current = { onProgress, onStart, onFinish };
  }, [onProgress, onStart, onFinish]);
  const finishNotifiedRef = useRef(false);
  const previousTargetRef = useRef(targetText);
  const scrollOffset = useTypingScroll({ viewportRef: feedingTape ? tapeContainerRef : containerRef,
    contentRef: feedingTape ? tapeContentRef : contentRef, caretRef: cursorRef, visibleLines, feedingTape,
    layoutKey: JSON.stringify([typedText, compositionDraft, targetText, resolvedFontFamily, fontSize, maxWordsPerLine, textAlign]) });

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
  // Standard completion follows the final reference word.
  const isFinished = useMemo(() => {
    if (!targetText) return false;
    if (mode === "race") {
      // Race mode: all characters must be typed correctly
      return consecutiveCorrect >= targetText.length;
    }
    return hasCompletedPrompt(typedText, targetText);
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
  // Standard progress uses word-aligned reference position.
  const progress = useMemo(() => {
    if (!targetText.length) return 0;
    if (mode === "race") {
      return (consecutiveCorrect / targetText.length) * 100;
    }
    return getInputPosition(typedText, targetText).referencePosition / targetText.length * 100;
  }, [typedText, targetText, mode, consecutiveCorrect]);

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
    typedText,
    totalLength: targetText.length,
    elapsedMs,
    isFinished,
  }), [wpm, rawWpm, accuracy, progress, stats, typedText, targetText.length, elapsedMs, isFinished]);

  // --- Effects ---

  // Callback identity alone is not a progress event, and stopped rooms emit no progress.
  useEffect(() => {
    if (isActive && previousTargetRef.current === targetText) callbacksRef.current.onProgress?.(fullStats);
  }, [fullStats, isActive, targetText]);

  useEffect(() => {
    if (isActive && previousTargetRef.current === targetText && isFinished && isRunning && !finishNotifiedRef.current) {
      finishNotifiedRef.current = true;
      setIsRunning(false);
      callbacksRef.current.onFinish?.(fullStats);
    }
  }, [isFinished, isRunning, fullStats, isActive, targetText]);

  useEffect(() => {
    if (previousTargetRef.current === targetText) return;
    previousTargetRef.current = targetText;
    composingRef.current = false;
    setCompositionDraft(null);
    setTypedText("");
    setIsRunning(false);
    resetClock();
    finishNotifiedRef.current = false;
  }, [targetText, resetClock]);

  // Auto focus
  useEffect(() => {
    if (autoFocus && isActive) {
      inputRef.current?.focus();
    }
  }, [autoFocus, isActive]);

  // --- Handlers ---
  const handleInput = useCallback((value: string) => {
    if (isFinished || !isActive || !targetText) return;
    const sanitized = sanitizeTypingInput(value);
    // Race progress requires correcting a mistake before continuing; Backspace remains available.
    if (mode === "race" && !targetText.startsWith(typedText) && sanitized.length > typedText.length) return;
    if (!isRunning) {
      setIsRunning(true);
      callbacksRef.current.onStart?.();
    }
    setTypedText(sanitized);
  }, [isFinished, isActive, targetText, mode, typedText, isRunning]);

  const nextChar = isFinished ? null : getNextTypingKey(typedText, targetText, mode === "race");

  useEffect(() => {
    const handleKeyEvent = (e: KeyboardEvent) => {
      setCapsLockOn(e.getModifierState("CapsLock"));
      if (e.type === "keydown" && (e.key.length === 1 || e.key === "Backspace")) {
        setActiveKey(e.key);
        clearTimeout(activeKeyTimeoutRef.current);
        activeKeyTimeoutRef.current = setTimeout(() => setActiveKey(null), 150);
      }
    };
    window.addEventListener("keydown", handleKeyEvent);
    window.addEventListener("keyup", handleKeyEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyEvent);
      window.removeEventListener("keyup", handleKeyEvent);
      clearTimeout(activeKeyTimeoutRef.current);
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (composingRef.current) return;
    constrainEditingKey(event);
  };

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => { setIsFocused(true); placeCaretAtEnd(event.currentTarget); };
  const handleBlur = () => setIsFocused(false);

  const handleContainerClick = () => {
    inputRef.current?.focus();
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
        value={compositionDraft ?? typedText}
        aria-label="Typing practice"
        aria-description="Type at the end. Use Backspace to correct mistakes. Tab moves to the next control."
        onChange={(event) => { if (composingRef.current) setCompositionDraft(event.target.value); else handleInput(event.target.value); }}
        onCompositionStart={(event) => { composingRef.current = true; setCompositionDraft(event.currentTarget.value); }}
        onCompositionEnd={(event) => { composingRef.current = false; setCompositionDraft(null); handleInput(event.currentTarget.value); placeCaretAtEnd(event.currentTarget); }}
        onSelect={(event) => { if (!composingRef.current) placeCaretAtEnd(event.currentTarget); }}
        onPaste={(event) => event.preventDefault()}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
        disabled={!isActive || isFinished || !targetText}
      />

      {/* Inline Stats */}
      {showStats && isRunning && (
        <div
          className="flex items-center justify-center gap-6 mb-4 text-sm font-medium"
          style={{ color: tv.text.secondary }}
        >
          <span>
            <span style={{ color: tv.text.primary }}>{Math.round(wpm)}</span> WPM
          </span>
          <span>
            <span style={{ color: tv.text.primary }}>{Math.round(accuracy)}%</span> ACC
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
            className="whitespace-nowrap motion-safe:transition-transform motion-safe:duration-100 ease-out relative"
            style={{
              fontSize: `${fontSize}rem`,
              fontFamily: resolvedFontFamily,
              lineHeight: LINE_HEIGHT,
              transform: `translateX(-${scrollOffset}px)`,
              // 50% padding ensures cursor can be centered at start and end
              paddingLeft: "50%",
              paddingRight: "50%",
            }}
          >
            <PracticeText targetText={targetText} typedText={compositionDraft ?? typedText} caretRef={cursorRef} feedingTape />
          </div>
          {/* Fade edges for visual polish */}
          <div
            className="absolute inset-y-0 left-0 w-24 pointer-events-none z-10"
            style={{
              background: `linear-gradient(to right, ${colors.bg.surface}, transparent)`,
            }}
          />
          <div
            className="absolute inset-y-0 right-0 w-24 pointer-events-none z-10"
            style={{
              background: `linear-gradient(to left, ${colors.bg.surface}, transparent)`,
            }}
          />
          {/* Center line indicator (the fixed cursor position) */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 pointer-events-none z-0"
            style={{
              height: `${fontSize * 1.2}rem`,
              backgroundColor: `${colors.typing.cursor}20`,
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
            fontFamily: resolvedFontFamily,
            lineHeight: LINE_HEIGHT,
            height: containerHeight,
            textAlign,
          }}
        >
          <div
            ref={contentRef}
            className="relative motion-safe:transition-transform motion-safe:duration-100"
            style={{ transform: `translateY(-${scrollOffset}px)` }}
          >
            <PracticeText targetText={targetText} typedText={compositionDraft ?? typedText} caretRef={cursorRef} maxWordsPerLine={maxWordsPerLine} />
          </div>

          {/* Focus indicator overlay */}
          {!isFocused && isActive && !isFinished && (
            <div
              className="absolute inset-0 flex items-center justify-center backdrop-blur-sm cursor-pointer"
              style={{ backgroundColor: `${colors.bg.base}80` }}
            >
              <p
                className="text-lg font-medium"
                style={{ color: tv.text.secondary }}
              >
                Click to focus
              </p>
            </div>
          )}
        </div>
      )}

      {capsLockOn && !showOnScreenKeyboard && (
        <div
          className="mt-3 flex items-center justify-center gap-2 text-lg font-medium"
          style={{ color: tv.status.warning.DEFAULT }}
        >
          <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
          <span>CAPS Lock is ON</span>
        </div>
      )}

      {showOnScreenKeyboard && (
        <OnScreenKeyboard
          nextChar={nextChar}
          capsLockOn={capsLockOn}
          layoutId={keyboardLayout}
          activeKey={activeKey}
          visible={isFocused}
        />
      )}

      {/* Progress bar for race mode */}
      {mode === "race" && (
        <div
          className="mt-4 h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: tv.bg.surface }}
        >
          <div
            className="h-full transition-all duration-100 rounded-full"
            style={{
              width: `${progress}%`,
              backgroundColor: tv.interactive.accent.DEFAULT,
            }}
          />
        </div>
      )}
    </div>
  );
}
