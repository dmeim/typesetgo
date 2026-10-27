import { ClockIcon, LightningIcon, TargetIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { ALL_LESSONS, statusOf, unitOfLesson, type Lesson } from "./lessons-mock";
import { KeyRow, PracticeLink, Stars, StatusPill } from "./LessonParts";

/** What a lesson asks of you: accuracy, speed and time. */
export function GoalChips({ lesson, className }: { lesson: Lesson; className?: string }) {
  return (
    <span className={cn("flex flex-wrap gap-1.5 text-xs text-muted-foreground", className)}>
      <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5"><TargetIcon className="size-3.5" aria-hidden="true" />{lesson.goalAccuracy}% accuracy</span>
      <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5"><LightningIcon className="size-3.5" aria-hidden="true" />{lesson.goalWpm} WPM</span>
      <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5"><ClockIcon className="size-3.5" aria-hidden="true" />{lesson.minutes} min</span>
    </span>
  );
}

function currentTitle() {
  return ALL_LESSONS.find((entry) => entry.lesson.progress === "current")?.lesson.title ?? "the lesson before";
}

/** The card a lesson opens into, with the right next step for its state. */
export function LessonDetail({ lesson, preview, id, className }: { lesson: Lesson; preview: boolean; id?: string; className?: string }) {
  const status = statusOf(lesson, preview);
  const unit = unitOfLesson(lesson.id);
  const number = unit.lessons.findIndex((entry) => entry.id === lesson.id) + 1;
  return (
    <div id={id} className={cn("flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className={cn("text-[0.7rem] font-semibold uppercase tracking-wider", unit.tint)}>{unit.title} · Lesson {number}</span>
          <span className="text-base font-bold leading-tight">{lesson.title}</span>
        </div>
        <StatusPill status={status} />
      </div>
      <KeyRow keys={lesson.keys} tone="bold" />
      <p className="text-xs text-muted-foreground">{lesson.tip}</p>
      <GoalChips lesson={lesson} />
      {status === "done" && lesson.best && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-foreground/5 px-3 py-2 text-xs">
          <span>Best: <strong>{lesson.best.wpm} WPM</strong> at <strong>{lesson.best.accuracy}%</strong></span>
          <Stars count={lesson.stars} className="text-sm" />
        </div>
      )}
      {status === "current" && <PracticeLink>Start lesson</PracticeLink>}
      {status === "done" && <PracticeLink quiet>Play it again</PracticeLink>}
      {status === "locked" && <p className="rounded-xl bg-foreground/5 px-3 py-2 text-xs text-muted-foreground">Finish <strong className="text-foreground">{currentTitle()}</strong> to unlock this one.</p>}
      {status === "soon" && (
        <>
          <p className="rounded-xl bg-accent/60 px-3 py-2 text-xs text-accent-foreground">This lesson opens soon. You can already practise these keys on the practice page.</p>
          <PracticeLink quiet>Practice typing now</PracticeLink>
        </>
      )}
    </div>
  );
}
