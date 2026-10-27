import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CaretDownIcon, ChalkboardTeacherIcon, CheckIcon, LockSimpleIcon, PlayIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { COURSE_MINUTES, LESSON_COUNT, LESSON_SPRING, UNITS, courseProgress, nextLesson, statusOf, unitProgress, type Lesson, type Unit } from "./lessons-mock";
import { Bar, KeyRow, PracticeLink, Stars, StatusPill, UnitTile } from "./LessonParts";

/** 04 Course syllabus: the whole course as one tidy list with progress per unit, easy for a class or a teacher to scan. */
export function CourseSyllabus({ preview }: { preview: boolean }) {
  const [open, setOpen] = useState<string[]>([preview ? UNITS[0].id : nextLesson(false).unit.id]);
  const allOpen = open.length === UNITS.length;
  const toggle = (id: string) => setOpen((ids) => ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <CourseHeader preview={preview} />

      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-bold">Syllabus</h2>
        <button type="button" onClick={() => setOpen(allOpen ? [] : UNITS.map((unit) => unit.id))} className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          {allOpen ? "Close all units" : "Open all units"}
        </button>
      </div>

      <ol className="flex flex-col gap-3">
        {UNITS.map((unit, index) => <UnitSection key={unit.id} unit={unit} index={index} preview={preview} open={open.includes(unit.id)} onToggle={() => toggle(unit.id)} />)}
      </ol>

      <div className="grid gap-3 @xl:grid-cols-2">
        <div className="flex gap-3 rounded-3xl border border-border bg-card p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><ChalkboardTeacherIcon weight="fill" className="size-5" aria-hidden="true" /></span>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">Teaching a class?</span>
            <span className="text-xs text-muted-foreground">Every lesson is short enough for the start of a lesson period. Run a Connect room for live practice today.</span>
          </div>
        </div>
        <div className="flex flex-col items-start justify-center gap-2 rounded-3xl border border-border bg-card p-4">
          <span className="text-sm font-semibold">{preview ? "Ready to type?" : "Just want to type?"}</span>
          <PracticeLink quiet>Back to practice</PracticeLink>
        </div>
      </div>
    </div>
  );
}

function CourseHeader({ preview }: { preview: boolean }) {
  const course = courseProgress(preview);
  const stats = preview
    ? [["Units", UNITS.length], ["Lessons", LESSON_COUNT], ["Each lesson", "5 min"], ["In all", `${Math.round(COURSE_MINUTES / 60 * 2) / 2} hours`]]
    : [["Lessons done", `${course.done}/${LESSON_COUNT}`], ["Stars", `${course.stars}/${course.maxStars}`], ["Accuracy", "95%"], ["Time spent", `${course.done * 5} min`]];
  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-5 @lg:p-6">
      <div className="flex flex-col gap-3 @xl:flex-row @xl:items-start @xl:justify-between">
        <div className="flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Course
            {preview && <span className="rounded-full bg-accent px-2 py-0.5 normal-case tracking-normal text-accent-foreground">Coming soon</span>}
          </span>
          <h1 className="text-2xl font-bold leading-tight @lg:text-3xl">Touch typing from scratch</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            {preview
              ? "Learn every key without looking, one row at a time. Lessons open soon; here is the full plan."
              : "Learn every key without looking, one row at a time. Earn up to three stars in each lesson."}
          </p>
        </div>
        {preview ? <PracticeLink className="shrink-0">Practice typing now</PracticeLink> : <PracticeLink className="shrink-0">Continue: {nextLesson(false).lesson.title}</PracticeLink>}
      </div>

      <dl className="grid grid-cols-2 gap-2 @xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="flex flex-col rounded-2xl bg-foreground/5 px-3 py-2">
            <dt className="text-[0.7rem] text-muted-foreground">{label}</dt>
            <dd className="text-lg font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1" aria-hidden="true">
          {UNITS.map((unit) => {
            const progress = unitProgress(unit, preview);
            return (
              <span key={unit.id} className="h-2.5 overflow-hidden rounded-full bg-foreground/10" style={{ flexGrow: unit.lessons.length }}>
                <span className={cn("block h-full rounded-full", unit.tile)} style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </span>
            );
          })}
        </div>
        <span className="text-[0.7rem] text-muted-foreground">{preview ? "Your progress bar fills unit by unit." : `${Math.round((course.done / LESSON_COUNT) * 100)}% of the course done`}</span>
      </div>
    </div>
  );
}

