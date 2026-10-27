import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightIcon, XIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { KEY_ROWS, LESSON_SPRING, SHIFTED, UNITS, baseKey, lessonsForKey, nextLesson, statusOf, type Lesson, type Unit } from "./lessons-mock";
import { ComingSoonBanner, KeyCap, PageTitle, PracticeLink, StatusPill, UnitTile } from "./LessonParts";

type KeyState = "learned" | "learning" | "new";

// Each row sits a little further right, like a real keyboard.
const ROW_SHIFT = [0, 2, 3.5, 5.5];
const KEY_TONE: Record<KeyState, string> = {
  learned: "border-success/50 bg-success/15 text-success",
  learning: "border-primary bg-primary text-primary-foreground",
  new: "border-border bg-foreground/5 text-muted-foreground",
};
const KEY_WORD: Record<KeyState, string> = { learned: "learned", learning: "learning now", new: "not learned yet" };

function keyState(char: string): KeyState {
  const lessons = lessonsForKey(char).map((entry) => entry.lesson.progress);
  if (lessons.includes("done")) return "learned";
  if (lessons.includes("current")) return "learning";
  return "new";
}

const unitOfKey = (char: string): Unit | undefined => lessonsForKey(char)[0]?.unit;
const unitKeys = (unit: Unit) => unit.keys.split("").map(baseKey);

/** 03 Key picker: tap keys on a big keyboard to see which lessons teach them, or pick a whole row. */
export function KeyPicker({ preview }: { preview: boolean }) {
  const [picked, setPicked] = useState<string[]>(nextLesson(preview).lesson.keys.split(""));
  const toggleKey = (char: string) => setPicked((keys) => keys.includes(char) ? keys.filter((key) => key !== char) : [...keys, char]);
  const lessons = uniqueLessons(picked);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageTitle title="Pick your keys">Tap the keys you want to learn, or pick a whole row. We will find the lessons that teach them.</PageTitle>
      {preview && <ComingSoonBanner>Lessons open soon. Explore the keyboard to see which unit teaches each key, then practise now.</ComingSoonBanner>}

      <div className="grid grid-cols-1 gap-5 @3xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex min-w-0 flex-col gap-4 rounded-3xl border border-border bg-card p-3 @md:p-5">
          <div role="group" aria-label="Pick a unit" className="flex flex-wrap gap-1.5">
            {UNITS.map((unit) => {
              const keys = unitKeys(unit);
              const active = keys.length === picked.length && keys.every((key) => picked.includes(key));
              return (
                <button key={unit.id} type="button" aria-pressed={active} onClick={() => setPicked(active ? [] : keys)}
                  className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-ring", active ? unit.soft : "border-border text-muted-foreground hover:bg-accent hover:text-foreground")}>
                  <unit.Icon weight="fill" className="size-3.5" aria-hidden="true" />{unit.title}
                </button>
              );
            })}
          </div>

          <div role="group" aria-label="Keyboard" className="flex flex-col gap-1 @md:gap-1.5">
            {KEY_ROWS.map((row, rowIndex) => (
              <div key={row} className="grid grid-cols-10 gap-1 @md:gap-1.5" style={{ paddingLeft: `${ROW_SHIFT[rowIndex]}%`, paddingRight: `${6 - ROW_SHIFT[rowIndex]}%` }}>
                {row.split("").map((char) => (
                  <Key key={char} char={char} picked={picked.includes(char)} preview={preview} onClick={() => toggleKey(char)} />
                ))}
              </div>
            ))}
            <div aria-hidden="true" className="mx-auto mt-0.5 h-6 w-1/2 rounded-md border-b-2 border-border bg-foreground/5 @md:h-8" />
          </div>

          <Legend preview={preview} />
        </div>

        <aside aria-label="Your pick" className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold">Your keys</h2>
            {picked.length > 0 && (
              <button type="button" onClick={() => setPicked([])} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                <XIcon className="size-3" aria-hidden="true" />Clear
              </button>
            )}
          </div>
          <div className="flex min-h-8 flex-wrap gap-1 text-base" aria-live="polite">
            <AnimatePresence initial={false} mode="popLayout">
              {picked.length === 0
                ? <motion.span key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-muted-foreground">Nothing picked yet. Tap a key.</motion.span>
                : picked.map((char) => (
                  <motion.span key={char} layout initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={LESSON_SPRING}>
                    <KeyCap char={SHIFTED[char] ? `${char} ${SHIFTED[char]}` : char} tone="bold" />
                  </motion.span>
                ))}
            </AnimatePresence>
          </div>

          {lessons.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">Taught in</span>
              <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
                {lessons.map(({ unit, lesson }) => (
                  <li key={lesson.id} className="flex items-center gap-2 rounded-xl bg-foreground/5 p-2">
                    <UnitTile unit={unit} size="sm" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-xs font-semibold">{lesson.title}</span>
                      <span className="truncate text-[0.65rem] text-muted-foreground">{unit.title}</span>
                    </span>
                    <StatusPill status={statusOf(lesson, preview)} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <PickActions lessons={lessons.map((entry) => entry.lesson)} preview={preview} hasKeys={picked.length > 0} />
        </aside>
      </div>
    </div>
  );
}

function Key({ char, picked, preview, onClick }: { char: string; picked: boolean; preview: boolean; onClick: () => void }) {
  const state = keyState(char);
  const unit = unitOfKey(char);
  const tone = preview ? unit?.soft ?? KEY_TONE.new : KEY_TONE[state];
  const symbol = SHIFTED[char];
  const label = `${char === ";" ? "semicolon" : char}${symbol ? ` and ${symbol}` : ""}, ${preview ? unit ? `taught in ${unit.title}` : "no lesson" : KEY_WORD[state]}`;
  return (
    <motion.button
      type="button"
      aria-pressed={picked}
      aria-label={label}
      onClick={onClick}
      animate={{ y: picked ? -3 : 0 }}
      whileTap={{ y: 1, scale: 0.94 }}
      transition={LESSON_SPRING}
      className={cn(
        "relative flex aspect-square min-w-0 items-center justify-center rounded-md border border-b-[3px] font-mono text-[0.65rem] font-bold uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring @md:rounded-lg @md:text-sm @2xl:text-base",
        tone,
        picked && "ring-2 ring-foreground ring-offset-1 ring-offset-card",
      )}
    >
      {symbol && <span aria-hidden="true" className="absolute left-0.5 top-0 hidden text-[0.5rem] opacity-70 @xs:block @md:left-1 @md:top-0.5 @md:text-[0.6rem]">{symbol}</span>}
      <span aria-hidden="true">{char}</span>
    </motion.button>
  );
}

function Legend({ preview }: { preview: boolean }) {
  const items = preview
    ? UNITS.map((unit) => ({ label: unit.title, tone: unit.soft }))
    : (["learned", "learning", "new"] as KeyState[]).map((state) => ({ label: { learned: "Learned", learning: "Learning now", new: "Not yet" }[state], tone: KEY_TONE[state] }));
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-[0.7rem] text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("size-3 rounded border", item.tone)} />{item.label}
        </li>
      ))}
    </ul>
  );
}

