import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import type { SettingsState } from "@/lib/typing-constants";
import { tv } from "@/lib/theme-vars";

const CUSTOM_WORD_MIN = 1;
const CUSTOM_WORD_MAX = 9999;
const CUSTOM_DURATION_MAX_HOURS = 6;
const DIAL_ROW_HEIGHT = 42;
const DIAL_VISIBLE_ROWS = 5;
const DIAL_PADDING_ROWS = Math.floor(DIAL_VISIBLE_ROWS / 2);
const DIAL_VIEWPORT_HEIGHT = DIAL_ROW_HEIGHT * DIAL_VISIBLE_ROWS;
const DIAL_SPACER_HEIGHT = DIAL_ROW_HEIGHT * DIAL_PADDING_ROWS;
const clampNumber = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const durationToDialValues = (totalSeconds: number) => {
  const clampedSeconds = clampNumber(Math.round(totalSeconds), 0, CUSTOM_DURATION_MAX_HOURS * 3600 + 59 * 60 + 59);

  return {
    hours: Math.floor(clampedSeconds / 3600),
    minutes: Math.floor((clampedSeconds % 3600) / 60),
    seconds: clampedSeconds % 60,
  };
};

type WordDigits = {
  thousands: number;
  hundreds: number;
  tens: number;
  ones: number;
};

const wordTargetToDigits = (target: number): WordDigits => {
  const clampedTarget = clampNumber(Math.round(target), CUSTOM_WORD_MIN, CUSTOM_WORD_MAX);
  const [thousands, hundreds, tens, ones] = clampedTarget
    .toString()
    .padStart(4, "0")
    .split("")
    .map((digit) => Number(digit));

  return {
    thousands,
    hundreds,
    tens,
    ones,
  };
};

const digitsToWordTarget = (digits: WordDigits) => {
  return digits.thousands * 1000 + digits.hundreds * 100 + digits.tens * 10 + digits.ones;
};

type NumberDialProps = {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
};

function NumberDial({ label, min, max, value, onChange }: NumberDialProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isSyncingRef = useRef(false);
  const options = useMemo(() => Array.from({ length: max - min + 1 }, (_, index) => min + index), [max, min]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const targetTop = (value - min) * DIAL_ROW_HEIGHT;
    isSyncingRef.current = true;
    scroller.scrollTo({ top: targetTop, behavior: "auto" });

    const frame = requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });

    return () => cancelAnimationFrame(frame);
  }, [min, value]);

  const adjustValue = useCallback(
    (delta: number) => {
      onChange(clampNumber(value + delta, min, max));
    },
    [max, min, onChange, value],
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => adjustValue(-1)}
        className="rounded-full p-1 transition-opacity hover:opacity-80"
        style={{ color: tv.ui.mutedForeground, backgroundColor: tv.bg.base }}
        aria-label={`${label} up`}
      >
        <ChevronUp className="h-4 w-4" />
      </button>

      <div
        className="relative w-20 overflow-hidden rounded-xl border"
        style={{
          height: `${DIAL_VIEWPORT_HEIGHT}px`,
          borderColor: tv.border.subtle,
          backgroundColor: tv.bg.base,
        }}
      >
        <div
          ref={scrollRef}
          className="h-full snap-y snap-mandatory overflow-y-auto"
          role="spinbutton"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              adjustValue(event.key === "ArrowUp" ? 1 : -1);
            }
            if (event.key === "Home" || event.key === "End") {
              event.preventDefault();
              onChange(event.key === "Home" ? min : max);
            }
          }}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          onScroll={(event) => {
            if (isSyncingRef.current) return;
            const nextIndex = Math.round(event.currentTarget.scrollTop / DIAL_ROW_HEIGHT);
            const nextValue = clampNumber(min + nextIndex, min, max);
            if (nextValue !== value) {
              onChange(nextValue);
            }
          }}
        >
          <div style={{ height: `${DIAL_SPACER_HEIGHT}px` }} />

          {options.map((optionValue) => {
            const distance = Math.abs(optionValue - value);
            const opacity = distance === 0 ? 1 : distance === 1 ? 0.75 : distance === 2 ? 0.45 : 0.2;

            return (
              <div
                key={optionValue}
                className="snap-center text-center tabular-nums leading-none"
                style={{
                  height: `${DIAL_ROW_HEIGHT}px`,
                  lineHeight: `${DIAL_ROW_HEIGHT}px`,
                  fontSize: distance === 0 ? "1.6rem" : "1.2rem",
                  fontWeight: distance === 0 ? 700 : 500,
                  color: distance === 0 ? tv.ui.primary : tv.ui.mutedForeground,
                  opacity,
                }}
              >
                {optionValue.toString().padStart(2, "0")}
              </div>
            );
          })}

          <div style={{ height: `${DIAL_SPACER_HEIGHT}px` }} />
        </div>

        <div
          className="pointer-events-none absolute inset-x-1 top-1/2 -translate-y-1/2 rounded-lg border"
          style={{
            height: `${DIAL_ROW_HEIGHT}px`,
            borderColor: tv.ui.primary,
            backgroundColor: tv.bg.elevated,
            opacity: 0.75,
          }}
        />

        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: `${DIAL_SPACER_HEIGHT}px`,
            background: `linear-gradient(to bottom, ${tv.bg.base}, transparent)`,
          }}
        />

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{
            height: `${DIAL_SPACER_HEIGHT}px`,
            background: `linear-gradient(to top, ${tv.bg.base}, transparent)`,
          }}
        />
      </div>

      <button
        type="button"
        onClick={() => adjustValue(1)}
        className="rounded-full p-1 transition-opacity hover:opacity-80"
        style={{ color: tv.ui.mutedForeground, backgroundColor: tv.bg.base }}
        aria-label={`${label} down`}
      >
        <ChevronDown className="h-4 w-4" />
      </button>

      <span className="text-xs uppercase tracking-wide" style={{ color: tv.ui.mutedForeground }}>
        {label}
      </span>
    </div>
  );
}

