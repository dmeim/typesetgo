import { useState, type ComponentType, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowClockwiseIcon, KeyboardIcon, PauseIcon, PlayIcon } from "@phosphor-icons/react";
import type { KeyboardLayoutId } from "@/lib/keyboard-layouts";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { CoachKeyboard } from "./CoachKeyboard";
import { CompactKeyboard } from "./CompactKeyboard";
import { FingerKeyboard } from "@/components/typing/keyboard/FingerKeyboard";
import { KeycapKeyboard } from "@/components/typing/keyboard/KeycapKeyboard";
import { SpotlightKeyboard } from "@/components/typing/keyboard/SpotlightKeyboard";
import { TypingLine } from "./KeyboardParts";
import { DESIGNS, type KeyboardModel } from "./keyboard-mock";
import { useKeyboardDemo } from "./use-keyboard-demo";

const COMPONENTS: ComponentType<{ model: KeyboardModel }>[] = [KeycapKeyboard, FingerKeyboard, SpotlightKeyboard, CompactKeyboard, CoachKeyboard];
const LAYOUTS: { id: KeyboardLayoutId; label: string }[] = [
  { id: "qwerty", label: "QWERTY" },
  { id: "dvorak", label: "Dvorak" },
  { id: "colemak", label: "Colemak" },
];
const WIDTHS = [
  { id: "wide", label: "Wide", frame: "max-w-none" },
  { id: "narrow", label: "Phone", frame: "max-w-[375px]" },
];

// Spotlight, Finger guide and Keycaps went live; Compact and Coach stay Lab-only.
const SHIPPED = [2, 1, 0];

/** The keyboard designs over one practice line, driven by a pretend student or by your own typing. `shippedOnly` hides the Lab-only ones. */
export function KeyboardShowcase({ shippedOnly = false }: { shippedOnly?: boolean }) {
  const shown = shippedOnly ? SHIPPED : DESIGNS.map((_, index) => index);
  const [design, setDesign] = useState(shown[0]);
  const [layout, setLayout] = useState<KeyboardLayoutId>("qwerty");
  const [width, setWidth] = useState("wide");
  const demo = useKeyboardDemo(layout);
  const Design = COMPONENTS[design];
  const frame = WIDTHS.find((entry) => entry.id === width)?.frame;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Switcher
          label="Design"
          options={shown.map((index) => ({ id: String(index), label: shippedOnly ? DESIGNS[index].name : <><span className="text-muted-foreground">{String(index + 1).padStart(2, "0")}</span> {DESIGNS[index].name}</> }))}
          value={String(design)}
          onChange={(value) => setDesign(Number(value))}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Switcher label="Layout" options={LAYOUTS} value={layout} onChange={(value) => setLayout(value as KeyboardLayoutId)} />
          <Switcher label="Width" options={WIDTHS} value={width} onChange={setWidth} />
        </div>
      </div>
      <p className="px-1 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{DESIGNS[design].name}.</span> {DESIGNS[design].summary}
      </p>

      <motion.div layout transition={LAB_SPRING} className={cn("mx-auto w-full", frame)}>
        <div
          tabIndex={0}
          role="group"
          aria-label="Keyboard demo. Focus here and type to try it."
          onKeyDown={demo.onKeyDown}
          onKeyUp={demo.onKeyUp}
          className="group @container flex flex-col gap-6 rounded-3xl bg-background px-4 py-8 ring-1 ring-border/60 outline-none focus-visible:ring-2 focus-visible:ring-primary @min-[36rem]:px-8"
        >
          <TypingLine typed={demo.typed} />
          <Design model={demo.model} />
        </div>
      </motion.div>

      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
        <button type="button" onClick={demo.togglePlaying} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 transition hover:bg-accent hover:text-foreground">
          {demo.playing ? <PauseIcon className="size-3.5" aria-hidden="true" /> : <PlayIcon className="size-3.5" aria-hidden="true" />}
          {demo.playing ? "Pause the pretend student" : "Watch the pretend student"}
        </button>
        <button type="button" onClick={demo.restart} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 transition hover:bg-accent hover:text-foreground">
          <ArrowClockwiseIcon className="size-3.5" aria-hidden="true" />
          Start the line again
        </button>
        <span className="inline-flex items-center gap-1.5">
          <KeyboardIcon className="size-4" aria-hidden="true" />
          {demo.playing ? "Click the practice box and type to take over. Caps Lock works too." : "You're typing. Try a wrong letter, then fix it or skip it with space."}
        </span>
      </div>
    </div>
  );
}

function Switcher({ label, options, value, onChange }: { label: string; options: { id: string; label: ReactNode }[]; value: string; onChange: (value: string) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-2xl bg-muted/60 p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
          className="relative rounded-xl px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-checked:text-foreground"
        >
          {value === option.id && <motion.span layoutId={`keyboard-switch-${label}`} transition={LAB_SPRING} className="absolute inset-0 rounded-xl bg-card shadow-sm" />}
          <span className="relative">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
