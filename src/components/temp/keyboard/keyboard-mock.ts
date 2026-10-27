// Shared keyboard model for the /temp on-screen keyboard mockups.
import { ArrowFatLineUpIcon, BackspaceIcon, SkipForwardIcon, WarningCircleIcon, type Icon } from "@phosphor-icons/react";
import { KEYBOARD_LAYOUTS, type KeyboardLayoutId } from "@/lib/keyboard-layouts";

export type Finger = "lp" | "lr" | "lm" | "li" | "ri" | "rm" | "rr" | "rp" | "thumb";

export interface MockKey {
  id: string;
  key: string;
  label: string;
  shiftLabel?: string;
  type: "letter" | "number" | "symbol" | "space" | "caps" | "shift" | "backspace" | "tab" | "enter";
  width: number;
  finger: Finger;
  row: number;
}

// Which finger presses each physical position; the same for QWERTY, Dvorak and Colemak.
const FINGERS: Finger[][] = [
  ["lp", "lp", "lr", "lm", "li", "li", "ri", "ri", "rm", "rr", "rp", "rp", "rp", "rp"],
  ["lp", "lp", "lr", "lm", "li", "li", "ri", "ri", "rm", "rr", "rp", "rp", "rp", "rp"],
  ["lp", "lp", "lr", "lm", "li", "li", "ri", "ri", "rm", "rr", "rp", "rp", "rp"],
  ["lp", "lp", "lr", "lm", "li", "li", "ri", "ri", "rm", "rr", "rp", "rp"],
  ["thumb"],
];

export const FINGER_NAMES: Record<Finger, string> = {
  lp: "left pinky", lr: "left ring finger", lm: "left middle finger", li: "left index finger",
  ri: "right index finger", rm: "right middle finger", rr: "right ring finger", rp: "right pinky", thumb: "thumb",
};

/** The layout plus Tab, Enter and a right Shift, so every row is the same width like a real keyboard. */
export function buildRows(layoutId: KeyboardLayoutId): MockKey[][] {
  const source = KEYBOARD_LAYOUTS[layoutId].rows;
  const extras: [MockKey["type"], string, string, number, "start" | "end"][][] = [
    [],
    [["tab", "Tab", "tab", 1.5, "start"]],
    [["enter", "Enter", "enter", 1.75, "end"]],
    [["shift", "ShiftRight", "shift", 2.5, "end"]],
    [],
  ];
  return source.map((row, rowIndex) => {
    const keys: Omit<MockKey, "id" | "row" | "finger">[] = row.map((keyDef) => ({
      key: keyDef.key,
      label: keyDef.type === "backspace" ? "delete" : keyDef.type === "caps" ? "caps" : keyDef.type === "shift" ? "shift" : keyDef.label,
      shiftLabel: keyDef.shiftKey,
      type: keyDef.type ?? "symbol",
      width: keyDef.type === "shift" ? 2 : keyDef.type === "caps" ? 1.75 : keyDef.width ?? 1,
    }));
    for (const [type, key, label, width, side] of extras[rowIndex]) {
      const extra = { key, label, type, width };
      if (side === "start") keys.unshift(extra); else keys.push(extra);
    }
    return keys.map((entry, index) => ({ ...entry, id: `${rowIndex}-${index}`, row: rowIndex, finger: FINGERS[rowIndex][index] ?? "rp" }));
  });
}

export function rowUnits(row: MockKey[]) {
  return row.reduce((sum, key) => sum + key.width, 0);
}

/** The key that types a character, and whether Shift is part of it. */
export function findMockKey(rows: MockKey[][], char: string): { key: MockKey; shift: boolean } | null {
  for (const row of rows) {
    for (const key of row) {
      if (char === "Backspace" && key.type === "backspace") return { key, shift: false };
      if (char === " " && key.type === "space") return { key, shift: false };
      if (key.type === "letter" && key.key === char.toLowerCase()) return { key, shift: char !== char.toLowerCase() };
      if ((key.type === "number" || key.type === "symbol") && (key.key === char || key.shiftLabel === char)) return { key, shift: key.shiftLabel === char };
    }
  }
  return null;
}

export function isLeftHand(finger: Finger) {
  return finger.startsWith("l");
}

export const TARGET = "Sam and Kit ran to the park.";

// A pretend student: types, fixes one mistake, skips one, and trips over Caps Lock.
// Uppercase letters mean Shift + key; ⌫ is Backspace, ⇪ is Caps Lock and numbers are pauses.
export const SCRIPT: (string | number)[] = [
  600, "Sam and Ki", "x", 1500, "⌫", 400, "t r", "e", "n", 1900, " ", 1200,
  "to ", 300, "⇪", 400, "t", 2000, "⇪", 600, "⌫", 400, "the park.", 1800,
];

export type HintTone = "caps" | "mistake" | "ignored" | "skipped";

export interface Hint {
  tone: HintTone;
  title: string;
  detail: string;
}

export const HINT_STYLE: Record<HintTone, { Icon: Icon; pill: string; text: string }> = {
  caps: { Icon: ArrowFatLineUpIcon, pill: "bg-warning/15 text-warning", text: "text-warning" },
  mistake: { Icon: BackspaceIcon, pill: "bg-destructive/15 text-destructive", text: "text-destructive" },
  ignored: { Icon: WarningCircleIcon, pill: "bg-destructive/15 text-destructive", text: "text-destructive" },
  skipped: { Icon: SkipForwardIcon, pill: "bg-muted text-muted-foreground", text: "text-muted-foreground" },
};

