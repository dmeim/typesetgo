// Pretend curriculum for the /lessons mockups. Nothing here is saved or loaded.
import { ArrowLineDownIcon, ArrowLineUpIcon, AtIcon, HashIcon, HouseLineIcon, type Icon } from "@phosphor-icons/react";

export { PROFILE_SPRING as LESSON_SPRING } from "@/components/profile/profile-sections";

/** `soon` is how every lesson reads while lessons are still a preview. */
export type LessonStatus = "done" | "current" | "locked" | "soon";

export interface Lesson {
  id: string;
  title: string;
  /** The new keys this lesson teaches. */
  keys: string;
  goalWpm: number;
  goalAccuracy: number;
  minutes: number;
  /** The pretend student's progress once lessons are live. */
  progress: "done" | "current" | "locked";
  stars: number;
  best?: { wpm: number; accuracy: number };
  /** A finger tip for the new keys. */
  tip: string;
  sample: string;
}

export interface Unit {
  id: string;
  title: string;
  blurb: string;
  keys: string;
  Icon: Icon;
  /** Solid tile colour; theme tokens so every theme stays legible. */
  tile: string;
  /** Text colour that matches the tile. */
  tint: string;
  /** A soft wash of the tile colour for keys and chips. */
  soft: string;
  lessons: Lesson[];
}

type LessonSeed = [id: string, title: string, keys: string, wpm: number, accuracy: number, progress: Lesson["progress"], stars: number, tip: string, sample: string];

const lesson = ([id, title, keys, goalWpm, goalAccuracy, progress, stars, tip, sample]: LessonSeed): Lesson => ({
  id, title, keys, goalWpm, goalAccuracy, minutes: 5, progress, stars, tip, sample,
  best: progress === "done" ? { wpm: goalWpm + 2 + stars * 2, accuracy: Math.min(100, goalAccuracy + stars * 2) } : undefined,
});

export const UNITS: Unit[] = [
  {
    id: "home", title: "Home row", blurb: "Where your fingers live. Find the bumps on F and J.", keys: "asdfghjkl;",
    Icon: HouseLineIcon, tile: "bg-success text-background", tint: "text-success", soft: "border-success/50 bg-success/15 text-success",
    lessons: ([
      ["home-1", "Find the bumps", "fj", 8, 90, "done", 3, "Rest your pointer fingers on the little bumps on F and J.", "fff jjj fj jf fjf jfj"],
      ["home-2", "Left hand home", "asd", 8, 90, "done", 3, "Pinky on A, ring on S, middle on D.", "sad dad add fad as"],
      ["home-3", "Right hand home", "kl;", 8, 90, "done", 2, "Middle on K, ring on L, pinky on the semicolon.", "lk; jkl ask; lad;"],
      ["home-4", "Reach for G and H", "gh", 10, 90, "done", 3, "Slide your pointer fingers one key toward the middle.", "gag has hag dash glad"],
      ["home-5", "Home row words", "asdfghjkl;", 10, 92, "done", 2, "Every word here uses only home row keys.", "a sad lad had a glass flask"],
    ] satisfies LessonSeed[]).map(lesson),
  },
  {
    id: "top", title: "Top row", blurb: "Reach up from home and come straight back.", keys: "qwertyuiop",
    Icon: ArrowLineUpIcon, tile: "bg-primary text-primary-foreground", tint: "text-primary", soft: "border-primary/50 bg-primary/15 text-primary",
    lessons: ([
      ["top-1", "E and I", "ei", 10, 90, "done", 3, "Middle fingers reach up for E and I.", "see lid dies feel side"],
      ["top-2", "R and U", "ru", 10, 90, "done", 2, "Pointer fingers reach up for R and U.", "rug sure fur rush jar"],
      ["top-3", "T and Y", "ty", 12, 90, "current", 0, "Left pointer stretches up for T, right pointer for Y.", "try the toy at your gate"],
      ["top-4", "W and O", "wo", 12, 90, "locked", 0, "Ring fingers reach up for W and O.", "wow how two slow world"],
      ["top-5", "Q and P", "qp", 12, 90, "locked", 0, "Pinkies reach up for Q and P.", "quip quiet pop equip"],
      ["top-6", "Top row words", "qwertyuiop", 14, 92, "locked", 0, "Mix the top row with home row keys.", "your quiet tiger types out loud"],
    ] satisfies LessonSeed[]).map(lesson),
  },
  {
    id: "bottom", title: "Bottom row", blurb: "Curl down for the bottom keys, then home again.", keys: "zxcvbnm,./",
    Icon: ArrowLineDownIcon, tile: "bg-warning text-background", tint: "text-warning", soft: "border-warning/50 bg-warning/15 text-warning",
    lessons: ([
      ["bottom-1", "V, B, N and M", "vbnm", 14, 90, "locked", 0, "Pointer fingers curl down for V, B, N and M.", "move vine bean many"],
      ["bottom-2", "C and comma", "c,", 14, 90, "locked", 0, "Middle fingers curl down for C and the comma.", "cat, cub, can, cave"],
      ["bottom-3", "X and full stop", "x.", 14, 90, "locked", 0, "Ring fingers curl down for X and the full stop.", "fix the box. mix it."],
      ["bottom-4", "Z and slash", "z/", 14, 92, "locked", 0, "Pinkies curl down for Z and the slash.", "zip/zap fizz/buzz"],
    ] satisfies LessonSeed[]).map(lesson),
  },
  {
    id: "numbers", title: "Numbers", blurb: "Stretch to the very top for 1 to 0.", keys: "1234567890",
    Icon: HashIcon, tile: "bg-(--accent-emphasis) text-background", tint: "text-(--accent-emphasis)", soft: "border-(--accent-emphasis)/50 bg-(--accent-emphasis)/15 text-(--accent-emphasis)",
    lessons: ([
      ["numbers-1", "1 to 5", "12345", 12, 90, "locked", 0, "Left hand climbs two rows for 1 to 5.", "12 34 51 243 5 cats"],
      ["numbers-2", "6 to 0", "67890", 12, 90, "locked", 0, "Right hand climbs two rows for 6 to 0.", "60 78 90 7 dogs 86"],
      ["numbers-3", "Number mix", "1234567890", 14, 92, "locked", 0, "Numbers and words together.", "we read 12 books in 30 days"],
    ] satisfies LessonSeed[]).map(lesson),
  },
  {
    id: "symbols", title: "Symbols", blurb: "Hold Shift with the other hand for symbols.", keys: "!@#?()",
    Icon: AtIcon, tile: "bg-destructive text-background", tint: "text-destructive", soft: "border-destructive/50 bg-destructive/15 text-destructive",
    lessons: ([
      ["symbols-1", "! and ?", "!?", 12, 90, "locked", 0, "Shift plus 1 for !, Shift plus slash for ?.", "wow! really? yes! why?"],
      ["symbols-2", "@ and #", "@#", 12, 90, "locked", 0, "Shift plus 2 for @, Shift plus 3 for #.", "@class #1 @home #fun"],
      ["symbols-3", "Brackets", "()", 12, 92, "locked", 0, "Shift plus 9 and 0 for ( and ).", "(yes) (no) (maybe)"],
    ] satisfies LessonSeed[]).map(lesson),
  },
];

