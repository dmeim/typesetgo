import { useId, type ReactNode } from "react";
import { motion } from "framer-motion";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** Inset group: rounded card with hairline dividers between rows. */
export function RowGroup({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">{children}</div>;
}

/** One labelled line in a group: label and hint on the left, control on the right. */
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

export function SliderRow({ label, value, min, max, step, format, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <motion.span key={value} initial={{ y: -4, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} className="tabular-nums text-muted-foreground">{format(value)}</motion.span>
      </div>
      <Slider aria-label={label} value={[value]} min={min} max={max} step={step} onValueChange={([next]) => { if (next !== undefined) onChange(next); }} />
    </div>
  );
}

export function SelectControl({ label, value, options, onChange, disabled, className = "w-44" }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const known = options.some((option) => option.value === value);
  return (
    <div className={className}>
      <NativeSelect id={id} aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {!known && <NativeSelectOption value={value}>{capitalize(value)}</NativeSelectOption>}
        {options.map((option) => <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>)}
      </NativeSelect>
    </div>
  );
}
