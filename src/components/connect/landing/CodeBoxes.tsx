import { forwardRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CONNECT_CODE_LENGTH } from "@/lib/connect-types";
import { cn } from "@/lib/utils";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";
import { sanitizeCode } from "./landing-helpers";

export type CodeLookup = "typing" | "checking" | "found" | "missing";

const SHAKE = { x: [0, -12, 12, -8, 8, -3, 0], transition: { duration: 0.45 } };

/** Big letter boxes over one real input, so typing, pasting and phone keyboards all work as usual. */
export const CodeBoxes = forwardRef<HTMLInputElement, {
  code: string;
  onChange: (code: string) => void;
  lookup: CodeLookup;
  inputId: string;
  describedBy: string;
}>(function CodeBoxes({ code, onChange, lookup, inputId, describedBy }, ref) {
  const [focused, setFocused] = useState(false);
  const found = lookup === "found";
  return (
    <motion.div animate={lookup === "missing" ? SHAKE : { x: 0 }} className="relative mx-auto flex w-fit gap-2 sm:gap-3">
      <input
        ref={ref}
        id={inputId}
        value={code}
        onChange={(event) => onChange(sanitizeCode(event.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-describedby={describedBy}
        className="absolute inset-0 z-10 w-full cursor-text opacity-0"
      />
      {Array.from({ length: CONNECT_CODE_LENGTH }, (_, index) => {
        const char = code[index];
        const active = focused && index === Math.min(code.length, CONNECT_CODE_LENGTH - 1) && !found;
        return (
          <motion.span
            key={index}
            aria-hidden="true"
            animate={found ? { y: [0, -10, 0], transition: { delay: index * 0.07, duration: 0.4 } } : { y: 0 }}
            className={cn(
              "relative flex h-18 w-14 items-center justify-center rounded-2xl border-2 bg-background text-4xl font-black transition-colors sm:h-22 sm:w-17 sm:text-5xl",
              found ? "border-success bg-success/10 text-success" : lookup === "missing" ? "border-destructive text-destructive" : char ? "border-primary/50 text-foreground" : "border-border text-muted-foreground",
            )}
          >
            {active && <motion.span layoutId="join-code-cursor" transition={CONNECT_SPRING} className="absolute -inset-1 rounded-[1.2rem] ring-4 ring-primary/40" />}
            <AnimatePresence mode="popLayout" initial={false}>
              {char ? (
                <motion.span key={char} initial={{ scale: 0.3, y: 14, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }} transition={{ type: "spring", stiffness: 600, damping: 22 }}>
                  {char}
                </motion.span>
              ) : active ? (
                <motion.span key="caret" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 1, repeat: Infinity }} className="h-9 w-1 rounded-full bg-primary" />
              ) : null}
            </AnimatePresence>
          </motion.span>
        );
      })}
    </motion.div>
  );
});
