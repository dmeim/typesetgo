import { useId, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { RACE_SPRING } from "./race-format";
import { INFIELD_PATH, TRACK_HEIGHT, TRACK_PATH, TRACK_WIDTH, toPercent, type TrackPoint } from "./track-geometry";

/**
 * The circuit drawing; racers and labels are laid over it as children. The box is a size container, so dots and
 * labels scale with the map and keep the same footprint on the track from a phone to a desktop.
 */
export function TrackMap({ children, className, label, infield, infieldClassName, hidden = 0 }: {
  children?: ReactNode;
  className?: string;
  label: string;
  infield?: ReactNode;
  infieldClassName?: string;
  /** Racers the map leaves out; the list beside it still shows them. */
  hidden?: number;
}) {
  const pattern = useId();
  return (
    <div role="img" aria-label={label} data-track-map className={cn("@container relative aspect-[5/3] w-full", className)}>
      <svg viewBox={`0 0 ${TRACK_WIDTH} ${TRACK_HEIGHT}`} className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        <defs>
          <pattern id={pattern} width="3" height="3" patternUnits="userSpaceOnUse">
            <rect width="3" height="3" fill="var(--background)" />
            <rect width="1.5" height="1.5" fill="var(--foreground)" />
            <rect x="1.5" y="1.5" width="1.5" height="1.5" fill="var(--foreground)" />
          </pattern>
        </defs>
        <path d={TRACK_PATH} fill="none" stroke="var(--border)" strokeWidth="26" strokeLinejoin="round" />
        <path d={TRACK_PATH} fill="none" stroke="var(--muted)" strokeWidth="23" strokeLinejoin="round" />
        <path d={INFIELD_PATH} fill="color-mix(in srgb, var(--success) 10%, transparent)" />
        <path d={TRACK_PATH} fill="none" stroke="var(--muted-foreground)" strokeOpacity="0.35" strokeWidth="0.6" strokeDasharray="3 3" />
        <rect x="98.5" y="88.5" width="3" height="23" fill={`url(#${pattern})`} />
      </svg>
      {infield && (
        <div aria-hidden="true" className={cn("absolute inset-x-[30%] inset-y-[33%] flex items-center justify-center text-center", infieldClassName)}>{infield}</div>
      )}
      {children}
      {hidden > 0 && (
        <span aria-hidden="true" className="absolute bottom-0 right-0 rounded-full border border-border bg-card px-2 py-0.5 text-[clamp(0.6rem,2.4cqw,0.8rem)] font-bold text-muted-foreground">
          +{hidden} more
        </span>
      )}
    </div>
  );
}

/** One racer on the map. Moving along the track glides; moving between pit, grid and park uses a spring. */
export function MapDot({ point, emoji, color, isYou = false, dim = false, place, glide = false, label }: {
  point: TrackPoint;
  emoji: string;
  color: string;
  isYou?: boolean;
  dim?: boolean;
  place?: number;
  glide?: boolean;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const transition = reduce ? { duration: 0 } : glide ? { type: "tween" as const, ease: "linear" as const, duration: isYou ? 0.15 : 0.45 } : RACE_SPRING;
  return (
    <motion.span aria-hidden="true" data-map-dot initial={false} animate={toPercent(point)} transition={transition}
      className={cn("absolute z-10 -translate-x-1/2 -translate-y-1/2", isYou && "z-20")}>
      <span data-map-token className={cn("relative flex size-[clamp(1rem,5.5cqw,2.5rem)] items-center justify-center rounded-full border-2 bg-card text-[clamp(0.55rem,3cqw,1.35rem)] leading-none shadow-md transition-opacity",
        dim && "opacity-45 grayscale")} style={{ borderColor: color }}>
        {isYou && <span className="absolute inset-0 rounded-full border-2 border-primary motion-safe:animate-ping" />}
        <span>{emoji}</span>
        {place !== undefined && (
          <span className="absolute -right-1.5 -top-1.5 flex size-[clamp(0.85rem,2.6cqw,1.25rem)] items-center justify-center rounded-full bg-foreground text-[clamp(0.5rem,1.6cqw,0.7rem)] font-black text-background">
            {place}
          </span>
        )}
      </span>
      {label && (
        <span className="absolute left-1/2 top-full mt-0.5 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-card/90 px-1.5 text-[0.6rem] font-bold @md:block">{label}</span>
      )}
    </motion.span>
  );
}
