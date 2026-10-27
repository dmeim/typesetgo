import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const SPRING = { type: "spring", stiffness: 380, damping: 18 } as const;

interface KeycapsProps {
  keys: string[];
  /** "drop" bounces the keys in one by one; "wave" presses them in turn, forever. */
  motion: "drop" | "wave";
  /** A key index that stays knocked loose, e.g. for errors. */
  loose?: number;
  className?: string;
}

/** A word spelled out on chunky keyboard keys: the artwork for the loading, not-found and error screens. */
export function Keycaps({ keys, motion: style, loose, className }: KeycapsProps) {
  return (
    <div aria-hidden="true" className={cn("flex items-end justify-center gap-2 sm:gap-3", className)}>
      {keys.map((key, index) => (
        <motion.span
          key={index}
          initial={style === "drop" ? { y: -60, opacity: 0, rotate: -10 } : undefined}
          animate={style === "drop"
            ? { y: index === loose ? 10 : 0, opacity: 1, rotate: index === loose ? 14 : 0 }
            : { y: [0, 6, 0], boxShadow: ["0 6px 0 var(--border)", "0 0px 0 var(--border)", "0 6px 0 var(--border)"] }}
          transition={style === "drop"
            ? { ...SPRING, delay: 0.08 * index }
            : { duration: 0.6, delay: 0.15 * index, repeat: Infinity, repeatDelay: 0.15 * keys.length, ease: "easeInOut" }}
          whileHover={style === "drop" ? { y: -6, rotate: index % 2 ? 6 : -6 } : undefined}
          className={cn(
            "flex size-14 items-center justify-center rounded-2xl border-2 border-border bg-card font-mono text-2xl font-bold text-foreground shadow-[0_6px_0_var(--border)] sm:size-20 sm:text-4xl",
            key === "" && "border-dashed bg-transparent text-muted-foreground shadow-none",
            index === loose && "text-destructive",
          )}
        >
          {key === "" ? "?" : key}
        </motion.span>
      ))}
    </div>
  );
}
