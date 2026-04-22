import { motion, AnimatePresence } from "framer-motion";
import { tv } from "@/lib/theme-vars";

interface CapsLockIndicatorProps {
  isActive: boolean;
  rowHeight: number;
}

export default function CapsLockIndicator({
  isActive,
  rowHeight,
}: CapsLockIndicatorProps) {
  const fontSize = Math.max(10, rowHeight * 0.28);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="absolute right-full top-0 bottom-0 flex items-center pr-2 select-none whitespace-nowrap"
          style={{ color: tv.status.warning.DEFAULT }}
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 6 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="flex items-center gap-0.5 font-bold"
            style={{ fontSize }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="leading-none">CAPS LOCK</span>
            <span className="leading-none" style={{ fontSize: fontSize * 0.8 }}>
              {"▶"}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
