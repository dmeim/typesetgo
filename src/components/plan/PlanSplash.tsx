import { useEffect } from "react";
import type { PlanItem } from "@/types/plan";

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
}

export default function PlanSplash({
  item,
  progress,
  onStart,
  onEnterZen,
  isLocked = false,
  canEnterZen = false,
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
      <div className="mb-6 px-4 py-1.5 rounded-full bg-gray-800/50 border border-gray-700 text-sm text-gray-400 font-mono">
        Step {progress.current} / {progress.total}
      </div>

      {/* Main Metadata */}
      <h1 className="text-4xl md:text-5xl font-bold text-gray-100 mb-4 tracking-tight">
        {item.metadata.title}
      </h1>
      <p className="text-xl text-gray-400 mb-12 max-w-lg">
        {item.metadata.subtitle}
      </p>

      {/* Mode Info Badge */}
      <div className="mb-12 flex gap-2 justify-center">
        <span className="px-3 py-1 bg-gray-800 rounded text-xs text-gray-500 uppercase tracking-widest font-semibold border border-gray-700">
          Mode: {item.mode}
        </span>
        {item.mode === "time" && (
          <span className="px-3 py-1 bg-gray-800 rounded text-xs text-gray-500 uppercase tracking-widest font-semibold border border-gray-700">
            {item.settings.duration}s
          </span>
        )}
        {item.mode === "words" && (
          <span className="px-3 py-1 bg-gray-800 rounded text-xs text-gray-500 uppercase tracking-widest font-semibold border border-gray-700">
            {item.settings.wordTarget} words
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        {!isLocked ? (
          <button
            onClick={onStart}
            className="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-lg shadow-lg shadow-sky-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Begin Step
          </button>
        ) : (
          <div className="space-y-4">
            <button
              disabled
              className="w-full py-4 bg-gray-800 text-gray-500 rounded-lg font-medium cursor-not-allowed border border-gray-700 flex items-center justify-center gap-2"
            >
              <span className="animate-pulse">●</span> Waiting for Group...
            </button>

            {canEnterZen && onEnterZen && (
              <button
                onClick={onEnterZen}
                className="w-full py-3 bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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
