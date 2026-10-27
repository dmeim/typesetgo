import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, LockSimpleIcon, MedalIcon, PlayIcon, StarIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { LESSON_COUNT, LESSON_SPRING, UNITS, courseProgress, nextLesson, statusOf, unitProgress, type Lesson, type Unit } from "./lessons-mock";
import { LessonDetail } from "./LessonDetail";
import { ComingSoonBanner, KeyRow, PageTitle, PracticeLink, Stars, UnitTile } from "./LessonParts";

// Sideways steps that make the trail wind back and forth.
const WIND = [0, 1, 1.6, 1, 0, -1, -1.6, -1];
const STOPS = UNITS.flatMap((unit) => [...unit.lessons.map((lesson) => lesson.id), `badge-${unit.id}`]);
const offsetOf = (id: string) => WIND[STOPS.indexOf(id) % WIND.length];

/** 01 Lesson map: one winding trail of lesson stops, unit by unit, like a board game. */
export function LessonMap({ preview }: { preview: boolean }) {
  const [openId, setOpenId] = useState<string | null>(preview ? null : nextLesson(false).lesson.id);
  const toggle = (id: string) => setOpenId((value) => value === id ? null : id);
  const keepGoing = () => {
    const id = nextLesson(false).lesson.id;
    setOpenId(id);
    document.getElementById(`map-stop-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageTitle title="Lessons">Follow the trail one stop at a time. Each stop is a five minute lesson.</PageTitle>
      {preview ? <ComingSoonBanner /> : <MapSummary onContinue={keepGoing} />}

      {UNITS.map((unit, unitIndex) => (
        <section key={unit.id} aria-labelledby={`map-${unit.id}`} className="flex flex-col items-center gap-4">
          <UnitHeader unit={unit} index={unitIndex} preview={preview} />
          <ol className="flex w-full flex-col items-center gap-3 [--step:1.6rem] @md:[--step:3rem]">
            {unit.lessons.map((lesson) => {
              const offset = offsetOf(lesson.id);
              const open = openId === lesson.id;
              return (
                <li key={lesson.id} id={`map-stop-${lesson.id}`} className={cn("flex w-full flex-col items-center gap-3", statusOf(lesson, preview) === "current" && "pt-8")}>
                  <div className="flex flex-col items-center gap-1" style={{ translate: `calc(var(--step) * ${offset}) 0` }}>
                    <Stop lesson={lesson} preview={preview} open={open} onClick={() => toggle(lesson.id)} />
                    {statusOf(lesson, preview) === "done" && <Stars count={lesson.stars} className="text-sm" />}
                  </div>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div key="detail" initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={LESSON_SPRING} className="w-full max-w-xs">
                        <LessonDetail id={`map-detail-${lesson.id}`} lesson={lesson} preview={preview} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
            <li className="flex flex-col items-center gap-1" style={{ translate: `calc(var(--step) * ${offsetOf(`badge-${unit.id}`)}) 0` }}>
              <UnitBadge unit={unit} preview={preview} />
            </li>
          </ol>
        </section>
      ))}

      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border p-6 text-center">
        <span className="text-sm font-semibold">That is the whole trail: {LESSON_COUNT} lessons.</span>
        <span className="text-xs text-muted-foreground">Want to type something else? Practice is always open.</span>
        <PracticeLink quiet>Free practice</PracticeLink>
      </div>
    </div>
  );
}

function MapSummary({ onContinue }: { onContinue: () => void }) {
  const course = courseProgress(false);
  const next = nextLesson(false);
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 @lg:flex-row @lg:items-center">
      <div className="flex flex-1 items-center gap-4">
        <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-warning text-background">
          <StarIcon weight="fill" className="size-6" aria-hidden="true" />
          <span className="text-xs font-bold">{course.stars}</span>
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-bold">{course.done} of {LESSON_COUNT} stops done</span>
          <span className="text-xs text-muted-foreground">{course.stars} of {course.maxStars} stars collected</span>
        </div>
      </div>
      <button type="button" onClick={onContinue} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <PlayIcon weight="fill" className="size-4" aria-hidden="true" />Keep going: {next.lesson.title}
      </button>
    </div>
  );
}

function UnitHeader({ unit, index, preview }: { unit: Unit; index: number; preview: boolean }) {
  const progress = unitProgress(unit, preview);
  return (
    <div className={cn("flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 pr-4", progress.state === "locked" && "opacity-70")}>
      <UnitTile unit={unit} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id={`map-${unit.id}`} className="text-sm font-bold leading-tight"><span className="text-muted-foreground">Unit {index + 1} · </span>{unit.title}</h2>
        <KeyRow keys={unit.keys} tone="faint" className="text-[0.7rem]" />
      </div>
      {!preview && <span className="shrink-0 text-xs font-semibold text-muted-foreground">{progress.done}/{progress.total}</span>}
    </div>
  );
}

function Stop({ lesson, preview, open, onClick }: { lesson: Lesson; preview: boolean; open: boolean; onClick: () => void }) {
  const status = statusOf(lesson, preview);
  const unit = UNITS.find((entry) => entry.lessons.includes(lesson)) ?? UNITS[0];
  const label = { done: "done", current: "up next", locked: "locked", soon: "coming soon" }[status];
  return (
    <div className="relative">
      {status === "current" && (
        <>
          <motion.span aria-hidden="true" className="absolute inset-0 rounded-full bg-primary/40" animate={{ scale: [1, 1.45], opacity: [0.6, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }} />
          <span aria-hidden="true" className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2.5 py-0.5 text-[0.7rem] font-bold text-primary-foreground after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-primary">Start</span>
        </>
      )}
      <motion.button
        type="button"
        onClick={onClick}
        aria-expanded={open}
        aria-controls={open ? `map-detail-${lesson.id}` : undefined}
        aria-label={`${lesson.title}, ${label}`}
        whileHover={{ y: -3 }}
        whileTap={{ y: 2, scale: 0.97 }}
        transition={LESSON_SPRING}
        className={cn(
          "relative flex size-16 items-center justify-center rounded-full border-b-[6px] border-black/20 text-lg font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
          status === "done" && unit.tile,
          status === "current" && "size-[4.5rem] bg-primary text-primary-foreground",
          status === "locked" && "bg-foreground/10 text-muted-foreground",
          status === "soon" && cn("border-2 border-dashed", unit.soft),
          open && "ring-4 ring-ring/40",
        )}
      >
        {status === "done" && <CheckIcon weight="bold" className="size-7" aria-hidden="true" />}
        {status === "current" && <PlayIcon weight="fill" className="size-8" aria-hidden="true" />}
        {status === "locked" && <LockSimpleIcon weight="fill" className="size-6" aria-hidden="true" />}
        {status === "soon" && (lesson.keys.length > 3
          ? <unit.Icon weight="fill" className="size-6" aria-hidden="true" />
          : <span aria-hidden="true" className="text-sm uppercase">{lesson.keys}</span>)}
      </motion.button>
    </div>
  );
}

function UnitBadge({ unit, preview }: { unit: Unit; preview: boolean }) {
  const earned = unitProgress(unit, preview).state === "complete";
  return (
    <>
      <span className={cn("flex size-14 items-center justify-center rounded-2xl rotate-45", earned ? "bg-warning text-background" : "border-2 border-dashed border-border bg-foreground/5 text-muted-foreground")}>
        <MedalIcon weight="fill" className="size-7 -rotate-45" aria-hidden="true" />
      </span>
      <span className="mt-2 text-[0.7rem] font-semibold text-muted-foreground">{earned ? `${unit.title} badge earned` : `${unit.title} badge`}</span>
    </>
  );
}
