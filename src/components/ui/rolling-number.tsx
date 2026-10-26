import { AnimatePresence, motion } from "framer-motion";

/** Digits slide vertically when they change, like an odometer. */
export function RollingNumber({ value, className = "" }: { value: string; className?: string }) {
  return (
    <span className={`inline-flex tabular-nums ${className}`} aria-label={value} role="img">
      {value.split("").map((char, index) => (
        <span key={index} className="relative inline-flex overflow-hidden" aria-hidden="true">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={char}
              initial={{ y: "-70%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "70%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            >
              {char}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}
