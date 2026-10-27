import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { KeyboardLayoutId } from "@/lib/keyboard-layouts";
import { getInputPosition, getNextTypingKey } from "@/components/typing/practice-input";
import { buildRows, describeHint, findMockKey, isLeftHand, SCRIPT, TARGET, type KeyboardModel, type MockKey } from "./keyboard-mock";

interface Step {
  wait: number;
  press?: string;
}

const STEPS: Step[] = SCRIPT.flatMap((token): Step[] => {
  if (typeof token === "number") return [{ wait: token }];
  if (token === "⌫") return [{ wait: 180, press: "Backspace" }];
  if (token === "⇪") return [{ wait: 180, press: "CapsLock" }];
  return [...token].map((press, index) => ({ wait: 140 + ((index * 37) % 70), press }));
});

const TARGET_WORDS = TARGET.split(" ");

function isDone(typed: string) {
  const words = typed.split(" ");
  return words.length === TARGET_WORDS.length && words[words.length - 1].length >= TARGET_WORDS[TARGET_WORDS.length - 1].length;
}

function oppositeShift(rows: MockKey[][], key: MockKey) {
  return rows[3].find((candidate) => candidate.key === (isLeftHand(key.finger) ? "ShiftRight" : "Shift")) ?? null;
}

/** Drives every keyboard design: a scripted student by default, or your own keys once you type in the stage. */
export function useKeyboardDemo(layoutId: KeyboardLayoutId) {
  const rows = useMemo(() => buildRows(layoutId), [layoutId]);
  const [typed, setTypedState] = useState("");
  const typedRef = useRef("");
  const [caps, setCaps] = useState(false);
  const capsRef = useRef(false);
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [step, setStep] = useState(0);
  const timers = useRef<{ flash?: number; skip?: number }>({});

  const setTyped = (value: string) => {
    typedRef.current = value;
    setTypedState(value);
  };
  const setCapsLock = (value: boolean) => {
    capsRef.current = value;
    setCaps(value);
  };
  const flash = useCallback((keys: (MockKey | null | undefined)[]) => {
    window.clearTimeout(timers.current.flash);
    setPressed(new Set(keys.filter((key): key is MockKey => !!key).map((key) => key.id)));
    timers.current.flash = window.setTimeout(() => setPressed(new Set()), 170);
  }, []);

  /** `raw` input already carries Shift and Caps Lock (a real keyboard); scripted input is a key plus Shift. */
  const press = useCallback((input: string, raw = false) => {
    if (input === "CapsLock") {
      setCapsLock(!capsRef.current);
      flash([rows[2][0]]);
      return;
    }
    const current = typedRef.current;
    if (input === "Backspace") {
      setTyped(current.slice(0, -1));
      flash([findMockKey(rows, "Backspace")?.key]);
      return;
    }
    if (isDone(current)) return;
    const shift = !raw && input !== input.toLowerCase();
    const output = raw || input.toLowerCase() === input.toUpperCase() ? input : capsRef.current !== shift ? input.toUpperCase() : input.toLowerCase();
    if (output === " ") {
      if (!current || current.endsWith(" ")) return;
      if (getNextTypingKey(current, TARGET) === "Backspace") {
        window.clearTimeout(timers.current.skip);
        setSkipped(true);
        timers.current.skip = window.setTimeout(() => setSkipped(false), 1800);
      }
    }
    setTyped(current + output);
    const match = findMockKey(rows, output);
    flash([match?.key, match && (shift || (raw && match.shift)) ? oppositeShift(rows, match.key) : null]);
  }, [rows, flash]);

  const restart = useCallback(() => {
    setTyped("");
    setCapsLock(false);
    setSkipped(false);
    setStep(0);
  }, []);

  // The scripted student.
  useEffect(() => {
    if (!playing) return;
    const current = STEPS[step];
    const timer = window.setTimeout(() => {
      if (!current) {
        restart();
        return;
      }
      if (current.press) press(current.press);
      setStep((value) => value + 1);
    }, current?.wait ?? 400);
    return () => window.clearTimeout(timer);
  }, [playing, step, press, restart]);

  // When you type the whole line yourself, start it again.
  useEffect(() => {
    if (playing || !isDone(typed)) return;
    const timer = window.setTimeout(() => setTyped(""), 1500);
    return () => window.clearTimeout(timer);
  }, [playing, typed]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of Object.values(pending)) window.clearTimeout(timer);
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const handled = event.key === "CapsLock" || event.key === "Backspace" || event.key.length === 1;
    if (!handled) return;
    event.preventDefault();
    if (playing) {
      setPlaying(false);
      setTyped("");
      setSkipped(false);
    }
    if (event.key === "CapsLock") {
      setCapsLock(event.getModifierState("CapsLock"));
      flash([rows[2][0]]);
      return;
    }
    setCapsLock(event.getModifierState("CapsLock"));
    press(event.key, true);
  };
  const onKeyUp = (event: KeyboardEvent<HTMLElement>) => {
    if (!playing) setCapsLock(event.getModifierState("CapsLock"));
  };

  const done = isDone(typed);
  const nextChar = done ? null : getNextTypingKey(typed, TARGET);
  const match = nextChar ? findMockKey(rows, nextChar) : null;
  const needsShift = !!match?.shift && !(match.key.type === "letter" && caps);
  const { typedWord, targetWord, referencePosition } = getInputPosition(typed, TARGET);
  let common = 0;
  while (common < typedWord.length && typedWord[common] === targetWord[common]) common++;
  const toDelete = nextChar === "Backspace" ? typedWord.length - common : 0;

  const model: KeyboardModel = {
    rows,
    next: match?.key ?? null,
    shift: needsShift && match ? oppositeShift(rows, match.key) : null,
    pressed,
    caps,
    toDelete,
    hint: describeHint(caps, toDelete, skipped),
    upcoming: done || toDelete ? [] : [...TARGET.slice(referencePosition, referencePosition + 4)].map((char, index) => ({ char, at: referencePosition + index })),
  };

  return {
    model,
    typed,
    playing,
    togglePlaying: () => {
      if (!playing) restart();
      setPlaying(!playing);
    },
    restart,
    onKeyDown,
    onKeyUp,
  };
}

export type KeyboardDemo = ReturnType<typeof useKeyboardDemo>;
