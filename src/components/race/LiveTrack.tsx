import { AnimatePresence, motion } from "framer-motion";
import { FlagCheckeredIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { BOUNCY_SPRING, RACE_SPRING, ordinal } from "./race-format";
import { MapDot, TrackMap } from "./TrackMap";
import type { LiveRacer } from "./live-racers";
import { MAP_LIMIT, PARK_LIMIT, laneOffset, parkSlot, trackPoint } from "./track-geometry";

const fraction = (progress: number) => Math.max(0, Math.min(100, progress)) / 100;

/** One lap of the oval: racers lap it live and finishers park in the infield in finishing order. */
export function LiveTrack({ racers, countdown }: { racers: LiveRacer[]; countdown: number | null }) {
  const you = racers.find((racer) => racer.isYou);
  const finishers = racers.filter((racer) => racer.isFinished);
  // The map draws at most a dozen racers (always including you); the standings list has everyone.
  const shown = racers.filter((racer) => racer.isYou).concat(racers.filter((racer) => !racer.isYou)).slice(0, MAP_LIMIT);
  const label = you
    ? `You are ${ordinal(you.place)} of ${racers.length}, ${you.isFinished ? "finished" : `${Math.round(fraction(you.progress) * 100)} percent round the lap`}`
    : `${racers.length} racers on the track`;
  return (
    <section aria-label="Track" className="min-w-0 rounded-3xl border border-border bg-card p-3 sm:p-6">
      <TrackMap className="mx-auto max-w-2xl" label={label} hidden={racers.length - shown.length}
        infield={countdown !== null ? (
          <AnimatePresence mode="popLayout">
            <motion.span key={countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={BOUNCY_SPRING}
              className="text-[clamp(2.5rem,14cqw,5rem)] font-black tabular-nums text-primary">
              {countdown}
            </motion.span>
          </AnimatePresence>
        ) : finishers.length === 0 ? (
          <span className="text-[clamp(0.55rem,2.4cqw,0.75rem)] font-bold uppercase tracking-widest text-muted-foreground">Finishers park here</span>
        ) : undefined}>
        {shown.map((racer) => racer.isFinished
          ? <MapDot key={racer.id} point={parkSlot(Math.min(racer.place, PARK_LIMIT), finishers.length)} emoji={racer.emoji} color={racer.color} isYou={racer.isYou} place={racer.place} />
          : <MapDot key={racer.id} point={trackPoint(fraction(racer.progress), laneOffset(racer.lane))} emoji={racer.emoji} color={racer.color} isYou={racer.isYou} glide label={racer.isYou ? "You" : undefined} />)}
      </TrackMap>
    </section>
  );
}

/** Live order with how far round each racer is and their speed. */
export function LiveStandings({ racers, className }: { racers: LiveRacer[]; className?: string }) {
  return (
    <section aria-labelledby="race-standings" className={cn("flex min-w-0 flex-col gap-1 rounded-3xl border border-border bg-card p-3", className)}>
      <h2 id="race-standings" className="px-2 pb-1 text-sm font-bold">Standings</h2>
      <ol className="flex flex-col gap-1">
        {racers.map((racer) => (
          <motion.li key={racer.id} layout="position" transition={RACE_SPRING}
            className={cn("flex min-w-0 items-center gap-2 rounded-2xl px-2 py-1.5 text-sm", racer.isYou && "bg-primary/10")}>
            <span className={cn("w-5 shrink-0 text-center font-black tabular-nums", racer.place === 1 ? "text-warning" : "text-muted-foreground")}>{racer.place}</span>
            <span aria-hidden="true">{racer.emoji}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{racer.name}{racer.isYou && <span className="sr-only"> (you)</span>}</span>
            {racer.isFinished
              ? <FlagCheckeredIcon weight="fill" className="size-4 shrink-0 text-success" role="img" aria-label="Finished" />
              : <span className="shrink-0 text-xs tabular-nums text-muted-foreground"><span className="sr-only">Progress </span>{Math.round(fraction(racer.progress) * 100)}%</span>}
            <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground"><strong className="text-foreground">{racer.wpm}</strong> WPM</span>
          </motion.li>
        ))}
      </ol>
      {racers.length === 0 && <p className="px-2 py-4 text-center text-sm text-muted-foreground">No connected racers.</p>}
    </section>
  );
}
