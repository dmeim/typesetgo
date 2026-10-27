// Mock-only pieces for the /temp keyboard showcase; the keyboard model itself lives in @/lib/keyboard-model.
export * from "@/lib/keyboard-model";
export type { BoardKey as MockKey } from "@/lib/keyboard-model";
export { findBoardKey as findMockKey } from "@/lib/keyboard-model";
export { HINT_STYLE } from "@/components/typing/keyboard/keyboard-hint-style";

export const TARGET = "Sam and Kit ran to the park.";

// A pretend student: types, fixes one mistake, skips one, and trips over Caps Lock.
// Uppercase letters mean Shift + key; ⌫ is Backspace, ⇪ is Caps Lock and numbers are pauses.
export const SCRIPT: (string | number)[] = [
  600, "Sam and Ki", "x", 1500, "⌫", 400, "t r", "e", "n", 1900, " ", 1200,
  "to ", 300, "⇪", 400, "t", 2000, "⇪", 600, "⌫", 400, "the park.", 1800,
];

export const DESIGNS: { name: string; summary: string }[] = [
  { name: "Keycaps", summary: "Chunky keys that press down, like the ones on the error screens. The next key bobs, delete wiggles red after a mistake, and a pill above says what to do." },
  { name: "Finger guide", summary: "Keys tinted by which finger presses them, with bumps on F and J. Two hands underneath light up the finger to use, including the pinky for delete and Caps Lock." },
  { name: "Spotlight", summary: "Quiet outline keys and one glowing spotlight that glides to the next key. Labels switch to capitals when Shift or Caps Lock is on, so you see what you'll type." },
  { name: "Compact", summary: "A shorter keyboard: the number row folds away until you need it or delete. An \"up next\" strip shows the next few keys, or how many letters to delete." },
  { name: "Coach", summary: "A speech bubble rides above the key to press and talks you through it: which Shift to hold, how to fix a mistake, or that you can skip the word." },
];