function UnitSection({ unit, index, preview, open, onToggle }: { unit: Unit; index: number; preview: boolean; open: boolean; onToggle: () => void }) {
  const progress = unitProgress(unit, preview);
  const panelId = `syllabus-${unit.id}`;
  return (
    <li className="overflow-hidden rounded-3xl border border-border bg-card">
      <h3>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId}
          className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-accent/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
          <UnitTile unit={unit} />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex flex-wrap items-baseline gap-x-2 text-sm font-bold">
              <span><span className="text-muted-foreground">Unit {index + 1}</span> {unit.title}</span>
              <span className="text-[0.7rem] font-normal text-muted-foreground">{unit.lessons.length} lessons</span>
            </span>
            <span className="hidden text-xs text-muted-foreground @md:block">{unit.blurb}</span>
            {!preview && <Bar value={progress.done} max={progress.total} fill={unit.tile.split(" ")[0]} className="h-1.5 max-w-48" />}
          </span>
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
            {progress.state === "complete" && <span className="inline-flex items-center gap-1 text-success"><CheckIcon weight="bold" className="size-3.5" aria-hidden="true" />Done</span>}
            {progress.state === "active" && <span className="text-primary">{progress.done}/{progress.total}</span>}
            {progress.state === "locked" && <span className="inline-flex items-center gap-1"><LockSimpleIcon weight="fill" className="size-3.5" aria-hidden="true" /><span className="hidden @md:inline">Locked</span></span>}
          </span>
          <CaretDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={panelId} key="panel" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={LESSON_SPRING} className="overflow-hidden">
            <div aria-hidden="true" className="hidden grid-cols-[2rem_minmax(0,1.3fr)_minmax(0,1fr)_7.5rem_6.5rem] gap-3 border-t border-border/60 px-4 pt-3 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground @2xl:grid">
              <span>#</span><span>Lesson</span><span>New keys</span><span>Goal</span><span className="text-right">{preview ? "Status" : "Result"}</span>
            </div>
            <ol className="flex flex-col divide-y divide-border/60 border-t border-border/60 @2xl:border-t-0">
              {unit.lessons.map((lesson, lessonIndex) => <SyllabusRow key={lesson.id} lesson={lesson} number={lessonIndex + 1} preview={preview} />)}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function SyllabusRow({ lesson, number, preview }: { lesson: Lesson; number: number; preview: boolean }) {
  const status = statusOf(lesson, preview);
  return (
    <li className={cn("grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 @2xl:grid-cols-[2rem_minmax(0,1.3fr)_minmax(0,1fr)_7.5rem_6.5rem]", status === "current" && "bg-primary/10", status === "locked" && "text-muted-foreground")}>
      <span className={cn("flex size-7 items-center justify-center rounded-lg text-xs font-bold", status === "current" ? "bg-primary text-primary-foreground" : status === "done" ? "bg-success/15 text-success" : "bg-foreground/10 text-muted-foreground")}>
        {status === "done" ? <CheckIcon weight="bold" className="size-3.5" aria-hidden="true" /> : status === "current" ? <PlayIcon weight="fill" className="size-3.5" aria-hidden="true" /> : number}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-semibold">{lesson.title}</span>
        <span className="flex flex-wrap items-center gap-2 text-[0.7rem] text-muted-foreground @2xl:hidden">
          <KeyRow keys={lesson.keys} tone="faint" />
          <span>{lesson.goalAccuracy}% · {lesson.goalWpm} WPM</span>
        </span>
        <span className="hidden truncate text-[0.7rem] text-muted-foreground @2xl:block">{lesson.tip}</span>
      </span>
      <KeyRow keys={lesson.keys} tone={status === "locked" ? "faint" : "plain"} className="hidden text-[0.7rem] @2xl:flex" />
      <span className="hidden text-xs @2xl:block">{lesson.goalAccuracy}% · {lesson.goalWpm} WPM</span>
      <span className="flex justify-end">
        {status === "done" && lesson.best
          ? <span className="flex flex-col items-end"><Stars count={lesson.stars} className="text-sm" /><span className="text-[0.65rem] text-muted-foreground">{lesson.best.wpm} WPM · {lesson.best.accuracy}%</span></span>
          : <StatusPill status={status} />}
      </span>
    </li>
  );
}
