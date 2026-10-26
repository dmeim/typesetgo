import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ArrowsOutSimpleIcon, CalendarCheckIcon, CheckIcon, LockSimpleIcon, SparkleIcon, XIcon } from "@phosphor-icons/react";
import AchievementIcon from "@/components/auth/AchievementIcon";
import { AchievementMedallion, AchievementTierBadge } from "@/components/auth/AchievementMedallion";
import { achievementStyle, useAchievementPalette } from "@/components/auth/achievement-presentation";
import { TIER_COLORS, type AchievementTier } from "@/lib/achievement-definitions";
import { AchievementDetailDialog, TierSegments } from "./AchievementDetailMockups";
import { Ring, StylePicker } from "./MockCharts";
import { LAB_SPRING } from "./lab-settings";
import {
  DETAIL_STYLES, MOCK_ACHIEVEMENTS, MOCK_ACHIEVEMENT_TOTALS, clock, earnedCount, earnedPhrase, ladderFor, nextStep, relativeDay, tiersOf, toGo, type MockAchievement,
} from "./mock-profile";

const STYLES = ["Medals", "Trading cards", "Tier ladder", "Stickers", "Trophy log", "Collector cards"];
const TIERS: AchievementTier[] = ["copper", "silver", "gold", "diamond", "emerald"];

const percent = (item: MockAchievement) => item.progress ? Math.round(item.progress.current / item.progress.target * 100) : 100;
const remaining = (item: MockAchievement) => item.progress ? `${(item.progress.target - item.progress.current).toLocaleString()} ${item.progress.unit} to go` : "";
const levelText = (item: MockAchievement) => item.level ? `Level ${item.level.index} of ${item.level.total}` : "One-time badge";

function usePresentation() {
  const palette = useAchievementPalette();
  return (item: MockAchievement) => achievementStyle((item.earnedAt ? palette.earned : palette.unearned)[item.achievement.tier]);
}

