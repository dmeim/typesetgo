import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CaretDownIcon, CaretUpIcon, InfoIcon, MinusIcon } from "@phosphor-icons/react";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { PERIODS, RULES, avatarTone, type PeriodId } from "./mock-leaderboard";

const SIZES = { sm: "size-8 text-sm", md: "size-10 text-base", lg: "size-14 text-xl", xl: "size-20 text-3xl" };

export function PlayerAvatar({ username, size = "md", ring = "", layoutId }: { username: string; size?: keyof typeof SIZES; ring?: string; layoutId?: string }) {
  return (
    <motion.span layoutId={layoutId} transition={LAB_SPRING} aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${avatarTone(username)} ${SIZES[size]} ${ring}`}>
      {username[0].toUpperCase()}
    </motion.span>
  );
}

/** Today / 7 days / All time as a pill with a sliding highlight. */
export function PeriodTabs({ value, onChange, className = "" }: { value: PeriodId; onChange: (period: PeriodId) => void; className?: string }) {
  const id = useId();
  return (
    <div role="tablist" aria-label="Leaderboard period" className={`flex rounded-full bg-muted/60 p-1 ${className}`}>
      {PERIODS.map((period) => (
        <button key={period.id} type="button" role="tab" aria-selected={value === period.id} onClick={() => onChange(period.id)}
          className={`relative flex-1 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring ${value === period.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          {value === period.id && <motion.span layoutId={`period-${id}`} transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-primary" />}
          <span className="relative">{period.label}</span>
        </button>
      ))}
    </div>
  );
}

export function RankChange({ change }: { change: number }) {
  if (change === 0) return <span className="inline-flex w-8 justify-center text-muted-foreground" aria-label="No change"><MinusIcon className="size-3" aria-hidden="true" /></span>;
  const up = change > 0;
  const Arrow = up ? CaretUpIcon : CaretDownIcon;
  return (
    <span aria-label={`${up ? "Up" : "Down"} ${Math.abs(change)}`} className={`inline-flex w-8 items-center justify-center gap-0.5 text-xs font-semibold tabular-nums ${up ? "text-success" : "text-destructive"}`}>
      <Arrow weight="fill" className="size-3" aria-hidden="true" />{Math.abs(change)}
    </span>
  );
}

export function YouTag() {
  return <span className="rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-primary-foreground">You</span>;
}

/** The ranking rules, one tap away instead of a paragraph above the boards. */
export function RulesNote({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`flex flex-col items-start gap-2 ${className}`}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
        <InfoIcon className="size-4" aria-hidden="true" />How do I get on the board?
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={LAB_SPRING} className="max-w-xl overflow-hidden rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {RULES} Only verified tests appear.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
