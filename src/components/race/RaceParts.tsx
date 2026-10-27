import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, CircleNotchIcon, CopyIcon, CrownSimpleIcon, SignOutIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { RACE_SPRING, tint } from "./race-format";

/** Big filled call to action. */
export const RACE_PRIMARY_BUTTON = "group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50";
/** Quiet outlined action. */
export const RACE_OUTLINE_BUTTON = "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50";
/** Small inline retry link. */
export const RACE_RETRY_BUTTON = "inline-flex items-center gap-2 rounded-full px-1 text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50";

const AVATAR_SIZES = {
  xs: "size-7 text-sm border",
  sm: "size-9 text-lg border-2",
  md: "size-12 text-2xl border-2",
  lg: "size-16 text-3xl border-[3px]",
  xl: "size-20 text-4xl border-4",
};
export type RacerAvatarSize = keyof typeof AVATAR_SIZES;

/** A racer's emoji in a circle tinted with their colour. */
export function RacerAvatar({ emoji, color, size = "md", dim = false, className }: { emoji: string; color: string; size?: RacerAvatarSize; dim?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-full leading-none transition-[opacity,filter]", AVATAR_SIZES[size], dim && "opacity-45 grayscale", className)}
      style={{ borderColor: color, backgroundColor: tint(color) }}>
      {emoji}
    </span>
  );
}

export function YouTag({ className }: { className?: string }) {
  return <span className={cn("shrink-0 rounded-full bg-primary px-1.5 py-px text-[0.65rem] font-bold uppercase tracking-wide text-primary-foreground", className)}>You</span>;
}

export function HostTag({ className, label = true }: { className?: string; label?: boolean }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 text-[0.7rem] font-bold uppercase tracking-wide text-warning", className)}>
      <CrownSimpleIcon weight="fill" className="size-3.5" aria-hidden="true" />
      {label ? "Host" : <span className="sr-only">Host</span>}
    </span>
  );
}

/** Copies the room code and briefly shows a tick; reports failures so the page can explain them. */
export function CopyCodeButton({ code, onCopy, className, children }: { code: string; onCopy?: (copied: boolean) => void; className?: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopy?.(true);
    } catch {
      setCopied(false);
      onCopy?.(false);
    }
  };
  return (
    <button type="button" onClick={() => void copy()} aria-label={copied ? "Room code copied" : `Copy room code ${code}`}
      className={cn("inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border px-3 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={copied ? "done" : "copy"} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={RACE_SPRING} className="flex">
          {copied ? <CheckIcon className="size-4 text-success" aria-hidden="true" /> : <CopyIcon className="size-4" aria-hidden="true" />}
        </motion.span>
      </AnimatePresence>
      {children ?? (copied ? "Copied" : "Copy code")}
    </button>
  );
}

/** Leaves straight away (lobby and results); the race page wraps its own in a confirmation dialog. */
export function LeaveButton({ onLeave, leaving, disabled, className }: { onLeave: () => void; leaving: boolean; disabled?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onLeave} disabled={leaving || disabled} className={cn(RACE_OUTLINE_BUTTON, className)}>
      {leaving ? <CircleNotchIcon className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : <SignOutIcon className="size-4" aria-hidden="true" />}
      {leaving ? "Leaving…" : "Leave race"}
    </button>
  );
}
