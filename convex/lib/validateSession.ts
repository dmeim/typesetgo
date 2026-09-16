import { hasCompletedPrompt } from "./soloCompletion";
import {
  MAX_CHARS_PER_SECOND,
  MAX_WPM,
  MIN_PROGRESS_EVENTS,
  getTimeModeTolerance,
} from "./antiCheatConstants";

export interface SessionValidationInput {
  mode: string;
  duration?: number;
  wordTarget?: number;
  targetText: string;
  eventCount: number;
  maxCharsPerSecond: number;
}

export interface ValidationResult {
  isValid: boolean;
  invalidReason: string | undefined;
}

/**
 * Solo anti-cheat validation.
 * - Time mode requires MIN_PROGRESS_EVENTS (do not skip heartbeats).
 * - Burst is time-scaled CPS already stored on the session (25 cps = 300 WPM).
 * - Zen: WPM cap + burst + min events only.
 * - 170–200 WPM is valid. Hard cap is 300 (rounded).
 */
export function validateTypingSession(
  session: SessionValidationInput,
  args: {
    serverElapsedMs: number;
    computedWpm: number;
    typedText: string;
  }
): ValidationResult {
  const reasons: string[] = [];
  const { mode, duration, wordTarget } = session;
  const roundedWpm = Math.round(args.computedWpm);
  const isZen = mode === "zen";

  if (session.eventCount < MIN_PROGRESS_EVENTS) {
    reasons.push(
      `Too few progress events: ${session.eventCount} < ${MIN_PROGRESS_EVENTS}`
    );
  }

  if (roundedWpm > MAX_WPM) {
    reasons.push(`WPM exceeds maximum: ${roundedWpm} > ${MAX_WPM}`);
  }

  if (session.maxCharsPerSecond > MAX_CHARS_PER_SECOND) {
    reasons.push(
      `Burst CPS exceeded: ${session.maxCharsPerSecond.toFixed(1)} > ${MAX_CHARS_PER_SECOND}`
    );
  }

  if (isZen) {
    return {
      isValid: reasons.length === 0,
      invalidReason: reasons.length > 0 ? reasons.join("; ") : undefined,
    };
  }

  if (mode === "time" && duration) {
    const expectedMs = duration * 1000;
    const toleranceMs = getTimeModeTolerance(duration) * 1000;
    if (args.serverElapsedMs < expectedMs - toleranceMs) {
      reasons.push(
        `Time mode completed too fast: ${args.serverElapsedMs}ms < ${expectedMs - toleranceMs}ms`
      );
    }
  }

  if (mode === "words" && wordTarget) {
    const wordCount = args.typedText.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < wordTarget) {
      reasons.push(`Word count insufficient: ${wordCount} < ${wordTarget}`);
    }
  }

  if (
    (mode === "quote" || mode === "preset") &&
    !hasCompletedPrompt(args.typedText, session.targetText)
  ) {
    reasons.push(
      "Text incomplete: final word has not been completed"
    );
  }

  return {
    isValid: reasons.length === 0,
    invalidReason: reasons.length > 0 ? reasons.join("; ") : undefined,
  };
}
