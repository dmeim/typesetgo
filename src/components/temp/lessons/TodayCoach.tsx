import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarCheckIcon, CheckIcon, ClockIcon, FireIcon, HandWavingIcon, LockSimpleIcon, StarIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { ALL_LESSONS, LESSON_SPRING, STAR_RULES, UNITS, WEEK, courseProgress, nextLesson, type Lesson } from "./lessons-mock";
import { KeyCap, PracticeLink, Stars, UnitTile } from "./LessonParts";

/** 05 Today's coach: one friendly card with just today's lesson, its goals and a big start button; everything else waits. */
export function TodayCoach({ preview }: { preview: boolean }) {
  const { unit, lesson } = nextLesson(preview);
  const number = unit.lessons.indexOf(lesson) + 1;

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-5 @3xl:grid-cols-[minmax(0,1fr)_17rem]">
      <motion.section aria-labelledby="coach-title" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={LESSON_SPRING}
        className="relative flex min-w-0 flex-col gap-5 overflow-hidden rounded-3xl border border-border bg-card p-5 @lg:p-7">
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary/10" />
        <div className="relative flex items-start gap-3">
          <motion.span aria-hidden="true" animate={{ rotate: [0, 14, -8, 14, 0] }} transition={{ duration: 1.4, delay: 0.4 }}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-warning text-background">
            <HandWavingIcon weight="fill" className="size-6" />
          </motion.span>
          <p className="rounded-2xl rounded-tl-sm border border-border bg-background px-3 py-2 text-sm">
            {preview
              ? "Hi! Lessons start soon. Here is what your very first one will feel like."
              : "Great job on R and U yesterday! Today your pointer fingers stretch a little further."}
          </p>
        </div>

        <div className="relative flex flex-col gap-1">
          <span className={cn("flex flex-wrap items-center gap-x-2 text-[0.7rem] font-semibold uppercase tracking-wider", unit.tint)}>
            {preview ? "Your first lesson" : "Today's lesson"}<span className="text-muted-foreground">· {unit.title} · Lesson {number} of {unit.lessons.length}</span>
          </span>
          <h1 id="coach-title" className="text-3xl font-bold @lg:text-4xl">{lesson.title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {lesson.keys.split("").map((char, index) => (
            <motion.span key={char} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...LESSON_SPRING, delay: 0.15 + index * 0.08 }}>
              <KeyCap char={char} tone="bold" className="min-w-14 rounded-xl border-b-4 py-2 text-2xl" />
            </motion.span>
          ))}
          <p className="min-w-0 flex-1 basis-48 text-sm text-muted-foreground">{lesson.tip}</p>
        </div>

        <SampleLine lesson={lesson} />

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold">Earn three stars</span>
          <ul className="grid gap-2 @xl:grid-cols-3">
            {STAR_RULES.map((rule, index) => (
              <li key={rule} className="flex items-center gap-2 rounded-xl bg-foreground/5 px-3 py-2 text-xs">
                <span className="flex shrink-0 items-center text-warning" aria-hidden="true">
                  {Array.from({ length: index + 1 }, (_, star) => <StarIcon key={star} weight="fill" className="size-3.5" />)}
                </span>
                <span>{index === 1 ? `${lesson.goalAccuracy}% accuracy` : index === 2 ? `${lesson.goalWpm} WPM too` : rule}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3 @md:flex-row @md:items-center">
          {preview
            ? <PracticeLink className="px-6 py-3 text-base">Practice typing now</PracticeLink>
            : <PracticeLink className="px-6 py-3 text-base">Start today's lesson</PracticeLink>}
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ClockIcon className="size-4" aria-hidden="true" />
            {preview ? "This lesson opens soon. Practice is open now." : `About ${lesson.minutes} minutes`}
          </span>
        </div>
      </motion.section>

      <div className="flex min-w-0 flex-col gap-4">
        {preview ? <PreviewSide /> : <LiveSide current={lesson} />}
      </div>
    </div>
  );
}

/** A pretend student types the sample so you can see the new keys in action. */
function SampleLine({ lesson }: { lesson: Lesson }) {
  const reduced = useReducedMotion();
  const [typed, setTyped] = useState(0);
  const length = lesson.sample.length;
  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => setTyped((value) => value >= length + 6 ? 0 : value + 1), 180);
    return () => window.clearInterval(timer);
  }, [length, reduced]);
  const shown = reduced ? 0 : Math.min(typed, length);

  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-3">
      <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">You will type</span>
      <span className="sr-only">{lesson.sample}</span>
      <p aria-hidden="true" className="break-words font-mono text-lg leading-relaxed @lg:text-xl">
        {lesson.sample.split("").map((char, index) => (
          <span key={index} className={cn(
            "relative",
            index < shown ? "text-foreground" : "text-muted-foreground/60",
            lesson.keys.includes(char) && "font-bold text-primary",
            index === shown && !reduced && "before:absolute before:-left-px before:top-1 before:h-[1.1em] before:w-0.5 before:bg-primary motion-safe:before:animate-pulse",
          )}>{char}</span>
        ))}
      </p>
    </div>
  );
}

