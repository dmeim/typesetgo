import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { InfoIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { LEADERBOARD_RULES, leaderboardEntryKey, leaderboardProfileHref, type LeaderboardEntry } from "@/lib/leaderboard-entries";
import { ARENA_SPRING, avatarTone } from "./arena-motion";

const SIZES = {
  sm: "size-8 text-sm",
  md: "size-10 text-base",
  lg: "size-12 text-lg sm:size-14 sm:text-xl",
  xl: "size-16 text-2xl sm:size-20 sm:text-3xl",
};

/** Profile photo over a coloured initial, which stays when the photo fails to load. */
export function PlayerAvatar({ entry, size = "md", layoutId }: { entry: LeaderboardEntry; size?: keyof typeof SIZES; layoutId?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <motion.span
      layoutId={layoutId}
      transition={ARENA_SPRING}
      aria-hidden="true"
      data-leaderboard-avatar
      className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold", avatarTone(leaderboardEntryKey(entry)), SIZES[size])}
    >
      {entry.username.charAt(0).toUpperCase()}
      {entry.avatarUrl && entry.avatarUrl !== failedUrl && (
        <img src={entry.avatarUrl} alt="" className="absolute inset-0 size-full object-cover" onError={() => setFailedUrl(entry.avatarUrl)} />
      )}
    </motion.span>
  );
}

/** A player's full name, linked to their public profile when the response includes their account ID. */
export function PlayerName({ entry, className = "" }: { entry: LeaderboardEntry; className?: string }) {
  const base = cn("min-w-0 [overflow-wrap:anywhere]", className);
  if (!entry.userId) return <span className={base}>{entry.username}</span>;
  return (
    <Link
      to={leaderboardProfileHref(entry.userId)}
      className={cn(base, "rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring")}
    >
      {entry.username}
    </Link>
  );
}

export function YouTag() {
  return <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-primary-foreground">You</span>;
}

/** The ranking rules, one tap away instead of a paragraph above the board. */
export function RulesNote() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? "leaderboard-rules" : undefined}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <InfoIcon className="size-4" aria-hidden="true" />How do I get on the board?
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.p
            id="leaderboard-rules"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={ARENA_SPRING}
            className="max-w-xl overflow-hidden rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground"
          >
            {LEADERBOARD_RULES} Only verified tests appear.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