function ProgressBar({ item }: { item: MockAchievement }) {
  return (
    <span className="flex flex-col gap-1.5">
      <span className="flex justify-between gap-2 text-xs text-[var(--achievement-muted)]">
        <span className="tabular-nums">{item.progress!.current.toLocaleString()} / {item.progress!.target.toLocaleString()}</span>
        <span>{remaining(item)}</span>
      </span>
      <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-[var(--achievement-track)]">
        <motion.span className="block h-full rounded-full bg-[var(--achievement-accent)]" initial={{ width: 0 }} animate={{ width: `${percent(item)}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
      </span>
    </span>
  );
}

function EarnedLine({ item }: { item: MockAchievement }) {
  return item.earnedAt
    ? <span className="flex items-center gap-1.5 text-xs text-[var(--achievement-muted)]"><CalendarCheckIcon className="size-3.5" aria-hidden="true" /><span className="inline-block first-letter:uppercase">{earnedPhrase(item.earnedAt)}</span></span>
    : <ProgressBar item={item} />;
}

/** 1 · Medals: one big medallion per card with a soft tier glow. */
function Medals() {
  const style = usePresentation();
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4">
      {MOCK_ACHIEVEMENTS.map((item, index) => (
        <motion.article key={item.achievement.id} style={style(item)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...LAB_SPRING, delay: index * 0.05 }}
          className="relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-[var(--achievement-border)] bg-[var(--achievement-surface)] p-6 text-center text-[var(--achievement-foreground)]">
          <span aria-hidden="true" className="absolute -top-16 left-1/2 size-48 -translate-x-1/2 rounded-full bg-[var(--achievement-medallion)] opacity-25 blur-3xl" />
          <span className={item.earnedAt ? "" : "opacity-60 grayscale"}><AchievementMedallion icon={item.achievement.icon} earned={!!item.earnedAt} size="large" /></span>
          <span className="text-[0.7rem] uppercase tracking-widest text-[var(--achievement-muted)]">{item.category}</span>
          <h3 className="text-xl font-bold">{item.achievement.title}</h3>
          <p className="text-sm text-[var(--achievement-muted)]">{item.achievement.description}</p>
          <span className="flex items-center gap-2"><AchievementTierBadge tier={item.achievement.tier} /><span className="text-xs text-[var(--achievement-muted)]">{levelText(item)}</span></span>
          <span className="mt-auto w-full pt-2"><EarnedLine item={item} /></span>
        </motion.article>
      ))}
    </div>
  );
}

/** 2 · Trading cards: tall collectible cards; earned ones catch the light on hover. */
function TradingCards() {
  const style = usePresentation();
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-5">
      {MOCK_ACHIEVEMENTS.map((item, index) => (
        <motion.article key={item.achievement.id} style={style(item)} initial={{ opacity: 0, rotateY: -25 }} animate={{ opacity: 1, rotateY: 0 }} transition={{ ...LAB_SPRING, delay: index * 0.06 }}
          whileHover={item.earnedAt ? { y: -6, rotate: -1 } : undefined}
          className="group relative flex aspect-[5/7] flex-col overflow-hidden rounded-2xl border-2 border-[var(--achievement-border)] bg-[var(--achievement-surface)] text-[var(--achievement-foreground)] shadow-lg">
          <div className="relative flex flex-[1.2] items-center justify-center overflow-hidden bg-[linear-gradient(160deg,var(--achievement-medallion),var(--achievement-surface))]">
            <span aria-hidden="true" className="absolute inset-0 opacity-20 [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:12px_12px]" />
            <AchievementIcon icon={item.achievement.icon} className={`relative size-20 text-[var(--achievement-icon)] drop-shadow-md ${item.earnedAt ? "" : "opacity-40"}`} />
            {!item.earnedAt && <LockSimpleIcon weight="fill" className="absolute right-3 top-3 size-5 text-[var(--achievement-muted)]" aria-label="Locked" />}
            {item.earnedAt && (
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_35%,#ffffff55_50%,transparent_65%)] transition-transform duration-700 group-hover:translate-x-full" />
            )}
            <span className="absolute left-3 top-3 rounded-full bg-black/25 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-white">{item.achievement.tier}</span>
          </div>
          <div className="flex flex-1 flex-col gap-1.5 p-4">
            <span className="text-[0.65rem] uppercase tracking-widest text-[var(--achievement-muted)]">{item.category} · {item.level ? `#${item.level.index}` : "Special"}</span>
            <h3 className="text-lg font-bold leading-tight">{item.achievement.title}</h3>
            <p className="text-xs text-[var(--achievement-muted)]">{item.achievement.description}</p>
            <span className="mt-auto"><EarnedLine item={item} /></span>
          </div>
        </motion.article>
      ))}
    </div>
  );
}

/** 3 · Tier ladder: where you are on copper → emerald, and how far to the next step. */
function TierLadder() {
  const style = usePresentation();
  return (
    <div className="@container flex flex-col gap-3">
      {MOCK_ACHIEVEMENTS.map((item, index) => {
        const reached = TIERS.indexOf(item.achievement.tier) - (item.earnedAt ? 0 : 1);
        return (
          <motion.article key={item.achievement.id} style={style(item)} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...LAB_SPRING, delay: index * 0.05 }}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-2xl border border-[var(--achievement-border)] bg-[var(--achievement-surface)] p-4 text-[var(--achievement-foreground)] @3xl:grid-cols-[auto_minmax(0,1fr)_minmax(16rem,22rem)]">
            <AchievementMedallion icon={item.achievement.icon} earned={!!item.earnedAt} size="medium" />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-xs text-[var(--achievement-muted)]">{item.category}</span>
              <h3 className="text-lg font-bold">{item.achievement.title}</h3>
              <p className="text-sm text-[var(--achievement-muted)]">{item.achievement.description}</p>
            </div>
            {item.level ? (
              <div className="col-span-2 flex flex-col gap-2 @3xl:col-span-1">
                <div className="flex gap-1" aria-label={`Tier ${reached + 1} of 5`}>
                  {TIERS.map((tier, tierIndex) => (
                    <span key={tier} className="flex flex-1 flex-col items-center gap-1">
                      <span className="relative h-2.5 w-full overflow-hidden rounded-full bg-[var(--achievement-track)]">
                        <motion.span className="absolute inset-y-0 left-0 rounded-full" style={{ backgroundColor: TIER_COLORS[tier].bg }}
                          initial={{ width: 0 }} animate={{ width: tierIndex <= reached ? "100%" : tierIndex === reached + 1 && item.progress ? `${percent(item)}%` : 0 }}
                          transition={{ duration: 0.5, delay: 0.15 + tierIndex * 0.12 }} />
                      </span>
                      <span className={`text-[0.65rem] capitalize ${tierIndex === Math.max(reached, 0) ? "font-bold" : "text-[var(--achievement-muted)]"}`}>{tier}</span>
                    </span>
                  ))}
                </div>
                <span className="text-xs text-[var(--achievement-muted)]">{item.earnedAt ? `${levelText(item)} · ${earnedPhrase(item.earnedAt)}` : `${levelText(item)} · ${remaining(item)}`}</span>
              </div>
            ) : (
              <span className="col-span-2 flex items-center gap-2 text-sm @3xl:col-span-1"><SparkleIcon weight="fill" className="size-5 text-[var(--achievement-accent)]" aria-hidden="true" />One-time badge · {earnedPhrase(item.earnedAt!)}</span>
            )}
          </motion.article>
        );
      })}
    </div>
  );
}

