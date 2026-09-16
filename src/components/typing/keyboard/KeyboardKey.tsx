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

function KeyboardKeyInner({ keyDef, isNext, isActive, isCapsLockOn, unitSize, gap }: KeyboardKeyProps) {
  const width = (keyDef.width ?? 1) * unitSize + ((keyDef.width ?? 1) - 1) * gap;
  const height = unitSize * 1.2;
  const fontSize = Math.max(10, keyDef.type === "space" ? unitSize * 0.3 : unitSize * 0.4);

  const isCapsKey = keyDef.type === "caps";
  const capsActive = isCapsKey && isCapsLockOn;

  let backgroundColor: string = "transparent";
  let color: string = tv.ui.mutedForeground;
  let borderColor: string = tv.border.default;

  if (isActive) {
    backgroundColor = tv.ui.primary;
    color = tv.ui.primaryForeground;
    borderColor = tv.ui.primary;
  } else if (isNext) {
    backgroundColor = tv.ui.secondary;
    color = tv.ui.secondaryForeground;
    borderColor = tv.ui.ring;
  } else if (capsActive) {
    backgroundColor = tv.ui.secondary;
    color = tv.ui.secondaryForeground;
    borderColor = tv.ui.ring;
  }

  return (
    <div
      className="flex items-center justify-center rounded-md select-none shrink-0"
      data-key={keyDef.key}
      data-next-key={isNext || undefined}
      data-active-key={isActive || undefined}
      style={{
        width,
        height,
        fontSize,
        backgroundColor,
        color,
        borderWidth: 2.5,
        borderColor,
        fontWeight: 500,
        lineHeight: 1,
      }}
    >
      {keyDef.label}
    </div>
  );
}

export default memo(KeyboardKeyInner);
