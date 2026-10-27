import { useMemo } from "react";
import type { KeyboardLayoutId } from "@/lib/keyboard-layouts";
import { buildRows, modelFor, type KeyboardStyle } from "@/lib/keyboard-model";
import LegacyKeyboard from "@/components/typing/keyboard/LegacyKeyboard";
import { FingerKeyboard } from "@/components/typing/keyboard/FingerKeyboard";
import { KeycapKeyboard } from "@/components/typing/keyboard/KeycapKeyboard";
import { SpotlightKeyboard } from "@/components/typing/keyboard/SpotlightKeyboard";

interface KeyboardPreviewProps {
  style: KeyboardStyle;
  layoutId: KeyboardLayoutId;
  nextChar: string | null;
  /** Leaves out hints and captions, for small previews. */
  bare?: boolean;
}

/** The real practice keyboard in one style, frozen on a next key, for settings previews. */
export function KeyboardPreview({ style, layoutId, nextChar, bare = false }: KeyboardPreviewProps) {
  const model = useMemo(() => modelFor(buildRows(layoutId), nextChar), [layoutId, nextChar]);
  if (style === "legacy") {
    const keyboard = <LegacyKeyboard nextChar={nextChar} capsLockOn={false} layoutId={layoutId} activeKey={null} visible />;
    // The classic keyboard hides itself under 280px, so small previews draw it larger and zoom it out.
    return bare ? <div className="w-full" style={{ zoom: 0.5 }}>{keyboard}</div> : keyboard;
  }
  if (style === "finger") return <FingerKeyboard model={model} bare={bare} />;
  if (style === "keycaps") return <KeycapKeyboard model={model} bare={bare} />;
  return <SpotlightKeyboard model={model} bare={bare} />;
}
