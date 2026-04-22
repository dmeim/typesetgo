export type KeyboardLayoutId = "qwerty" | "dvorak" | "colemak";

export interface KeyDefinition {
  key: string;
  label: string;
  shiftKey?: string;
  width?: number;
  type?: "letter" | "number" | "symbol" | "space" | "caps" | "shift";
}

export interface KeyboardLayout {
  id: KeyboardLayoutId;
  name: string;
  rows: KeyDefinition[][];
}

const QWERTY_LAYOUT: KeyboardLayout = {
  id: "qwerty",
  name: "QWERTY",
  rows: [
    [
      { key: "`", label: "`", shiftKey: "~", type: "symbol" },
      { key: "1", label: "1", shiftKey: "!", type: "number" },
      { key: "2", label: "2", shiftKey: "@", type: "number" },
      { key: "3", label: "3", shiftKey: "#", type: "number" },
      { key: "4", label: "4", shiftKey: "$", type: "number" },
      { key: "5", label: "5", shiftKey: "%", type: "number" },
      { key: "6", label: "6", shiftKey: "^", type: "number" },
      { key: "7", label: "7", shiftKey: "&", type: "number" },
      { key: "8", label: "8", shiftKey: "*", type: "number" },
      { key: "9", label: "9", shiftKey: "(", type: "number" },
      { key: "0", label: "0", shiftKey: ")", type: "number" },
      { key: "-", label: "-", shiftKey: "_", type: "symbol" },
      { key: "=", label: "=", shiftKey: "+", type: "symbol" },
    ],
    [
      { key: "q", label: "Q", type: "letter" },
      { key: "w", label: "W", type: "letter" },
      { key: "e", label: "E", type: "letter" },
      { key: "r", label: "R", type: "letter" },
      { key: "t", label: "T", type: "letter" },
      { key: "y", label: "Y", type: "letter" },
      { key: "u", label: "U", type: "letter" },
      { key: "i", label: "I", type: "letter" },
      { key: "o", label: "O", type: "letter" },
      { key: "p", label: "P", type: "letter" },
      { key: "[", label: "[", shiftKey: "{", type: "symbol" },
      { key: "]", label: "]", shiftKey: "}", type: "symbol" },
      { key: "\\", label: "\\", shiftKey: "|", type: "symbol" },
    ],
    [
      { key: "CapsLock", label: "CAPS", type: "caps", width: 1.5 },
      { key: "a", label: "A", type: "letter" },
      { key: "s", label: "S", type: "letter" },
      { key: "d", label: "D", type: "letter" },
      { key: "f", label: "F", type: "letter" },
      { key: "g", label: "G", type: "letter" },
      { key: "h", label: "H", type: "letter" },
      { key: "j", label: "J", type: "letter" },
      { key: "k", label: "K", type: "letter" },
      { key: "l", label: "L", type: "letter" },
      { key: ";", label: ";", shiftKey: ":", type: "symbol" },
      { key: "'", label: "'", shiftKey: "\"", type: "symbol" },
    ],
    [
      { key: "Shift", label: "SHIFT", type: "shift", width: 2 },
      { key: "z", label: "Z", type: "letter" },
      { key: "x", label: "X", type: "letter" },
      { key: "c", label: "C", type: "letter" },
      { key: "v", label: "V", type: "letter" },
      { key: "b", label: "B", type: "letter" },
      { key: "n", label: "N", type: "letter" },
      { key: "m", label: "M", type: "letter" },
      { key: ",", label: ",", shiftKey: "<", type: "symbol" },
      { key: ".", label: ".", shiftKey: ">", type: "symbol" },
      { key: "/", label: "/", shiftKey: "?", type: "symbol" },
    ],
    [
      { key: " ", label: "", type: "space", width: 8 },
    ],
  ],
};

