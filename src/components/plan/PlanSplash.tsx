import { useEffect } from "react";
import type { PlanItem } from "@/types/plan";
import type { Theme } from "@/lib/typing-constants";
import { DEFAULT_THEME } from "@/lib/typing-constants";

interface PlanSplashProps {
  item: PlanItem;
  progress: {
    current: number;
    total: number;
  };
  onStart: () => void;
  onEnterZen?: () => void;
  isLocked?: boolean; // True if waiting for others
  canEnterZen?: boolean; // True if Zen Waiting is enabled and locked
  theme?: Theme;
}

export default function PlanSplash({
  item,
  progress,
  onStart,
  onEnterZen,
  isLocked = false,
  canEnterZen = false,
  theme = DEFAULT_THEME,
}: PlanSplashProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !isLocked) {
        onStart();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onStart, isLocked]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in text-center p-8 max-w-2xl mx-auto">
      {/* Progress Pill */}
      <div 
        className="mb-6 px-4 py-1.5 rounded-full text-sm font-mono"
        style={{ backgroundColor: `${theme.surfaceColor}80`, borderWidth: 1, borderColor: `${theme.defaultText}30`, color: theme.defaultText }}
      >
        Step {progress.current} / {progress.total}
      </div>

      {/* Main Metadata */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight" style={{ color: theme.correctText }}>
        {item.metadata.title}
      </h1>
      <p className="text-xl mb-12 max-w-lg" style={{ color: theme.defaultText }}>
        {item.metadata.subtitle}
      </p>

      {/* Mode Info Badge */}
      <div className="mb-12 flex gap-2 justify-center">
        <span 
          className="px-3 py-1 rounded text-xs uppercase tracking-widest font-semibold"
          style={{ backgroundColor: theme.surfaceColor, color: theme.defaultText, borderWidth: 1, borderColor: `${theme.defaultText}30` }}
        >
          Mode: {item.mode}
        </span>
        {item.mode === "time" && (
          <span 
            className="px-3 py-1 rounded text-xs uppercase tracking-widest font-semibold"
            style={{ backgroundColor: theme.surfaceColor, color: theme.defaultText, borderWidth: 1, borderColor: `${theme.defaultText}30` }}
          >
            {item.settings.duration}s
          </span>
        )}
        {item.mode === "words" && (
          <span 
            className="px-3 py-1 rounded text-xs uppercase tracking-widest font-semibold"
            style={{ backgroundColor: theme.surfaceColor, color: theme.defaultText, borderWidth: 1, borderColor: `${theme.defaultText}30` }}
          >
            {item.settings.wordTarget} words
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        {!isLocked ? (
          <button
            onClick={onStart}
            className="w-full py-4 text-white rounded-lg font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] hover:opacity-90"
            style={{ backgroundColor: theme.buttonSelected, boxShadow: `0 10px 15px -3px ${theme.buttonSelected}30` }}
          >
            Begin Step
          </button>
        ) : (
          <div className="space-y-4">
            <button
              disabled
              className="w-full py-4 rounded-lg font-medium cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: theme.surfaceColor, color: theme.defaultText, borderWidth: 1, borderColor: `${theme.defaultText}30` }}
            >
              <span className="animate-pulse">●</span> Waiting for Group...
            </button>

            {canEnterZen && onEnterZen && (
              <button
                onClick={onEnterZen}
                className="w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 hover:opacity-80"
                style={{ backgroundColor: `${theme.ghostCursor}20`, color: theme.ghostCursor, borderWidth: 1, borderColor: `${theme.ghostCursor}30` }}
              >
                Enter Waiting Room (Zen)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