function PickActions({ lessons, preview, hasKeys }: { lessons: Lesson[]; preview: boolean; hasKeys: boolean }) {
  const current = lessons.find((entry) => statusOf(entry, preview) === "current");
  if (preview) {
    return (
      <div className="mt-auto flex flex-col gap-2 pt-2">
        <p className="text-xs text-muted-foreground">Picking your own keys to drill comes with lessons. The practice page is open now.</p>
        <PracticeLink />
      </div>
    );
  }
  return (
    <div className="mt-auto flex flex-col gap-2 pt-2">
      {current && <PracticeLink>Start {current.title}</PracticeLink>}
      {hasKeys
        ? <PracticeLink quiet>Drill just these keys</PracticeLink>
        : <span className="rounded-xl border border-dashed border-border px-4 py-2.5 text-center text-sm text-muted-foreground">Pick keys to drill them</span>}
      <span className="inline-flex items-center gap-1 text-[0.7rem] text-muted-foreground">
        <ArrowRightIcon className="size-3" aria-hidden="true" />Locked lessons open as you finish the ones before.
      </span>
    </div>
  );
}

function uniqueLessons(keys: string[]) {
  const seen = new Set<string>();
  return keys.flatMap((char) => lessonsForKey(char)).filter(({ lesson }) => {
    if (seen.has(lesson.id)) return false;
    seen.add(lesson.id);
    return true;
  });
}