export const ALL_LESSONS = UNITS.flatMap((unit) => unit.lessons.map((entry) => ({ unit, lesson: entry })));
export const LESSON_COUNT = ALL_LESSONS.length;
export const COURSE_MINUTES = ALL_LESSONS.reduce((total, entry) => total + entry.lesson.minutes, 0);

export const statusOf = (entry: Lesson, preview: boolean): LessonStatus => preview ? "soon" : entry.progress;

export function unitProgress(unit: Unit, preview: boolean) {
  const done = preview ? 0 : unit.lessons.filter((entry) => entry.progress === "done").length;
  const stars = preview ? 0 : unit.lessons.reduce((total, entry) => total + entry.stars, 0);
  const current = !preview && unit.lessons.some((entry) => entry.progress === "current");
  const state: "complete" | "active" | "locked" | "soon" = preview ? "soon" : done === unit.lessons.length ? "complete" : current ? "active" : "locked";
  return { done, total: unit.lessons.length, stars, maxStars: unit.lessons.length * 3, state };
}

export function courseProgress(preview: boolean) {
  const units = UNITS.map((unit) => unitProgress(unit, preview));
  return {
    done: units.reduce((total, unit) => total + unit.done, 0),
    stars: units.reduce((total, unit) => total + unit.stars, 0),
    maxStars: LESSON_COUNT * 3,
  };
}

/** The lesson to do next: the current one once live, the very first one in the preview. */
export function nextLesson(preview: boolean) {
  return (preview ? ALL_LESSONS[0] : ALL_LESSONS.find((entry) => entry.lesson.progress === "current")) ?? ALL_LESSONS[0];
}

export function unitOfLesson(id: string) {
  return UNITS.find((unit) => unit.lessons.some((entry) => entry.id === id)) ?? UNITS[0];
}

/** Lessons that introduce a key; number keys also count for the symbols typed with Shift. */
export function lessonsForKey(char: string) {
  const shifted = SHIFTED[char];
  return ALL_LESSONS.filter(({ lesson: entry }) => entry.keys.includes(char) || (shifted !== undefined && entry.keys.includes(shifted)));
}

export const SHIFTED: Record<string, string> = { "1": "!", "2": "@", "3": "#", "9": "(", "0": ")", "/": "?" };

/** The key you press (with Shift) for a symbol. */
export const baseKey = (char: string) => Object.entries(SHIFTED).find(([, symbol]) => symbol === char)?.[0] ?? char;

export const KEY_ROWS = ["1234567890", "qwertyuiop", "asdfghjkl;", "zxcvbnm,./"];

/** The pretend student's week: which days had a lesson. */
export const WEEK = [
  { day: "Mon", done: true },
  { day: "Tue", done: true },
  { day: "Wed", done: false },
  { day: "Thu", done: true },
  { day: "Fri", done: false, today: true },
];

export const STAR_RULES = ["Finish the lesson", "Reach the accuracy goal", "Reach the speed goal too"];