function LiveSide({ current }: { current: Lesson }) {
  const course = courseProgress(false);
  const index = ALL_LESSONS.findIndex((entry) => entry.lesson.id === current.id);
  const upcoming = ALL_LESSONS.slice(index + 1, index + 3);
  const last = ALL_LESSONS[index - 1];
  const streak = WEEK.filter((day) => day.done).length;
  return (
    <>
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4">
        <span className="flex items-center justify-between text-sm font-bold">
          <span className="inline-flex items-center gap-1.5"><CalendarCheckIcon weight="fill" className="size-4 text-primary" aria-hidden="true" />This week</span>
          <span className="inline-flex items-center gap-1 text-xs text-warning"><FireIcon weight="fill" className="size-4" aria-hidden="true" />{streak} days</span>
        </span>
        <ol className="grid grid-cols-5 gap-1.5">
          {WEEK.map((day) => (
            <li key={day.day} className="flex flex-col items-center gap-1 text-[0.65rem] text-muted-foreground">
              <span className={cn("flex size-8 items-center justify-center rounded-full", day.done ? "bg-success text-background" : day.today ? "border-2 border-dashed border-primary text-primary" : "bg-foreground/10")}>
                {day.done && <CheckIcon weight="bold" className="size-4" aria-hidden="true" />}
              </span>
              <span className={cn(day.today && "font-bold text-primary")}>{day.today ? "Today" : day.day}</span>
              <span className="sr-only">{day.done ? "lesson done" : day.today ? "not yet" : "no lesson"}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex items-center gap-3 rounded-3xl border border-border bg-card p-4">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-warning text-background"><StarIcon weight="fill" className="size-6" aria-hidden="true" /></span>
        <span className="flex flex-col">
          <span className="text-lg font-bold">{course.stars} stars</span>
          <span className="text-xs text-muted-foreground">{course.done} lessons done so far</span>
        </span>
      </div>

      {last && (
        <div className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-4">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">Last time</span>
          <span className="flex items-center justify-between gap-2 text-sm font-semibold">{last.lesson.title}<Stars count={last.lesson.stars} /></span>
          <span className="text-xs text-muted-foreground">Want the last star? You can play it again any time.</span>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-4">
        <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">Coming up</span>
        <ul className="flex flex-col gap-1.5">
          {upcoming.map(({ unit, lesson }) => (
            <li key={lesson.id} className="flex items-center gap-2 text-sm text-muted-foreground">
              <UnitTile unit={unit} size="sm" />
              <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
              <LockSimpleIcon weight="fill" className="size-3.5 shrink-0" aria-hidden="true" /><span className="sr-only">Locked</span>
            </li>
          ))}
        </ul>
      </div>
      <PracticeLink quiet>Free practice instead</PracticeLink>
    </>
  );
}

function PreviewSide() {
  return (
    <>
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold">What you will learn</span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-semibold text-accent-foreground">Coming soon</span>
        </span>
        <ol className="flex flex-col gap-2">
          {UNITS.map((unit) => (
            <li key={unit.id} className="flex items-center gap-2">
              <UnitTile unit={unit} size="sm" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold">{unit.title}</span>
                <span className="truncate text-[0.65rem] text-muted-foreground">{unit.lessons.length} lessons · {unit.keys.split("").join(" ")}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-4">
        <span className="text-sm font-bold">Get ready</span>
        <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          {["Sit up tall with your feet flat.", "Find the little bumps on F and J.", "Look at the screen, not your hands."].map((tip) => (
            <li key={tip} className="flex items-start gap-2"><CheckIcon weight="bold" className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />{tip}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