const DVORAK_LAYOUT: KeyboardLayout = {
  id: "dvorak",
  name: "Dvorak",
  rows: [
    [
      { key: "`", label: "`", shiftKey: "~", type: "symbol" },
      { key: "1", label: "1", shiftKey: "!", type: "number" },
      { key: "2", label: "2", shiftKey: "@", type: "number" },
      { key: "3", label: "3", shiftKey: "#", type: "number" },
      { key: "4", label: "4", shiftKey: "$", type: "number" },
      { key: "5", label: "5", shiftKey: "%", type: "number" },
      { key: "6", label: "6", shiftKey: "^", type: "number" },
      { key: "7", label: "7", shiftKey: "&", type: "number" },
      { key: "8", label: "8", shiftKey: "*", type: "number" },
      { key: "9", label: "9", shiftKey: "(", type: "number" },
      { key: "0", label: "0", shiftKey: ")", type: "number" },
      { key: "[", label: "[", shiftKey: "{", type: "symbol" },
      { key: "]", label: "]", shiftKey: "}", type: "symbol" },
    ],
    [
      { key: "'", label: "'", shiftKey: "\"", type: "symbol" },
      { key: ",", label: ",", shiftKey: "<", type: "symbol" },
      { key: ".", label: ".", shiftKey: ">", type: "symbol" },
      { key: "p", label: "P", type: "letter" },
      { key: "y", label: "Y", type: "letter" },
      { key: "f", label: "F", type: "letter" },
      { key: "g", label: "G", type: "letter" },
      { key: "c", label: "C", type: "letter" },
      { key: "r", label: "R", type: "letter" },
      { key: "l", label: "L", type: "letter" },
      { key: "/", label: "/", shiftKey: "?", type: "symbol" },
      { key: "=", label: "=", shiftKey: "+", type: "symbol" },
      { key: "\\", label: "\\", shiftKey: "|", type: "symbol" },
    ],
    [
      { key: "CapsLock", label: "CAPS", type: "caps", width: 1.5 },
      { key: "a", label: "A", type: "letter" },
      { key: "o", label: "O", type: "letter" },
      { key: "e", label: "E", type: "letter" },
      { key: "u", label: "U", type: "letter" },
      { key: "i", label: "I", type: "letter" },
      { key: "d", label: "D", type: "letter" },
      { key: "h", label: "H", type: "letter" },
      { key: "t", label: "T", type: "letter" },
      { key: "n", label: "N", type: "letter" },
      { key: "s", label: "S", type: "letter" },
      { key: "-", label: "-", shiftKey: "_", type: "symbol" },
    ],
    [
      { key: "Shift", label: "SHIFT", type: "shift", width: 2 },
      { key: ";", label: ";", shiftKey: ":", type: "symbol" },
      { key: "q", label: "Q", type: "letter" },
      { key: "j", label: "J", type: "letter" },
      { key: "k", label: "K", type: "letter" },
      { key: "x", label: "X", type: "letter" },
      { key: "b", label: "B", type: "letter" },
      { key: "m", label: "M", type: "letter" },
      { key: "w", label: "W", type: "letter" },
      { key: "v", label: "V", type: "letter" },
      { key: "z", label: "Z", type: "letter" },
    ],
    [
      { key: " ", label: "", type: "space", width: 8 },
    ],
  ],
};