export interface KeyboardModel {
  rows: MockKey[][];
  /** The key to press next, or Backspace while a mistake is waiting. */
  next: MockKey | null;
  /** The Shift on the other hand, when the next character needs one. */
  shift: MockKey | null;
  /** Keys pressed in the last moment. */
  pressed: Set<string>;
  caps: boolean;
  /** Letters past the last correct one in the current word. */
  toDelete: number;
  hint: Hint | null;
  /** The next few characters and where they sit in the text, for previews. */
  upcoming: { char: string; at: number }[];
}

export function describeHint(caps: boolean, toDelete: number, skipped: boolean): Hint | null {
  if (caps) {
    return { tone: "caps", title: "Caps Lock is on", detail: toDelete ? "Press Caps Lock to turn it off, then delete to fix" : "Press Caps Lock to turn it off" };
  }
  if (toDelete >= 2) {
    return { tone: "ignored", title: `${toDelete} letters to fix`, detail: `Press delete ${toDelete} times, or space to skip this word` };
  }
  if (toDelete === 1) return { tone: "mistake", title: "Oops, wrong letter", detail: "Press delete to fix it" };
  if (skipped) return { tone: "skipped", title: "Word skipped", detail: "It stays marked as a mistake. Keep going!" };
  return null;
}

/** Whether a key shows its shifted character, so labels match what pressing it would type. */
export function showsUpper(key: MockKey, caps: boolean, shiftHeld: boolean) {
  return key.type === "letter" ? caps !== shiftHeld : shiftHeld;
}

export function keyText(key: MockKey, upper: boolean) {
  if (key.type === "letter") return upper ? key.label.toUpperCase() : key.label.toLowerCase();
  if (upper && key.shiftLabel) return key.shiftLabel;
  return key.label;
}

export type KeyRole = "next" | "shift" | "fix" | "caps" | "skip" | null;

/** What a key is doing right now: the one to press, the Shift to hold, delete for a mistake, a Caps Lock that is on, or space to skip. */
export function keyRole(model: KeyboardModel, key: MockKey): KeyRole {
  if (key.type === "caps" && model.caps) return "caps";
  if (model.next?.id === key.id) return key.type === "backspace" ? "fix" : "next";
  if (model.shift?.id === key.id) return "shift";
  if (model.toDelete >= 2 && key.type === "space") return "skip";
  return null;
}

/** Wide keys get short words instead of a single character. */
export function isWide(key: MockKey) {
  return ["tab", "caps", "shift", "backspace", "enter", "space"].includes(key.type);
}

export const DESIGNS: { name: string; summary: string }[] = [
  { name: "Keycaps", summary: "Chunky keys that press down, like the ones on the error screens. The next key bobs, delete wiggles red after a mistake, and a pill above says what to do." },
  { name: "Finger guide", summary: "Keys tinted by which finger presses them, with bumps on F and J. Two hands underneath light up the finger to use, including the pinky for delete and Caps Lock." },
  { name: "Spotlight", summary: "Quiet outline keys and one glowing spotlight that glides to the next key. Labels switch to capitals when Shift or Caps Lock is on, so you see what you'll type." },
  { name: "Compact", summary: "A shorter keyboard: the number row folds away until you need it or delete. An \"up next\" strip shows the next few keys, or how many letters to delete." },
  { name: "Coach", summary: "A speech bubble rides above the key to press and talks you through it: which Shift to hold, how to fix a mistake, or that you can skip the word." },
];

/** The Shift on the opposite hand to the key, which is how touch typists are taught. */
export function oppositeShift(rows: MockKey[][], key: MockKey) {
  return rows[3].find((candidate) => candidate.key === (isLeftHand(key.finger) ? "ShiftRight" : "Shift")) ?? null;
}

interface ModelState {
  caps?: boolean;
  toDelete?: number;
  skipped?: boolean;
  pressed?: Set<string>;
  upcoming?: KeyboardModel["upcoming"];
}

/** Everything a keyboard design draws, from the next character and the typing state. */
export function modelFor(rows: MockKey[][], nextChar: string | null, { caps = false, toDelete = 0, skipped = false, pressed = new Set(), upcoming = [] }: ModelState = {}): KeyboardModel {
  const match = nextChar ? findMockKey(rows, nextChar) : null;
  const needsShift = !!match?.shift && !(match.key.type === "letter" && caps);
  return {
    rows,
    next: match?.key ?? null,
    shift: needsShift && match ? oppositeShift(rows, match.key) : null,
    pressed,
    caps,
    toDelete,
    hint: describeHint(caps, toDelete, skipped),
    upcoming,
  };
}

export type KeyboardStyle = "spotlight" | "finger" | "keycaps" | "legacy";

export const KEYBOARD_STYLES: { value: KeyboardStyle; name: string; summary: string }[] = [
  { value: "spotlight", name: "Spotlight", summary: "Quiet keys and one glow that glides to the next key." },
  { value: "finger", name: "Finger guide", summary: "Keys coloured by finger, with hands that show which finger to use." },
  { value: "keycaps", name: "Keycaps", summary: "Chunky keys that press down, with a hint above." },
  { value: "legacy", name: "Legacy", summary: "Today's keyboard, unchanged." },
];
