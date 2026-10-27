import { useEffect, useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";

/** A rounded card with an optional coloured icon tile, title and corner action. */
export function ConnectCard({ title, description, Icon, tile = "bg-primary text-primary-foreground", action, children, className, bare = false, hideHeader = false }: {
  title?: string;
  description?: ReactNode;
  Icon?: Icon;
  tile?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Drops the card frame, for content that sits inside another card. */
  bare?: boolean;
  /** Keeps the heading for screen readers only, when something else on screen already names the card. */
  hideHeader?: boolean;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={title ? headingId : undefined}
      className={cn("flex min-w-0 flex-col gap-4", !bare && "rounded-3xl border border-border bg-card p-5 text-card-foreground sm:p-6", className)}>
      {title && (
        <header className={cn("flex flex-wrap items-start gap-3", hideHeader && "sr-only")}>
          {Icon && <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl", tile)}><Icon weight="fill" className="size-5" /></span>}
          <div className="min-w-0 flex-1">
            <h2 id={headingId} className="text-lg font-bold leading-tight">{title}</h2>
            {description && <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export interface PillOption<T extends string> {
  value: T;
  label: string;
  /** Replaces the label on phones. */
  short?: string;
  Icon?: Icon;
  disabled?: boolean;
}

/** A pill of choices with a sliding highlight. */
export function Pills<T extends string>({ label, value, options, onChange, disabled, size = "md", className }: {
  label: string;
  value: T;
  options: PillOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex rounded-full bg-muted/60 p-1", disabled && "opacity-60", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button key={option.value} type="button" role="radio" aria-checked={selected} aria-label={option.short ? option.label : undefined}
            disabled={disabled || option.disabled} onClick={() => onChange(option.value)}
            className={cn("relative flex min-w-0 flex-auto items-center justify-center gap-2 whitespace-nowrap rounded-full transition-colors",
              size === "lg" ? "px-3 py-3 text-sm font-bold sm:px-5 sm:text-base" : "px-2 py-2 text-sm font-medium sm:px-4",
              "focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed",
              selected ? "text-primary-foreground" : "text-muted-foreground enabled:hover:text-foreground", option.disabled && "opacity-40")}>
            {selected && <motion.span layoutId={`pill-${id}`} transition={CONNECT_SPRING} className="absolute inset-0 rounded-full bg-primary shadow-sm" />}
            {option.Icon && <option.Icon weight={selected ? "fill" : "bold"} className={cn("relative shrink-0", size === "lg" ? "size-5" : "size-4")} aria-hidden="true" />}
            {option.short ? (
              <span className="relative truncate"><span className="sm:hidden">{option.short}</span><span className="hidden sm:inline">{option.label}</span></span>
            ) : <span className="relative truncate">{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** An on/off switch with a sliding knob. */
export function ConnectSwitch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={cn("flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40",
        checked ? "justify-end bg-primary" : "justify-start bg-muted")}>
      <motion.span layout transition={CONNECT_SPRING} className="size-6 rounded-full bg-background shadow" />
    </button>
  );
}

const ARM_MS = 3000;

/** A button that asks "tap again" before acting, so a stray click never ends or resets anything. */
export function TwoTapButton({ label, confirmLabel, Icon, onConfirm, tone = "destructive", disabled, className }: {
  label: string;
  confirmLabel: string;
  Icon: Icon;
  onConfirm: () => void;
  tone?: "destructive" | "warning";
  disabled?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), ARM_MS);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <motion.button layout type="button" transition={CONNECT_SPRING} disabled={disabled}
      onClick={() => { if (armed) { setArmed(false); onConfirm(); } else setArmed(true); }}
      className={cn("flex h-10 items-center gap-2 overflow-hidden whitespace-nowrap rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40",
        armed ? (tone === "destructive" ? "bg-destructive text-background" : "bg-warning text-background") : "text-muted-foreground hover:bg-accent hover:text-foreground", className)}>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={armed ? "sure" : "idle"} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={CONNECT_SPRING} aria-live="polite">
          {armed ? confirmLabel : label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

/** Shared class for small outlined actions (board buttons, open-in-new-tab links). */
export const CHIP = "flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-3.5 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40";

/** Shared class for round icon-only buttons. */
export const ICON_BUTTON = "flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-30";