const COLEMAK_LAYOUT: KeyboardLayout = {
  id: "colemak",
  name: "Colemak",
  rows: [
    [
      { key: "`", label: "`", shiftKey: "~", type: "symbol" },
      { key: "1", label: "1", shiftKey: "!", type: "number" },
      { key: "2", label: "2", shiftKey: "@", type: "number" },
      { key: "3", label: "3", shiftKey: "#", type: "number" },
      { key: "4", label: "4", shiftKey: "$", type: "number" },
      { key: "5", label: "5", shiftKey: "%", type: "number" },
      { key: "6", label: "6", shiftKey: "^", type: "number" },
      { key: "7", label: "7", shiftKey: "&", type: "number" },
      { key: "8", label: "8", shiftKey: "*", type: "number" },
      { key: "9", label: "9", shiftKey: "(", type: "number" },
      { key: "0", label: "0", shiftKey: ")", type: "number" },
      { key: "-", label: "-", shiftKey: "_", type: "symbol" },
      { key: "=", label: "=", shiftKey: "+", type: "symbol" },
    ],
    [
      { key: "q", label: "Q", type: "letter" },
      { key: "w", label: "W", type: "letter" },
      { key: "f", label: "F", type: "letter" },
      { key: "p", label: "P", type: "letter" },
      { key: "g", label: "G", type: "letter" },
      { key: "j", label: "J", type: "letter" },
      { key: "l", label: "L", type: "letter" },
      { key: "u", label: "U", type: "letter" },
      { key: "y", label: "Y", type: "letter" },
      { key: ";", label: ";", shiftKey: ":", type: "symbol" },
      { key: "[", label: "[", shiftKey: "{", type: "symbol" },
      { key: "]", label: "]", shiftKey: "}", type: "symbol" },
      { key: "\\", label: "\\", shiftKey: "|", type: "symbol" },
    ],
    [
      { key: "CapsLock", label: "CAPS", type: "caps", width: 1.5 },
      { key: "a", label: "A", type: "letter" },
      { key: "r", label: "R", type: "letter" },
      { key: "s", label: "S", type: "letter" },
      { key: "t", label: "T", type: "letter" },
      { key: "d", label: "D", type: "letter" },
      { key: "h", label: "H", type: "letter" },
      { key: "n", label: "N", type: "letter" },
      { key: "e", label: "E", type: "letter" },
      { key: "i", label: "I", type: "letter" },
      { key: "o", label: "O", type: "letter" },
      { key: "'", label: "'", shiftKey: "\"", type: "symbol" },
    ],
    [
      { key: "Shift", label: "SHIFT", type: "shift", width: 2 },
      { key: "z", label: "Z", type: "letter" },
      { key: "x", label: "X", type: "letter" },
      { key: "c", label: "C", type: "letter" },
      { key: "v", label: "V", type: "letter" },
      { key: "b", label: "B", type: "letter" },
      { key: "k", label: "K", type: "letter" },
      { key: "m", label: "M", type: "letter" },
      { key: ",", label: ",", shiftKey: "<", type: "symbol" },
      { key: ".", label: ".", shiftKey: ">", type: "symbol" },
      { key: "/", label: "/", shiftKey: "?", type: "symbol" },
    ],
    [
      { key: " ", label: "", type: "space", width: 8 },
    ],
  ],
};

export const KEYBOARD_LAYOUTS: Record<KeyboardLayoutId, KeyboardLayout> = {
  qwerty: QWERTY_LAYOUT,
  dvorak: DVORAK_LAYOUT,
  colemak: COLEMAK_LAYOUT,
};

export const DEFAULT_KEYBOARD_LAYOUT: KeyboardLayoutId = "qwerty";

export function findKeyForChar(
  layout: KeyboardLayout,
  char: string
): { key: KeyDefinition; requiresShift: boolean; rowIndex: number } | null {
  if (!char) return null;

  for (let rowIndex = 0; rowIndex < layout.rows.length; rowIndex++) {
    for (const keyDef of layout.rows[rowIndex]) {
      if (keyDef.type === "letter") {
        if (keyDef.key === char.toLowerCase()) {
          return { key: keyDef, requiresShift: char !== char.toLowerCase(), rowIndex };
        }
      } else if (keyDef.type === "number" || keyDef.type === "symbol") {
        if (keyDef.key === char) {
          return { key: keyDef, requiresShift: false, rowIndex };
        }
        if (keyDef.shiftKey === char) {
          return { key: keyDef, requiresShift: true, rowIndex };
        }
      } else if (keyDef.type === "space" && char === " ") {
        return { key: keyDef, requiresShift: false, rowIndex };
      }
    }
  }

  return null;
}
