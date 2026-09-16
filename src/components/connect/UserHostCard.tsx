import { useReducedMotion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { SettingsState, Theme } from "@/lib/typing-constants";
import { tv } from "@/lib/theme-vars";
import { isTimedPractice, resolveRoomSettings } from "./room-settings";
import { RoomButton } from "./RoomUI";
import { panelStyle } from "./room-styles";

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
  theme: Theme;
  cardSize: number;
  onKick: (id: string) => void;
  onReset: (id: string) => void;
}

export default function UserHostCard({
  user,
  settings,
  viewMode,
  cardSize,
  onKick,
  onReset,
}: UserHostCardProps) {
  const reducedMotion = useReducedMotion();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: user.id });
  const concrete = resolveRoomSettings(settings) ?? {};
  const finished = user.stats.isFinished;
  let progress = Math.max(0, Math.min(100, user.stats.progress));
  let detail = `${Math.round(progress)}%`;
  if (isTimedPractice(concrete)) {
    const duration = concrete.duration || 30;
    const elapsed = user.stats.timeElapsed / 1000;
    progress = Math.min(100, (elapsed / duration) * 100);
    detail = `${Math.ceil(Math.max(0, duration - elapsed))}s left`;
  } else if (concrete.mode === "words") {
    const target = concrete.wordTarget || 25;
    progress = Math.min(100, (user.stats.wordsTyped / target) * 100);
    detail = `${Math.floor(user.stats.wordsTyped)}/${target} words`;
  } else if (concrete.mode === "zen")
    detail = `${Math.floor(user.stats.wordsTyped)} words`;
  if (finished) {
    progress = 100;
    detail = "Done";
  }
  const step =
    settings.mode === "plan"
      ? `Step ${(settings.planIndex ?? 0) + 1}/${settings.plan?.length ?? 0} · `
      : "";
  return (
    <article
      ref={setNodeRef}
      aria-label={`${user.name}'s progress`}
      className={`min-w-0 rounded-lg border p-4 ${viewMode === "list" ? "grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center" : "space-y-4"}`}
      style={{
        ...panelStyle,
        transform: CSS.Transform.toString(transform),
        transition: reducedMotion ? undefined : transition,
        opacity: isDragging ? 0.5 : 1,
        position: "relative",
        zIndex: isDragging ? 10 : undefined,
        fontSize: `${Math.max(0.9, Math.min(cardSize, 1.35))}rem`,
      }}
    >
      <header className="flex min-w-0 items-start gap-2">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${user.name}`}
          className="min-h-10 min-w-10 rounded touch-none cursor-grab focus-visible:outline-2"
        >
          <GripVertical className="mx-auto size-5" />
        </button>
        <h3 className="min-w-0 break-words py-2 font-semibold">{user.name}</h3>
      </header>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <span style={{ color: tv.ui.mutedForeground }}>Progress</span>
          <span>
            {step}
            {detail}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={`${user.name} progress`}
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 overflow-hidden rounded-full"
          style={{ backgroundColor: tv.ui.secondary }}
        >
          <div
            className="h-full transition-[width] motion-reduce:transition-none"
            style={{
              width: `${progress}%`,
              backgroundColor: finished
                ? tv.status.success.DEFAULT
                : tv.ui.primary,
            }}
          />
        </div>
      </div>
      <div className="space-y-3">
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dd className="text-[1.5em] font-semibold tabular-nums">
              {Math.round(user.stats.wpm)}
            </dd>
            <dt className="text-sm" style={{ color: tv.ui.mutedForeground }}>
              WPM
            </dt>
          </div>
          <div>
            <dd className="text-[1.5em] font-semibold tabular-nums">
              {Math.round(user.stats.accuracy)}%
            </dd>
            <dt className="text-sm" style={{ color: tv.ui.mutedForeground }}>
              Accuracy
            </dt>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <RoomButton
            aria-label={`Reset ${user.name}`}
            onClick={() => onReset(user.id)}
          >
            Reset
          </RoomButton>
          <RoomButton
            aria-label={`Remove ${user.name}`}
            onClick={() => onKick(user.id)}
            style={{ color: tv.ui.destructive }}
          >
            Remove
          </RoomButton>
        </div>
      </div>
    </article>
  );
}
