import { useMemo } from "react";
import type { KeyboardLayoutId } from "@/lib/keyboard-layouts";
import LegacyKeyboard from "@/components/typing/keyboard/LegacyKeyboard";
import { FingerKeyboard } from "@/components/typing/keyboard/FingerKeyboard";
import { KeycapKeyboard } from "@/components/typing/keyboard/KeycapKeyboard";
import { SpotlightKeyboard } from "@/components/typing/keyboard/SpotlightKeyboard";
import { buildRows, modelFor, type KeyboardStyle } from "./keyboard-mock";

interface KeyboardStyleViewProps {
  style: KeyboardStyle;
  layoutId: KeyboardLayoutId;
  nextChar: string | null;
  /** Leaves out hints and captions, for small previews. */
  bare?: boolean;
}

/** One keyboard style frozen on a next key, for the settings previews. Legacy is today's real keyboard. */
export function KeyboardStyleView({ style, layoutId, nextChar, bare = false }: KeyboardStyleViewProps) {
  const model = useMemo(() => modelFor(buildRows(layoutId), nextChar), [layoutId, nextChar]);
  if (style === "legacy") {
    const keyboard = <LegacyKeyboard nextChar={nextChar} capsLockOn={false} layoutId={layoutId} activeKey={null} visible />;
    // Today's keyboard hides itself under 280px, so small previews draw it larger and zoom it out.
    return bare ? <div className="w-full" style={{ zoom: 0.5 }}>{keyboard}</div> : keyboard;
  }
  if (style === "finger") return <FingerKeyboard model={model} bare={bare} />;
  if (style === "keycaps") return <KeycapKeyboard model={model} bare={bare} />;
  return <SpotlightKeyboard model={model} bare={bare} />;
}
