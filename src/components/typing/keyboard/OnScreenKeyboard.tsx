import { useId, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { buildRows, DEFAULT_KEYBOARD_STYLE, findBoardKey, modelFor, type KeyboardStyle } from "@/lib/keyboard-model";
import LegacyKeyboard, { type KeyboardGuideProps } from "./LegacyKeyboard";
import { FingerKeyboard } from "./FingerKeyboard";
import { KeycapKeyboard } from "./KeycapKeyboard";
import { SpotlightKeyboard } from "./SpotlightKeyboard";

interface OnScreenKeyboardProps extends KeyboardGuideProps {
  style?: KeyboardStyle;
  /** Wrong letters in the current word, so the keyboard can ask for delete or offer to skip. */
  toDelete?: number;
}

/** The practice keyboard in the player's chosen style; Legacy is the classic one. */
export default function OnScreenKeyboard({ style = DEFAULT_KEYBOARD_STYLE, toDelete = 0, ...props }: OnScreenKeyboardProps) {
  if (style === "legacy") return <LegacyKeyboard {...props} />;
  return <StyledKeyboard style={style} toDelete={toDelete} {...props} />;
}

function StyledKeyboard({ style, toDelete, nextChar, capsLockOn, layoutId, activeKey, visible }: Required<Pick<OnScreenKeyboardProps, "style" | "toDelete">> & KeyboardGuideProps) {
  const guidanceId = useId();
  const reducedMotion = useReducedMotion();
  const rows = useMemo(() => buildRows(layoutId), [layoutId]);
  const pressedId = activeKey ? findBoardKey(rows, activeKey)?.key.id : undefined;
  const model = useMemo(
    () => modelFor(rows, nextChar, { caps: capsLockOn, toDelete, pressed: new Set(pressedId ? [pressedId] : []) }),
    [rows, nextChar, capsLockOn, toDelete, pressedId],
  );
  const match = nextChar ? findBoardKey(rows, nextChar) : null;
  const needsShift = model.shift !== null;
  const needsCapsLockOff = capsLockOn && match?.key.type === "letter" && !match.shift;

  return (
    <div
      className="mt-3 w-full"
      data-testid="keyboard-container"
      data-keyboard-style={style}
      role="region"
      aria-label="On-screen keyboard"
      aria-hidden={!visible}
      aria-describedby={guidanceId}
    >
      <p id={guidanceId} className="sr-only">
        {match
          ? `Next key: ${needsShift ? "Shift + " : ""}${match.key.type === "space" ? "Space" : match.key.type === "backspace" ? "Backspace" : match.key.label.toUpperCase()}.`
          : "No next key guidance."}
        {capsLockOn ? " Caps Lock is on." : ""}
        {needsCapsLockOff ? " Turn Caps Lock off for lowercase letters." : ""}
      </p>
      <AnimatePresence>
        {visible && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.15 }}>
            {style === "finger" ? <FingerKeyboard model={model} /> : style === "keycaps" ? <KeycapKeyboard model={model} /> : <SpotlightKeyboard model={model} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