/** 4 · Stickers: a sticker book you can tap; each sticker grows into its own card. */
function Stickers() {
  const style = usePresentation();
  const [open, setOpen] = useState<string | null>(null);
  const opened = MOCK_ACHIEVEMENTS.find((item) => item.achievement.id === open);
  const tilt = [-6, 4, -3, 7];
  return (
    <LayoutGroup>
      <div className="relative flex min-h-80 flex-wrap items-start justify-center gap-6 rounded-3xl border border-border bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-card p-8 [background-size:18px_18px]">
        {MOCK_ACHIEVEMENTS.map((item, index) => (
          <motion.button key={item.achievement.id} type="button" layoutId={`sticker-${item.achievement.id}`} style={{ ...style(item), rotate: tilt[index] }} onClick={() => setOpen(item.achievement.id)}
            whileHover={{ scale: 1.08, rotate: 0 }} whileTap={{ scale: 0.95 }} transition={LAB_SPRING} aria-haspopup="dialog" aria-label={`${item.achievement.title}${item.earnedAt ? "" : ", locked"}`}
            className={`flex w-36 flex-col items-center gap-2 rounded-[2rem] border-4 p-4 text-center text-[var(--achievement-foreground)] shadow-[0_6px_0_var(--achievement-border)] focus-visible:outline-2 focus-visible:outline-ring ${item.earnedAt ? "border-white/80 bg-[var(--achievement-surface)]" : "border-dashed border-[var(--achievement-border)] bg-transparent opacity-70"}`}>
            <span className="flex size-16 items-center justify-center rounded-full bg-[var(--achievement-medallion)] text-[var(--achievement-icon)]"><AchievementIcon icon={item.achievement.icon} className="size-9" /></span>
            <span className="text-sm font-bold leading-tight">{item.achievement.title}</span>
            {!item.earnedAt && <Ring value={percent(item)} size={34} stroke={4} color="var(--achievement-accent)" track="var(--achievement-track)"><span className="text-[0.6rem] font-bold tabular-nums">{percent(item)}%</span></Ring>}
          </motion.button>
        ))}
        <AnimatePresence>
          {opened && (
            <motion.div key="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-background/70 p-4 backdrop-blur-sm" onClick={() => setOpen(null)}>
              <motion.article layoutId={`sticker-${opened.achievement.id}`} transition={LAB_SPRING} style={style(opened)} role="dialog" aria-label={opened.achievement.title} onClick={(event) => event.stopPropagation()}
                className="relative flex w-full max-w-sm flex-col items-center gap-3 rounded-[2rem] border-4 border-white/80 bg-[var(--achievement-surface)] p-6 text-center text-[var(--achievement-foreground)] shadow-2xl">
                <button type="button" aria-label="Close" onClick={() => setOpen(null)} className="absolute right-3 top-3 rounded-full p-1.5 hover:bg-black/10"><XIcon className="size-4" aria-hidden="true" /></button>
                <AchievementMedallion icon={opened.achievement.icon} earned={!!opened.earnedAt} size="large" />
                <span className="text-xs uppercase tracking-widest text-[var(--achievement-muted)]">{opened.category}</span>
                <h3 className="text-2xl font-bold">{opened.achievement.title}</h3>
                <p className="text-sm text-[var(--achievement-muted)]">{opened.achievement.description}</p>
                <AchievementTierBadge tier={opened.achievement.tier} />
                <span className="w-full"><EarnedLine item={opened} /></span>
              </motion.article>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}

/** 5 · Trophy log: what's next on top, then everything you've unlocked in order. */
function TrophyLog() {
  const style = usePresentation();
  const next = MOCK_ACHIEVEMENTS.filter((item) => !item.earnedAt);
  const earned = MOCK_ACHIEVEMENTS.filter((item) => item.earnedAt).sort((a, b) => b.earnedAt! - a.earnedAt!);
  return (
    <div className="flex flex-col gap-6">
      {next.map((item) => (
        <motion.section key={item.achievement.id} style={style(item)} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={LAB_SPRING}
          className="flex flex-wrap items-center gap-5 rounded-3xl border border-[var(--achievement-border)] bg-[var(--achievement-surface)] p-5 text-[var(--achievement-foreground)]">
          <Ring value={percent(item)} size={76} stroke={7} color="var(--achievement-accent)" track="var(--achievement-track)">
            <AchievementIcon icon={item.achievement.icon} className="size-8 text-[var(--achievement-accent)]" />
          </Ring>
          <div className="flex min-w-48 flex-1 flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--achievement-accent)]">Up next</span>
            <h3 className="text-xl font-bold">{item.achievement.title}</h3>
            <p className="text-sm text-[var(--achievement-muted)]">{item.achievement.description} · {remaining(item)}</p>
          </div>
          <span className="text-3xl font-bold tabular-nums">{percent(item)}%</span>
        </motion.section>
      ))}
      <ol className="relative flex flex-col gap-4 border-l-2 border-border pl-6">
        {earned.map((item, index) => (
          <motion.li key={item.achievement.id} style={style(item)} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ ...LAB_SPRING, delay: index * 0.07 }} className="relative">
            <span aria-hidden="true" className="absolute -left-[2.05rem] top-5 flex size-5 items-center justify-center rounded-full border-2 border-background bg-[var(--achievement-medallion)] text-[var(--achievement-icon)]"><CheckIcon className="size-3" /></span>
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--achievement-border)] bg-[var(--achievement-surface)] p-4 text-[var(--achievement-foreground)]">
              <AchievementMedallion icon={item.achievement.icon} earned size="small" />
              <div className="flex min-w-48 flex-1 flex-col">
                <span className="text-sm"><strong>{item.achievement.title}</strong> <span className="text-[var(--achievement-muted)]">in {item.category}</span></span>
                <span className="text-xs text-[var(--achievement-muted)]">{item.achievement.description}</span>
              </div>
              <span className="text-right text-xs text-[var(--achievement-muted)]">{relativeDay(item.earnedAt!)}<br />{clock(item.earnedAt!)}</span>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

/** 6 · Collector cards: the trading card, with tier bars showing how far through each tier you are. Tap to see every level. */
function CollectorCards({ onOpen }: { onOpen: (item: MockAchievement) => void }) {
  const style = usePresentation();
  const palette = useAchievementPalette();
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-5">
      {MOCK_ACHIEVEMENTS.map((item, index) => {
        const ladder = ladderFor(item);
        const earned = earnedCount(ladder);
        const next = nextStep(ladder);
        // Show the highest level reached, or the first one still ahead, so the card matches its tier bars.
        const shown = ladder.current ? ladder.steps[Math.max(earned - 1, 0)] : { achievement: item.achievement, earned: !!item.earnedAt, earnedAt: item.earnedAt };
        const tier = tiersOf(ladder).find((summary) => summary.tier === shown.achievement.tier);
        const look = shown.earned ? achievementStyle(palette.earned[shown.achievement.tier]) : style(item);
        return (
          <motion.button key={item.achievement.id} type="button" onClick={() => onOpen(item)} aria-haspopup="dialog" style={look}
            initial={{ opacity: 0, rotateY: -25 }} animate={{ opacity: 1, rotateY: 0 }} transition={{ ...LAB_SPRING, delay: index * 0.06 }} whileHover={{ y: -6, rotate: -1 }} whileTap={{ scale: 0.98 }}
            className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-[var(--achievement-border)] bg-[var(--achievement-surface)] text-left text-[var(--achievement-foreground)] shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <span className="relative flex h-36 items-center justify-center overflow-hidden bg-[linear-gradient(160deg,var(--achievement-medallion),var(--achievement-surface))]">
              <span aria-hidden="true" className="absolute inset-0 opacity-20 [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:12px_12px]" />
              <AchievementIcon icon={shown.achievement.icon} className={`relative size-16 text-[var(--achievement-icon)] drop-shadow-md ${shown.earned ? "" : "opacity-40"}`} />
              {shown.earned && <span aria-hidden="true" className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_35%,#ffffff55_50%,transparent_65%)] transition-transform duration-700 group-hover:translate-x-full" />}
              <span className="absolute left-3 top-3 rounded-full bg-black/25 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-white">{shown.achievement.tier}</span>
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/25 px-2 py-0.5 text-[0.65rem] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><ArrowsOutSimpleIcon className="size-3" aria-hidden="true" />All levels</span>
            </span>
            <span className="flex flex-1 flex-col gap-1.5 p-4">
              <span className="text-[0.65rem] uppercase tracking-widest text-[var(--achievement-muted)]">{item.category} · {ladder.current ? `Level ${earned} of ${ladder.steps.length}` : `${earned} of ${ladder.steps.length} badges`}</span>
              <span className="text-lg font-bold leading-tight">{shown.achievement.title}</span>
              <span className="text-xs text-[var(--achievement-muted)]">{shown.achievement.description}</span>
              <span className="mt-auto flex flex-col gap-1.5 pt-3">
                <TierSegments ladder={ladder} />
                <span className="flex justify-between gap-2 text-[0.7rem] text-[var(--achievement-muted)]">
                  <span className="inline-block first-letter:uppercase">{ladder.current && tier ? `${tier.earned} of ${tier.steps.length} ${shown.achievement.tier}` : shown.earnedAt ? earnedPhrase(shown.earnedAt) : "Not yet"}</span>
                  <span className="text-right">{next ? `Next: ${ladder.current ? toGo(ladder, next) : next.achievement.title}` : "All done"}</span>
                </span>
              </span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

const VARIANTS = [Medals, TradingCards, TierLadder, Stickers, TrophyLog];

/** Achievements tab: overall progress plus five candidate card designs to compare. */
export function AchievementsPanel() {
  const [style, setStyle] = useState(STYLES.length - 1);
  const [detailStyle, setDetailStyle] = useState(0);
  const [opened, setOpened] = useState<MockAchievement | null>(null);
  const Variant = VARIANTS[style];
  const overall = Math.round(MOCK_ACHIEVEMENT_TOTALS.earned / MOCK_ACHIEVEMENT_TOTALS.total * 100);
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-center gap-5 rounded-3xl border border-border bg-card p-6">
        <Ring value={overall} size={72} stroke={7}><span className="text-sm font-bold tabular-nums">{overall}%</span></Ring>
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <h2 className="text-2xl font-bold">Achievements</h2>
          <p className="text-sm text-muted-foreground">{MOCK_ACHIEVEMENT_TOTALS.earned} of {MOCK_ACHIEVEMENT_TOTALS.total} earned · a few examples below, every card uses the same design</p>
        </div>
      </section>
      <div className="flex flex-col gap-2">
        <span className="px-1 text-xs uppercase tracking-wider text-muted-foreground">Card style (mockup)</span>
        <StylePicker label="Achievement card style" value={style} onChange={setStyle} names={STYLES} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="px-1 text-xs uppercase tracking-wider text-muted-foreground">Details window (mockup) · tap a collector card, or</span>
        <div className="flex flex-wrap items-center gap-2">
          <StylePicker label="Achievement details window style" value={detailStyle} onChange={setDetailStyle} names={DETAIL_STYLES} />
          <button type="button" onClick={() => setOpened(MOCK_ACHIEVEMENTS[0])} aria-haspopup="dialog" className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
            <ArrowsOutSimpleIcon className="size-4" aria-hidden="true" />Open example
          </button>
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={style} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {style === STYLES.length - 1 ? <CollectorCards onOpen={setOpened} /> : <Variant />}
        </motion.div>
      </AnimatePresence>
      {opened && <AchievementDetailDialog item={opened} ladder={ladderFor(opened)} style={detailStyle} onClose={() => setOpened(null)} />}
    </div>
  );
}