interface PracticeCountDialogProps {
  settings: SettingsState;
  setShowCustomCountModal: (show: boolean) => void;
  onApply: (value: number) => void;
}

export default function PracticeCountDialog({ settings, setShowCustomCountModal, onApply }: PracticeCountDialogProps) {
  const [customDuration, setCustomDuration] = useState(() => durationToDialValues(settings.duration));
  const [customWordDigits, setCustomWordDigits] = useState<WordDigits>(() => wordTargetToDigits(settings.wordTarget));
  const customDurationSeconds = customDuration.hours * 3600 + customDuration.minutes * 60 + customDuration.seconds;
  const formattedCustomDuration = `${customDuration.hours.toString().padStart(2, "0")}:${customDuration.minutes
    .toString()
    .padStart(2, "0")}:${customDuration.seconds.toString().padStart(2, "0")}`;
  const customWordValue = digitsToWordTarget(customWordDigits);
  const formattedCustomWordValue = customWordValue.toString().padStart(4, "0");
  const applyCustomCount = () => {
    const value = settings.mode === "time" ? customDurationSeconds : customWordValue;
    if (value <= 0) {
      toast.error(settings.mode === "time" ? "Set at least 1 second." : "Set at least 1 word.");
      return;
    }
    onApply(settings.mode === "words" ? clampNumber(value, CUSTOM_WORD_MIN, CUSTOM_WORD_MAX) : value);
    setShowCustomCountModal(false);
  };

  return (
    <Dialog
      open={settings.mode === "time" || settings.mode === "words"}
      onOpenChange={(open) => {
        if (!open) setShowCustomCountModal(false);
      }}
    >
      <DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <DialogTitle>{settings.mode === "time" ? "Custom Duration" : "Custom Word Count"}</DialogTitle>
            <DialogDescription className="mt-1">
              {settings.mode === "time"
                ? "Scroll each dial or use arrows to set hours, minutes, and seconds."
                : "Scroll each dial or use arrows to set a word count from 0001 to 9999."}
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={() => setShowCustomCountModal(false)}
            className="rounded-md px-2 py-1 text-sm transition-opacity hover:opacity-80"
            style={{ color: tv.ui.mutedForeground }}
            aria-label="Close custom selector"
          >
            ✕
          </button>
        </div>

        {settings.mode === "time" ? (
          <div className="space-y-5">
            <div className="text-center" style={{ color: tv.ui.mutedForeground }}>
              <span className="text-base sm:text-lg">Selected:</span>{" "}
              <span className="text-2xl sm:text-3xl font-semibold tabular-nums" style={{ color: tv.ui.primary }}>
                {formattedCustomDuration}
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-3 sm:gap-6">
              <NumberDial
                label="hours"
                min={0}
                max={CUSTOM_DURATION_MAX_HOURS}
                value={customDuration.hours}
                onChange={(hours) =>
                  setCustomDuration((prev) => ({
                    ...prev,
                    hours,
                  }))
                }
              />
              <NumberDial
                label="minutes"
                min={0}
                max={59}
                value={customDuration.minutes}
                onChange={(minutes) =>
                  setCustomDuration((prev) => ({
                    ...prev,
                    minutes,
                  }))
                }
              />
              <NumberDial
                label="seconds"
                min={0}
                max={59}
                value={customDuration.seconds}
                onChange={(seconds) =>
                  setCustomDuration((prev) => ({
                    ...prev,
                    seconds,
                  }))
                }
              />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="text-center" style={{ color: tv.ui.mutedForeground }}>
              <span className="text-base sm:text-lg">Selected:</span>{" "}
              <span className="text-2xl sm:text-3xl font-semibold tabular-nums" style={{ color: tv.ui.primary }}>
                {formattedCustomWordValue}
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-3 sm:gap-6">
              <NumberDial
                label="thousands"
                min={0}
                max={9}
                value={customWordDigits.thousands}
                onChange={(thousands) =>
                  setCustomWordDigits((prev) => ({
                    ...prev,
                    thousands,
                  }))
                }
              />
              <NumberDial
                label="hundreds"
                min={0}
                max={9}
                value={customWordDigits.hundreds}
                onChange={(hundreds) =>
                  setCustomWordDigits((prev) => ({
                    ...prev,
                    hundreds,
                  }))
                }
              />
              <NumberDial
                label="tens"
                min={0}
                max={9}
                value={customWordDigits.tens}
                onChange={(tens) =>
                  setCustomWordDigits((prev) => ({
                    ...prev,
                    tens,
                  }))
                }
              />
              <NumberDial
                label="ones"
                min={0}
                max={9}
                value={customWordDigits.ones}
                onChange={(ones) =>
                  setCustomWordDigits((prev) => ({
                    ...prev,
                    ones,
                  }))
                }
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowCustomCountModal(false)}
            className="rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={{
              color: tv.ui.mutedForeground,
              backgroundColor: tv.bg.base,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={applyCustomCount}
            disabled={
              (settings.mode === "time" && customDurationSeconds <= 0) ||
              (settings.mode === "words" && customWordValue <= 0)
            }
            className="rounded-md px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: tv.ui.primary }}
          >
            Set {settings.mode === "time" ? "Duration" : "Word Count"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
