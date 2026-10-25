import type { ReactNode } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

/** Single-choice segmented control; never lets the selection become empty. */
export function Segmented<T extends string>({
  label, value, options, onChange, disabled, className,
}: {
  label: string;
  value: T | undefined;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label={label}
      value={value ?? ""}
      disabled={disabled}
      onValueChange={(next) => { if (next) onChange(next as T); }}
      className={cn("flex w-full flex-wrap sm:w-fit", className)}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className="flex-auto px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground sm:flex-none sm:px-3"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
