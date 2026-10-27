import { motion } from "framer-motion";
import { TIER_COLORS, type AchievementTier } from "@/lib/achievement-definitions";
import { cn } from "@/lib/utils";

const PIECES = 42;

/** A burst of paper from behind the medal. Positions are fixed per piece so the burst looks the same each time. */
export function CelebrationConfetti({ tier }: { tier: AchievementTier }) {
  const colors = [TIER_COLORS[tier].bg, "var(--primary)", "var(--accent-emphasis)", "var(--warning)", "var(--success)"];
  return (
    <span aria-hidden="true" data-celebration-confetti="" className="pointer-events-none absolute left-1/2 top-[38%]">
      {Array.from({ length: PIECES }, (_, piece) => {
        const angle = (piece * 137.508 * Math.PI) / 180;
        const distance = 90 + ((piece * 53) % 150);
        const x = Math.cos(angle) * distance * 1.4;
        const y = Math.sin(angle) * distance - 40;
        return (
          <motion.span key={piece}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: 0 }}
            animate={{ x: [0, x, x * 1.1], y: [0, y, y + 160], opacity: [1, 1, 0], scale: 1, rotate: (piece * 97) % 540 }}
            transition={{ duration: 1.8, delay: 0.15 + (piece % 6) * 0.02, ease: "easeOut" }}
            className={cn("absolute block", piece % 3 === 0 ? "size-2 rounded-full" : "h-3 w-1.5 rounded-[1px]")}
            style={{ backgroundColor: colors[piece % colors.length] }} />
        );
      })}
    </span>
  );
}
