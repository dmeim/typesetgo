import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { KeyboardLayoutId } from "@/lib/keyboard-layouts";
import { KEYBOARD_LAYOUTS, findKeyForChar } from "@/lib/keyboard-layouts";
import KeyboardKey from "./KeyboardKey";
import CapsLockIndicator from "./CapsLockIndicator";

interface OnScreenKeyboardProps {
  nextChar: string | null;
  capsLockOn: boolean;
  layoutId: KeyboardLayoutId;
  activeKey: string | null;
  visible: boolean;
}

const NUM_ROWS = 5;
const GAP = 3;
const ROW_GAP = 3;

export default function OnScreenKeyboard({
  nextChar,
  capsLockOn,
  layoutId,
  activeKey,
  visible,
}: OnScreenKeyboardProps) {
  const guidanceId = useId();
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [unitSize, setUnitSize] = useState(28);
  const [tooSmall, setTooSmall] = useState(false);

  const layout = KEYBOARD_LAYOUTS[layoutId];

  const maxRowUnits = useMemo(() => {
    return Math.max(...layout.rows.map((row) => row.reduce((sum, k) => sum + (k.width ?? 1), 0)));
  }, [layout]);

  const computeSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const containerWidth = el.clientWidth;
    if (containerWidth < 280) {
      setTooSmall(true);
      return;
    }
    setTooSmall(false);

    const totalGap = (Math.ceil(maxRowUnits) - 1) * GAP;
    const widthBased = (containerWidth - totalGap) / maxRowUnits;

    const availableHeight = window.innerHeight * 0.36;
    const totalRowGap = (NUM_ROWS - 1) * ROW_GAP;
    const heightBased = (availableHeight - totalRowGap) / (NUM_ROWS * 1.2);

    setUnitSize(Math.max(16, Math.min(widthBased, heightBased, 48)));
  }, [maxRowUnits]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    computeSize();
    const observer = new ResizeObserver(computeSize);
    observer.observe(el);
    window.addEventListener("resize", computeSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", computeSize);
    };
  }, [computeSize]);

  const match = useMemo(() => (nextChar ? findKeyForChar(layout, nextChar) : null), [layout, nextChar]);

  const requiresShift =
    match !== null && (match.key.type === "letter" ? match.requiresShift !== capsLockOn : match.requiresShift);
  const rowHeight = unitSize * 1.2;

  return (
    <div
      ref={containerRef}
      className="mt-3 w-full"
      data-testid="keyboard-container"
      role="region"
      aria-label="On-screen keyboard"
      aria-hidden={!visible}
      aria-describedby={guidanceId}
    >
      <p id={guidanceId} className="sr-only">
        {match
          ? `Next key: ${requiresShift ? "Shift + " : ""}${match.key.type === "space" ? "Space" : match.key.type === "backspace" ? "Backspace" : match.key.label}.`
          : "No next key guidance."}
        {capsLockOn ? " Caps Lock is on." : ""}
        {tooSmall && visible ? " Keyboard preview is hidden at this width." : ""}
      </p>
      <AnimatePresence>
        {visible && !tooSmall && (
          <motion.div
            className="flex flex-col items-center"
            style={{ gap: ROW_GAP }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.15 }}
          >
            <CapsLockIndicator isActive={capsLockOn} rowHeight={rowHeight} />
            {layout.rows.map((row, rowIdx) => (
              <div key={rowIdx} className="relative flex justify-center" style={{ gap: GAP }}>
                {row.map((keyDef, keyIdx) => {
                  const isNextKey = match !== null && match.key.key === keyDef.key;
                  const isShiftHighlight = match !== null && requiresShift && keyDef.type === "shift";

                  const isActive =
                    activeKey !== null &&
                    (keyDef.type === "letter"
                      ? keyDef.key === activeKey.toLowerCase()
                      : keyDef.type === "space"
                        ? activeKey === " "
                        : keyDef.key === activeKey || keyDef.shiftKey === activeKey);

                  return (
                    <KeyboardKey
                      key={`${keyDef.key}-${keyIdx}`}
                      keyDef={keyDef}
                      isNext={isNextKey || isShiftHighlight}
                      isActive={isActive}
                      isCapsLockOn={capsLockOn}
                      unitSize={unitSize}
                      gap={GAP}
                    />
                  );
                })}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
