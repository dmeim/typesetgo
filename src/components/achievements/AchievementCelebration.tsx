import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon, ConfettiIcon, FastForwardIcon, TrophyIcon } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AchievementMedallion } from "@/components/auth/AchievementMedallion";
import { useAccount } from "@/components/layout/useAccount";
import { useAppAuth } from "@/components/layout/useAppAuth";
import { TierSegments } from "@/components/profile/AchievementDetailDialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  clearCelebrations, nextCelebration, registerCelebrationHost, useCelebrationQueue,
} from "@/lib/achievement-celebrations";
import { useNotifications } from "@/lib/notification-store";
import { JourneyRail } from "./AchievementCards";
import { findLevel, laddersWith, levelLabel, nextLabel, useStepStyle, type LadderLevel } from "./achievement-levels";
import { CelebrationConfetti } from "./CelebrationConfetti";

// How long to wait for saved achievements before playing with only what the award told us.
const LOAD_PATIENCE_MS = 1200;
// Tier names under the bar need about this much room before "Diamond" and "Emerald" stop clipping.
const TIER_LABELS_QUERY = "(min-width: 30rem)";

function subscribeToTierLabels(onChange: () => void) {
  const query = window.matchMedia?.(TIER_LABELS_QUERY);
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}
const showTierLabels = () => window.matchMedia?.(TIER_LABELS_QUERY).matches ?? false;

/**
 * The full-screen "Achievement unlocked" moment, mounted once by the app. It plays whatever `useNotify`
 * queues for achievements, one at a time, and waits while a test is in progress (see `useHoldCelebrations`).
 * `onViewAll` opens the profile's achievements; without it the link is left out.
 */
export function AchievementCelebration({ onViewAll }: { onViewAll?: () => void }) {
  const { queue, shown, holds } = useCelebrationQueue();
  const { user, isSignedIn } = useAppAuth();
  const account = useAccount();
  const { markAsRead } = useNotifications();
  const ownerId = isSignedIn ? user?.id ?? null : null;
  const lastOwner = useRef(ownerId);
  const current = queue.at(0);
  const clerkId = ownerId && account.status === "ready" ? ownerId : null;
  const earned = useQuery(api.achievements.getUserAchievements, current && clerkId ? { clerkId } : "skip");
  const loading = Boolean(current && clerkId && earned === undefined);
  const [patientFor, setPatientFor] = useState<string | null>(null);

  useEffect(() => registerCelebrationHost(), []);
  useEffect(() => {
    // Another account's awards must never play for whoever signs in next.
    if (lastOwner.current !== ownerId) clearCelebrations();
    lastOwner.current = ownerId;
  }, [ownerId]);
  useEffect(() => {
    if (!loading || !current) return;
    const timer = window.setTimeout(() => setPatientFor(current.key), LOAD_PATIENCE_MS);
    return () => window.clearTimeout(timer);
  }, [loading, current]);

  const ladders = useMemo(
    () => laddersWith(earned, Object.fromEntries(queue.map((item) => [item.achievementId, item.earnedAt]))),
    [earned, queue],
  );
  const level = findLevel(ladders, current?.achievementId);
  const ready = !loading || patientFor === current?.key;
  if (!current || !level || holds > 0 || !ready) return null;

  const seen = () => {
    if (current.notificationId) markAsRead(current.notificationId);
  };
  const advance = () => { seen(); nextCelebration(); };
  const skip = () => { seen(); clearCelebrations(); };
  const total = shown + queue.length;
  return (
    <CelebrationDialog key="celebration" level={level} itemKey={current.key} position={shown + 1} total={total}
      onNext={advance} onSkip={skip} onViewAll={onViewAll && (() => { skip(); onViewAll(); })} />
  );
}

function CelebrationDialog({ level, itemKey, position, total, onNext, onSkip, onViewAll }: {
  level: LadderLevel;
  itemKey: string;
  position: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
  onViewAll?: () => void;
}) {
  const style = useStepStyle();
  const reduced = useReducedMotion() ?? false;
  const tierLabels = useSyncExternalStore(subscribeToTierLabels, showTierLabels, () => false);
  const primary = useRef<HTMLButtonElement>(null);
  const { ladder, step } = level;
  const last = position >= total;

  useEffect(() => {
    // Each new achievement in a run starts on its own primary action.
    primary.current?.focus({ preventScroll: true });
  }, [itemKey]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onSkip(); }}>
      <DialogContent
        showCloseButton={false}
        data-achievement-celebration=""
        style={style(step)}
        onOpenAutoFocus={(event) => { event.preventDefault(); primary.current?.focus({ preventScroll: true }); }}
        className="left-0 top-0 flex h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 items-center justify-center overflow-y-auto overflow-x-hidden rounded-none border-0 bg-background/95 bg-[radial-gradient(circle_at_50%_35%,var(--achievement-surface),transparent_70%)] p-4 sm:max-w-none"
      >
        {!reduced && <CelebrationConfetti key={`${itemKey}-confetti`} tier={step.achievement.tier} />}
        <div key={itemKey} className="relative my-auto flex w-full max-w-md flex-col items-center gap-3 py-2 text-center [&>*]:shrink-0">
          <span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--achievement-accent)]">
            <span className="flex items-center gap-2 whitespace-nowrap"><ConfettiIcon weight="fill" className="size-4" aria-hidden="true" />Achievement unlocked</span>
            {total > 1 && <span className="whitespace-nowrap">· {position} of {total}</span>}
          </span>
          <motion.span initial={reduced ? false : { scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }} className="relative my-2 flex items-center justify-center">
            <motion.span aria-hidden="true" animate={reduced ? undefined : { rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute size-44 rounded-full opacity-60 [background:repeating-conic-gradient(var(--achievement-medallion)_0deg_8deg,transparent_8deg_24deg)] [mask-image:radial-gradient(circle,#000_30%,transparent_70%)]" />
            <AchievementMedallion icon={step.achievement.icon} earned size="large" />
          </motion.span>
          <motion.div initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-muted-foreground">{ladder.title} · {levelLabel(ladder, step)}</span>
            <DialogTitle className="break-words pr-0 text-2xl font-bold leading-tight">{step.achievement.title}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">{step.achievement.description}</DialogDescription>
          </motion.div>
          <div className="flex w-full flex-col gap-1.5 rounded-2xl border border-[var(--achievement-border)] bg-[var(--achievement-surface)] p-3 text-left">
            <TierSegments ladder={ladder} labels={tierLabels} />
            <span className="flex justify-between gap-2 text-[0.7rem] text-[var(--achievement-muted)]">
              <span className="capitalize">{step.achievement.tier} tier</span><span className="text-right">{nextLabel(ladder)}</span>
            </span>
          </div>
          <div className="w-full pt-1">
            <JourneyRail ladder={ladder} focusId={step.achievement.id} around={2} animate={!reduced} />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button type="button" ref={primary} onClick={onNext} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              {last ? "Nice!" : "Next achievement"}<ArrowRightIcon className="size-4" aria-hidden="true" />
            </button>
            {onViewAll && (
              <button type="button" onClick={onViewAll} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                <TrophyIcon className="size-3.5" aria-hidden="true" />Every level
              </button>
            )}
            {!last && (
              <button type="button" onClick={onSkip} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                <FastForwardIcon className="size-3.5" aria-hidden="true" />Skip the rest
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
