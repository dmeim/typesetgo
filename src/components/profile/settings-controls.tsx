import { useId, type ReactNode } from "react";
import { motion } from "framer-motion";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { Slider } from "@/components/ui/slider";
import type { ThemeMode } from "@/types/theme";
import { PROFILE_SPRING } from "./profile-sections";

export function SettingSwitch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${checked ? "justify-end bg-primary" : "justify-start bg-muted"}`}
    >
      <motion.span layout transition={PROFILE_SPRING} className="size-6 rounded-full bg-background shadow" />
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label, className = "" }: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className={`flex rounded-xl bg-muted/60 p-1 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring ${value === option.value ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {value === option.value && <motion.span layoutId={`segment-${id}`} transition={PROFILE_SPRING} className="absolute inset-0 rounded-lg bg-card shadow-sm" />}
          <span className="relative flex items-center gap-1.5">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export function SettingSlider({ label, value, min, max, step, onChange, format }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <motion.span key={value} initial={{ y: -4, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} className="tabular-nums text-muted-foreground">{format(value)}</motion.span>
      </div>
      <Slider aria-label={label} value={[value]} min={min} max={max} step={step} onValueChange={([next]) => onChange(next)} />
    </div>
  );
}

/** One labelled line in a grouped list: label and hint on the left, control on the right. */
export function SettingRow({ label, hint, children, stacked = false }: { label: string; hint?: string; children: ReactNode; stacked?: boolean }) {
  return (
    <div className={`flex gap-3 px-4 py-3 ${stacked ? "flex-col" : "flex-wrap items-center justify-between"}`}>
      <div className="min-w-0">
        <div className="text-sm">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

/** iOS-style inset group: rounded card with hairline dividers between rows. */
export function RowGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {title && <h3 className="px-4 text-xs uppercase tracking-wider text-muted-foreground">{title}</h3>}
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">{children}</div>
    </div>
  );
}

export function ModeSegmented({ mode, onChange, lightAvailable }: { mode: ThemeMode; onChange: (mode: ThemeMode) => void; lightAvailable: boolean }) {
  return (
    <Segmented
      label="Light or dark"
      value={lightAvailable ? mode : "dark"}
      onChange={(next) => { if (next === "dark" || lightAvailable) onChange(next); }}
      options={[
        { value: "dark", label: <><MoonIcon className="size-4" aria-hidden="true" />Dark</> },
        { value: "light", label: <span className={lightAvailable ? "" : "opacity-40"}><SunIcon className="mr-1.5 inline size-4" aria-hidden="true" />Light</span> },
      ]}
    />
  );
}

/** Four catalogue colours as overlapping dots. */
export function Swatches({ colors, size = "size-4" }: { colors: string[]; size?: string }) {
  return (
    <span className="flex -space-x-1" aria-hidden="true">
      {colors.map((color, index) => <span key={index} className={`${size} rounded-full ring-2 ring-card`} style={{ backgroundColor: color }} />)}
    </span>
  );
}
