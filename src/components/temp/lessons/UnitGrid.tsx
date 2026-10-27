import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { CaretDownIcon, CheckIcon, LockSimpleIcon, PlayIcon, StarIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { LESSON_COUNT, LESSON_SPRING, UNITS, courseProgress, nextLesson, statusOf, unitProgress, type Lesson, type Unit } from "./lessons-mock";
import { GoalChips } from "./LessonDetail";
import { Bar, ComingSoonBanner, KeyRow, PageTitle, PracticeLink, Ring, Stars, StatusPill, UnitTile } from "./LessonParts";

/** 02 Unit cards: a card per unit with its keys and progress; open one to see its lessons. */
export function UnitGrid({ preview }: { preview: boolean }) {
  const [openUnit, setOpenUnit] = useState<string | null>(preview ? null : nextLesson(false).unit.id);
  const course = courseProgress(preview);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-4 @2xl:flex-row @2xl:items-end @2xl:justify-between">
        <PageTitle title="Choose a unit">Each unit teaches a few new keys. Finish one to open the next.</PageTitle>
        {!preview && (
          <div className="flex w-full flex-col gap-1.5 @2xl:w-56">
            <span className="flex justify-between text-xs text-muted-foreground"><span>{course.done} of {LESSON_COUNT} lessons</span><span className="inline-flex items-center gap-1"><StarIcon weight="fill" className="size-3.5 text-warning" aria-hidden="true" />{course.stars}</span></span>
            <Bar value={course.done} max={LESSON_COUNT} />
          </div>
        )}
      </div>
      {preview && <ComingSoonBanner />}

      <LayoutGroup>
        <div className="grid grid-cols-1 items-start gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
          {UNITS.map((unit, index) => (
            <UnitCard key={unit.id} unit={unit} index={index} preview={preview} open={openUnit === unit.id} onToggle={() => setOpenUnit((value) => value === unit.id ? null : unit.id)} />
          ))}
        </div>
      </LayoutGroup>

      <div className="flex flex-col items-center justify-between gap-3 rounded-3xl bg-foreground/5 p-5 text-center @xl:flex-row @xl:text-left">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Not in the mood for a lesson?</span>
          <span className="text-xs text-muted-foreground">Practice with any words, quotes or time limit you like.</span>
        </div>
        <PracticeLink quiet>Back to practice</PracticeLink>
      </div>
    </div>
  );
}

function UnitCard({ unit, index, preview, open, onToggle }: { unit: Unit; index: number; preview: boolean; open: boolean; onToggle: () => void }) {
  const progress = unitProgress(unit, preview);
  const locked = progress.state === "locked";
  const panelId = `unit-lessons-${unit.id}`;
  return (
    <motion.article layout transition={LESSON_SPRING} className={cn("flex flex-col overflow-hidden rounded-3xl border bg-card", open ? "border-primary/60 shadow-lg" : "border-border")}>
      <motion.button
        layout="position"
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        whileHover={{ y: -2 }}
        transition={LESSON_SPRING}
        className="group flex flex-col gap-3 p-5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span className="flex items-start justify-between gap-3">
          <span className={cn("relative", locked && "opacity-50")}>
            <UnitTile unit={unit} size="lg" />
            {progress.state === "complete" && <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-success text-background ring-2 ring-card"><CheckIcon weight="bold" className="size-3" aria-hidden="true" /></span>}
            {locked && <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-foreground/10 text-muted-foreground ring-2 ring-card"><LockSimpleIcon weight="fill" className="size-3" aria-hidden="true" /></span>}
          </span>
          {preview
            ? <span className="rounded-full bg-accent px-2 py-0.5 text-[0.7rem] font-semibold text-accent-foreground">{unit.lessons.length} lessons</span>
            : <Ring value={progress.done} max={progress.total} className={unit.tint}>{progress.done}/{progress.total}</Ring>}
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">Unit {index + 1}</span>
          <span className="text-lg font-bold leading-tight">{unit.title}</span>
          <span className="text-xs text-muted-foreground">{unit.blurb}</span>
        </span>
        <KeyRow keys={unit.keys} tone={locked ? "faint" : "plain"} className="text-xs" />
        <span className="mt-1 flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span>
            {progress.state === "complete" && <span className="inline-flex items-center gap-1"><StarIcon weight="fill" className="size-3.5 text-warning" aria-hidden="true" />{progress.stars} of {progress.maxStars} stars</span>}
            {progress.state === "active" && <span className="font-semibold text-primary">In progress</span>}
            {locked && `Finish Unit ${index} to unlock`}
            {preview && "Opens soon"}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-semibold text-foreground">
            {open ? "Hide lessons" : "See lessons"}
            <CaretDownIcon className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
          </span>
        </span>
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={panelId} key="lessons" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={LESSON_SPRING} className="overflow-hidden">
            <ol className="flex flex-col gap-2 border-t border-border/60 bg-foreground/[0.03] p-3">
              {unit.lessons.map((lesson, lessonIndex) => <LessonTile key={lesson.id} lesson={lesson} number={lessonIndex + 1} preview={preview} />)}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function LessonTile({ lesson, number, preview }: { lesson: Lesson; number: number; preview: boolean }) {
  const status = statusOf(lesson, preview);
  return (
    <li className={cn("flex flex-col gap-2 rounded-2xl border bg-card p-3", status === "current" ? "border-primary ring-2 ring-primary/20" : "border-border", status === "locked" && "opacity-60")}>
      <div className="flex items-center gap-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold", status === "current" ? "bg-primary text-primary-foreground" : status === "done" ? "bg-success/15 text-success" : "bg-foreground/10 text-muted-foreground")}>
          {status === "done" ? <CheckIcon weight="bold" className="size-4" aria-hidden="true" /> : status === "current" ? <PlayIcon weight="fill" className="size-4" aria-hidden="true" /> : number}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">{lesson.title}</span>
          <KeyRow keys={lesson.keys} tone="faint" className="text-[0.65rem]" />
        </span>
        {status === "done" ? <Stars count={lesson.stars} className="text-sm" /> : <StatusPill status={status} />}
      </div>
      {status === "current" && (
        <div className="flex flex-col gap-2">
          <GoalChips lesson={lesson} />
          <PracticeLink className="py-2">Start lesson</PracticeLink>
        </div>
      )}
      {status === "soon" && <GoalChips lesson={lesson} />}
    </li>
  );
}
