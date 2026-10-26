import { motion } from "framer-motion";
import { RollingNumber } from "@/components/ui/rolling-number";
import { useSampledValue } from "@/hooks/useSampledValue";
import type { SettingsState } from "@/lib/typing-constants";
import { isTimedPractice } from "./practice-input";

const READOUT_INTERVAL_MS = 500;

interface PracticeLiveStatsProps {
  settings: SettingsState;
  isKidMode: boolean;
  wpm: number;
  accuracy: number;
  elapsedMs: number;
  timeRemaining: number;
  typedWordCount: number;
  keyboardVisible: boolean;
}

function formatPracticeTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  if (m > 0) return `${m}:${s.toString().padStart(2, "0")}`;
  return `${s}s`;
}

/** One quiet line of rolling numbers (accuracy, speed, then time or words) over a progress line. */
export function PracticeLiveStats({ settings, isKidMode, wpm, accuracy, elapsedMs, timeRemaining, typedWordCount, keyboardVisible }: PracticeLiveStatsProps) {
  const shownWpm = useSampledValue(Math.round(wpm), READOUT_INTERVAL_MS);
  const shownAccuracy = useSampledValue(Math.round(accuracy), READOUT_INTERVAL_MS);
  const timed = isTimedPractice(settings);
  const urgent = timed && timeRemaining < 10;
  const elapsed = formatPracticeTime(Math.floor(elapsedMs / 1000));
  const zen = settings.mode === "zen";
  const showsProgress = !isKidMode && (timed || settings.mode === "words" || zen);
  const progress = timed
    ? settings.duration > 0 ? 1 - timeRemaining / settings.duration : 0
    : settings.wordTarget > 0 ? Math.min(typedWordCount / settings.wordTarget, 1) : 0;

  return (
    <div className={`flex w-full shrink-0 select-none flex-col items-center gap-2 ${keyboardVisible ? "pb-8" : "pb-2"}`}>
      <div className="flex flex-wrap items-baseline justify-center gap-x-6 gap-y-1">
        {isKidMode ? (
          <>
            <Stat value={elapsed} label="time" />
            <Stat value={String(typedWordCount)} label="words" emphasis />
          </>
        ) : (
          <>
            <Stat value={`${shownAccuracy}%`} label="acc" />
            <Stat value={String(shownWpm)} label="wpm" emphasis />
            {timed && <Stat value={formatPracticeTime(timeRemaining)} label="left" urgent={urgent} />}
            {settings.mode === "words" && (
              <Stat value={settings.wordTarget > 0 ? `${Math.min(typedWordCount, settings.wordTarget)}/${settings.wordTarget}` : String(typedWordCount)} label="words" />
            )}
            {zen && (
              <>
                <Stat value={elapsed} label="time" />
                <Stat value={String(typedWordCount)} label="words" />
              </>
            )}
          </>
        )}
      </div>
      {showsProgress && (
        <div className="h-[3px] w-[min(36rem,90%)] overflow-hidden rounded-full bg-border" aria-hidden="true">
          {zen ? (
            <motion.div className="h-full w-24 rounded-full bg-primary" animate={{ x: ["-6rem", "36rem"] }} transition={{ duration: 3, ease: "linear", repeat: Infinity }} />
          ) : (
            <motion.div
              className={`h-full rounded-full ${urgent ? "bg-destructive" : "bg-primary"}`}
              initial={false}
              animate={{ width: `${progress * 100}%` }}
              transition={{ ease: "linear", duration: 0.2 }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, emphasis = false, urgent = false }: { value: string; label: string; emphasis?: boolean; urgent?: boolean }) {
  const tone = urgent ? "text-destructive" : emphasis ? "text-primary" : "text-foreground";
  return (
    <span className="flex items-baseline gap-1.5">
      <RollingNumber value={value} className={`font-semibold ${emphasis ? "text-3xl md:text-4xl" : "text-xl md:text-2xl"} ${tone}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}
