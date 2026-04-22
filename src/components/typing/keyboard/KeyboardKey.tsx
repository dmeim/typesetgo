import { memo } from "react";
import type { KeyDefinition } from "@/lib/keyboard-layouts";
import { tv } from "@/lib/theme-vars";

interface KeyboardKeyProps {
  keyDef: KeyDefinition;
  isNext: boolean;
  isActive: boolean;
  isCapsLockOn: boolean;
  unitSize: number;
  gap: number;
}

function KeyboardKeyInner({
  keyDef,
  isNext,
  isActive,
  isCapsLockOn,
  unitSize,
  gap,
}: KeyboardKeyProps) {
  const width = (keyDef.width ?? 1) * unitSize + ((keyDef.width ?? 1) - 1) * gap;
  const height = unitSize * 1.2;
  const fontSize = keyDef.type === "space" ? unitSize * 0.3 : unitSize * 0.4;

  const isCapsKey = keyDef.type === "caps";
  const capsActive = isCapsKey && isCapsLockOn;

  let backgroundColor: string = "transparent";
  let color: string = tv.text.muted;
  let borderColor: string = tv.border.default;

  if (isActive) {
    backgroundColor = tv.typing.correct;
    color = tv.text.inverse;
    borderColor = tv.typing.correct;
  } else if (isNext) {
    backgroundColor = tv.interactive.primary.DEFAULT;
    color = tv.text.inverse;
    borderColor = tv.interactive.primary.DEFAULT;
  } else if (capsActive) {
    backgroundColor = tv.status.warning.DEFAULT;
    color = tv.text.inverse;
    borderColor = tv.status.warning.DEFAULT;
  }

  return (
    <div
      className="flex items-center justify-center rounded-md select-none shrink-0"
      style={{
        width,
        height,
        fontSize,
        backgroundColor,
        color,
        borderWidth: 1.5,
        borderColor,
        transition: "background-color 150ms, color 150ms, transform 150ms, border-color 150ms",
        transform: isActive ? "scale(0.92)" : "scale(1)",
        fontWeight: 500,
        lineHeight: 1,
      }}
    >
      {keyDef.label}
    </div>
  );
}

export default memo(KeyboardKeyInner);
