import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Hint } from "@/lib/keyboard-model";
import { HINT_STYLE } from "./keyboard-hint-style";

/** A pill above the keyboard that says what to do; it keeps its height when empty so the keys never jump. */
export function HintPill({ hint, className }: { hint: Hint | null; className?: string }) {
  const style = hint ? HINT_STYLE[hint.tone] : null;
  return (
    <div role="status" className={cn("flex min-h-10 items-center justify-center", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {hint && style && (
          <motion.div
            key={`${hint.tone}-${hint.title}`}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: hint.tone === "ignored" ? [0, -5, 5, -3, 0] : 0 }}
            exit={{ opacity: 0, y: -6, scale: 0.95, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 500, damping: 30, x: { duration: 0.4 } }}
            className={cn("inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm", style.pill)}
          >
            <style.Icon className="size-4 shrink-0" weight="bold" aria-hidden="true" />
            <span className="font-semibold">{hint.title}</span>
            <span className="hidden opacity-80 @min-[28rem]:inline">· {hint.detail}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
