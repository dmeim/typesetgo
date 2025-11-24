import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GLOBAL_COLORS } from "@/lib/colors";
import { SettingsState } from "@/lib/typing-constants";

// Reusing the User type definition for now
type User = {
  id: string;
  name: string;
  stats: {
    wpm: number;
    accuracy: number;
    progress: number;
    wordsTyped: number;
    timeElapsed: number;
    isFinished: boolean;
    planIndex?: number;
    totalSteps?: number;
    isZenWaiting?: boolean;
  };
};

interface UserHostCardProps {
  user: User;
  settings: Partial<SettingsState>;
  viewMode: "list" | "grid";
  theme: any;
  cardSize: number;
  onKick: (userId: string) => void;
  onReset: (userId: string) => void;
}

export default function UserHostCard({
  user,
  settings,
  viewMode,
  theme,
  cardSize,
  onKick,
  onReset,
}: UserHostCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: user.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  // Logic for different modes (copied from original file)
  let progressDisplay = <div className="w-full h-full bg-gray-700"></div>;
  let progressText = "";
  const isFinished = user.stats?.isFinished;

  if (settings.mode === "time" || (settings.mode === "preset" && settings.presetModeType === "time")) {
    const duration = settings.duration || 30;
    const elapsed = (user.stats?.timeElapsed || 0) / 1000;
    const remaining = Math.max(0, duration - elapsed);
    const progressPct = Math.min(100, (elapsed / duration) * 100);

    progressDisplay = (
      <div className="h-full bg-gray-700 overflow-hidden rounded-full relative">
        <div
          className="absolute top-0 left-0 h-full transition-all duration-500"
          style={{
            width: `${isFinished ? 100 : progressPct}%`,
            backgroundColor: isFinished ? GLOBAL_COLORS.text.success : theme.buttonSelected
          }}
        />
      </div>
    );
    progressText = isFinished ? "Done" : `${remaining.toFixed(0)}s`;

  } else if (settings.mode === "words") {
    const target = settings.wordTarget || 25;
    const typed = user.stats?.wordsTyped || 0; // Approx words
    const progressPct = Math.min(100, (typed / target) * 100);

    progressDisplay = (
      <div className="h-full bg-gray-700 overflow-hidden rounded-full relative">
        <div
          className="absolute top-0 left-0 h-full transition-all duration-500"
          style={{
            width: `${isFinished ? 100 : progressPct}%`,
            backgroundColor: isFinished ? GLOBAL_COLORS.text.success : theme.buttonSelected
          }}
        />
      </div>
    );
    progressText = isFinished ? "Done" : `${Math.floor(typed)}/${target}`;

  } else if (settings.mode === "plan") {
    const planIndex = user.stats?.planIndex || 0;
    const total = user.stats?.totalSteps || 1;
    const isZen = user.stats?.isZenWaiting;
    const currentStepProgress = user.stats?.progress || 0; // Progress within step

    // Calculate overall progress? Or just show current step progress?
    // Let's show current step progress bar, but text says "Step X/Y"
    
    const progressPct = isZen ? 100 : currentStepProgress;

    progressDisplay = (
      <div className="h-full bg-gray-700 overflow-hidden rounded-full relative">
        <div
          className={`absolute top-0 left-0 h-full transition-all duration-500 ${isZen ? "animate-pulse" : ""}`}
          style={{
            width: `${progressPct}%`,
            backgroundColor: isZen ? GLOBAL_COLORS.brand.accent : (isFinished ? GLOBAL_COLORS.text.success : theme.buttonSelected)
          }}
        />
      </div>
    );
    progressText = isZen ? "Waiting (Zen)" : `Step ${planIndex + 1}/${total}`;

  } else {
    // Quote, Preset (finish), Zen
    const progress = user.stats?.progress || 0;
    progressDisplay = (
      <div className="h-full bg-gray-700 overflow-hidden rounded-full relative">
        <div
          className="absolute top-0 left-0 h-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            backgroundColor: isFinished ? GLOBAL_COLORS.text.success : theme.buttonSelected
          }}
        />
      </div>
    );
    progressText = isFinished ? "Done" : `${Math.round(progress)}%`;
  }

  if (viewMode === "list") {
    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className="p-4 rounded flex items-center justify-between transition border-l-4 border-transparent hover:border-current group relative touch-none"
        style={{ ...style, backgroundColor: GLOBAL_COLORS.surface, color: theme.defaultText }}
      >
        <div className="flex items-center gap-4 w-1/3">
           {/* Drag Handle Indicator (optional, but good for UX) */}
           <div className="cursor-grab text-gray-600 hover:text-gray-400">
              <svg viewBox="0 0 20 20" width="12" height="12" fill="currentColor">
                  <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
              </svg>
           </div>
           <div className="font-bold text-lg truncate select-none">{user.name}</div>
           <div className="text-xs opacity-70 font-mono select-none">{user.id.slice(0, 4)}</div>
        </div>

        <div className="flex-1 px-4">
          <div className="h-2 w-full rounded-full overflow-hidden bg-gray-800">
            {progressDisplay}
          </div>
          <div className="text-xs text-right mt-1" style={{ color: GLOBAL_COLORS.text.secondary }}>{progressText}</div>
        </div>

        <div className="flex gap-4 w-1/3 justify-end items-center">
          <div className="text-right w-16">
            <div className="text-xl font-bold" style={{ color: theme.buttonSelected }}>{Math.round(user.stats?.wpm || 0)}</div>
            <div className="text-xs" style={{ color: GLOBAL_COLORS.text.secondary }}>WPM</div>
          </div>
          <div className="text-right w-16">
            <div className="text-xl font-bold opacity-80">{Math.round(user.stats?.accuracy || 0)}%</div>
            <div className="text-xs" style={{ color: GLOBAL_COLORS.text.secondary }}>ACC</div>
          </div>

          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onReset(user.id)}
              className="p-1.5 rounded hover:bg-gray-600 transition"
              style={{ color: GLOBAL_COLORS.brand.primary }}
              title="Reset User"
              onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
            >
              ↺
            </button>
            <button
              onClick={() => onKick(user.id)}
              className="p-1.5 rounded hover:bg-gray-600 transition"
              style={{ color: GLOBAL_COLORS.text.error }}
              title="Kick User"
              onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid Card View
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="rounded-lg p-6 flex flex-col gap-4 hover:shadow-lg transition border-t-4 border-transparent hover:border-current group relative touch-none"
      style={{ ...style, fontSize: `${cardSize}rem`, color: theme.defaultText, backgroundColor: GLOBAL_COLORS.surface }}
    >
      <div className="flex justify-between items-start cursor-grab">
        <div className="font-bold text-[1.2em] truncate w-3/4 select-none" title={user.name}>{user.name}</div>
        <div className="text-[0.6em] opacity-70 font-mono mt-1 select-none">{user.id.slice(0, 4)}</div>
      </div>

      {/* Actions (Absolute Top Right) */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <button
          onClick={() => onReset(user.id)}
          className="p-1 rounded hover:bg-gray-600 transition text-sm"
          style={{ color: GLOBAL_COLORS.brand.primary }}
          title="Reset User"
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
        >
          ↺
        </button>
        <button
          onClick={() => onKick(user.id)}
          className="p-1 rounded hover:bg-gray-600 transition text-sm"
          style={{ color: GLOBAL_COLORS.text.error }}
          title="Kick User"
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[0.8em]" style={{ color: GLOBAL_COLORS.text.secondary }}>
          <span>Progress</span>
          <span>{progressText}</span>
        </div>
        <div className="h-3 w-full rounded-full overflow-hidden bg-gray-800">
          {progressDisplay}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="bg-gray-800 rounded p-3 text-center">
          <div className="text-[1.5em] font-bold leading-none" style={{ color: theme.buttonSelected }}>{Math.round(user.stats?.wpm || 0)}</div>
          <div className="text-[0.6em] mt-1" style={{ color: GLOBAL_COLORS.text.secondary }}>WPM</div>
        </div>
        <div className="bg-gray-800 rounded p-3 text-center">
          <div className="text-[1.5em] font-bold opacity-80 leading-none">{Math.round(user.stats?.accuracy || 0)}%</div>
          <div className="text-[0.6em] mt-1" style={{ color: GLOBAL_COLORS.text.secondary }}>Accuracy</div>
        </div>
      </div>
    </div>
  );
}
