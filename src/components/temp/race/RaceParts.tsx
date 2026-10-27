import { useEffect, useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, CopyIcon, CrownSimpleIcon, PencilSimpleIcon, PlayIcon, SignOutIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { AVATAR_EMOJIS, RACE_SPRING, tint } from "./race-mock";

const AVATAR_SIZES = {
  xs: "size-7 text-sm border",
  sm: "size-9 text-lg border-2",
  md: "size-12 text-2xl border-2",
  lg: "size-16 text-3xl border-[3px]",
  xl: "size-20 text-4xl border-4",
};

/** A racer's emoji in a circle tinted with their colour. */
export function RacerAvatar({ emoji, color, size = "md", dim = false, className }: { emoji: string; color: string; size?: keyof typeof AVATAR_SIZES; dim?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-full leading-none transition-[opacity,filter]", AVATAR_SIZES[size], dim && "opacity-45 grayscale", className)}
      style={{ borderColor: color, backgroundColor: tint(color) }}>
      {emoji}
    </span>
  );
}

export function YouTag({ className }: { className?: string }) {
  return <span className={cn("rounded-full bg-primary px-1.5 py-px text-[0.65rem] font-bold uppercase tracking-wide text-primary-foreground", className)}>You</span>;
}

export function HostTag({ className, label = true }: { className?: string; label?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[0.7rem] font-bold uppercase tracking-wide text-warning", className)}>
      <CrownSimpleIcon weight="fill" className="size-3.5" aria-hidden="true" />
      {label ? "Host" : <span className="sr-only">Host</span>}
    </span>
  );
}

/** Copies the room code and briefly shows a tick. */
export function CopyCodeButton({ code, className, children }: { code: string; className?: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button type="button" onClick={() => void copy()} aria-label={copied ? "Room code copied" : `Copy room code ${code}`}
      className={cn("inline-flex items-center justify-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={copied ? "done" : "copy"} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={RACE_SPRING} className="flex">
          {copied ? <CheckIcon className="size-4 text-success" aria-hidden="true" /> : <CopyIcon className="size-4" aria-hidden="true" />}
        </motion.span>
      </AnimatePresence>
      {children ?? (copied ? "Copied" : "Copy code")}
    </button>
  );
}

/** Your avatar as a button that opens a small grid of emoji to pick from. */
export function EmojiPicker({ value, color, onChange, size = "md", disabled }: { value: string; color: string; onChange: (emoji: string) => void; size?: "sm" | "md" | "lg" | "xl"; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <button type="button" disabled={disabled} aria-expanded={open} aria-controls={id} aria-label="Change your avatar" onClick={() => setOpen((current) => !current)}
        className="group relative rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed">
        <RacerAvatar emoji={value} color={color} size={size} className="transition-transform group-enabled:group-hover:scale-105" />
        {!disabled && <span aria-hidden="true" className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border border-border bg-card"><PencilSimpleIcon className="size-3" /></span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div id={id} role="listbox" aria-label="Avatars" initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -4 }} transition={RACE_SPRING}
            className="absolute left-0 top-full z-30 mt-2 grid w-48 grid-cols-4 gap-1 rounded-2xl border border-border bg-popover p-2 shadow-xl">
            {AVATAR_EMOJIS.map((emoji) => (
              <button key={emoji} type="button" role="option" aria-selected={emoji === value} aria-label={`Avatar ${emoji}`}
                onClick={() => { onChange(emoji); setOpen(false); }}
                className={cn("flex aspect-square items-center justify-center rounded-xl text-xl hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring", emoji === value && "bg-primary/15 ring-2 ring-primary")}>
                <span aria-hidden="true">{emoji}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Leave, with an optional inline "are you sure" step for mid-race exits. */
export function LeaveButton({ onLeave, confirm = false, className, label = "Leave race" }: { onLeave: () => void; confirm?: boolean; className?: string; label?: string }) {
  const [asking, setAsking] = useState(false);
  const base = "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring";
  if (asking) {
    return (
      <motion.span role="group" aria-label="Leave this race?" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={RACE_SPRING}
        className={cn("inline-flex flex-wrap items-center gap-1 rounded-full border border-destructive/40 bg-card p-1", className)}>
        <span className="px-2 text-xs font-semibold text-muted-foreground">Leave?</span>
        <button type="button" autoFocus onClick={() => setAsking(false)} className={cn(base, "h-8 bg-accent px-3")}>
          <PlayIcon weight="fill" className="size-3.5" aria-hidden="true" />Keep racing
        </button>
        <button type="button" onClick={onLeave} className={cn(base, "h-8 bg-destructive px-3 text-background")}>
          <SignOutIcon className="size-3.5" aria-hidden="true" />Leave
        </button>
      </motion.span>
    );
  }
  return (
    <button type="button" onClick={confirm ? () => setAsking(true) : onLeave} className={cn(base, "border border-border text-muted-foreground hover:bg-accent hover:text-foreground", className)}>
      <SignOutIcon className="size-4" aria-hidden="true" />{label}
    </button>
  );
}
