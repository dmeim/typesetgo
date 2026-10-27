import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightIcon, ConfettiIcon, FastForwardIcon } from "@phosphor-icons/react";
import { AchievementMedallion } from "@/components/auth/AchievementMedallion";
import { TierSegments } from "@/components/profile/AchievementDetailDialog";
import { ScrollRow } from "@/components/ui/scroll-row";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { TIER_COLORS } from "@/lib/achievement-definitions";
import { cn } from "@/lib/utils";
import { JourneyRail } from "./AchievementParts";
import { EmptyInbox, InboxActions, KindTile, NoticeExtra, SectionLabel, StageScrim, UnreadDot } from "./NotificationParts";
import { focusOnMount, levelLabel, nextLabel, noticeLabel, useStepStyle } from "./notice-utils";
import { achievementOf, ago, type MockNotice } from "./notifications-mock";
import { useEscape, type ConceptProps, type MockInbox } from "./use-mock-inbox";

const unreadAchievements = (inbox: MockInbox) => inbox.notices.filter((notice) => notice.kind === "achievement" && notice.unread).map((notice) => notice.id);

/** 04 Celebration: new achievements play first as a full-screen moment, then the rest of the inbox as a short list. */
export function CelebrationConcept({ inbox, open, onClose }: ConceptProps) {
  const [wasOpen, setWasOpen] = useState(open);
  const [queue, setQueue] = useState<string[]>(() => (open ? unreadAchievements(inbox) : []));
  const [index, setIndex] = useState(0);
  // Each time the bell opens, anything new and shiny goes first.
  if (open !== wasOpen) {
    setWasOpen(open);
    setQueue(open ? unreadAchievements(inbox) : []);
    setIndex(0);
  }
  const current = inbox.notices.find((notice) => notice.id === queue[index]);
  const celebrating = open && current !== undefined;
  const finish = () => {
    queue.forEach((id) => inbox.read(id));
    setQueue([]);
    setIndex(0);
  };
  const advance = () => {
    if (current) inbox.read(current.id);
    if (index + 1 < queue.length) setIndex(index + 1);
    else finish();
  };
  const replay = (notice: MockNotice) => {
    setQueue([notice.id]);
    setIndex(0);
  };
  useEscape(open, () => (celebrating ? finish() : onClose()));

  return (
    <AnimatePresence>
      {open && <StageScrim key="catcher" onClose={celebrating ? finish : onClose} className={celebrating ? "z-50 bg-background/90" : "bg-transparent backdrop-blur-none"} />}
      {celebrating && current && (
        <Celebration key={current.id} notice={current} position={index + 1} total={queue.length} onNext={advance} onSkip={finish} />
      )}
      {open && !celebrating && <ShelfList key="list" inbox={inbox} onReplay={replay} />}
    </AnimatePresence>
  );
}

function Celebration({ notice, position, total, onNext, onSkip }: { notice: MockNotice; position: number; total: number; onNext: () => void; onSkip: () => void }) {
  const style = useStepStyle();
  const found = achievementOf(notice);
  if (!found) return null;
  const { ladder, step } = found;
  const last = position === total;
  return (
    <motion.section role="dialog" aria-labelledby="celebration-title" style={style(step)}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.96 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_35%,var(--achievement-surface),transparent_70%)] p-4">
      <Confetti tier={step.achievement.tier} />
      <div className="relative flex max-h-full w-full max-w-md flex-col items-center gap-3 overflow-y-auto text-center [&>*]:shrink-0">
        <span className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-[var(--achievement-accent)]">
          <ConfettiIcon weight="fill" className="size-4" aria-hidden="true" />Achievement unlocked{total > 1 && ` · ${position} of ${total}`}
        </span>
        <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }} className="relative my-2 flex items-center justify-center">
          <motion.span aria-hidden="true" animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute size-44 rounded-full opacity-60 [background:repeating-conic-gradient(var(--achievement-medallion)_0deg_8deg,transparent_8deg_24deg)] [mask-image:radial-gradient(circle,#000_30%,transparent_70%)]" />
          <AchievementMedallion icon={step.achievement.icon} earned size="large" />
        </motion.span>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{ladder.title} · {levelLabel(ladder, step)}</span>
          <h2 id="celebration-title" className="text-2xl font-bold leading-tight">{step.achievement.title}</h2>
          <p className="text-sm text-muted-foreground">{step.achievement.description}</p>
        </motion.div>
        <div className="flex w-full flex-col gap-1.5 rounded-2xl border border-[var(--achievement-border)] bg-[var(--achievement-surface)] p-3 text-left">
          <TierSegments ladder={ladder} labels />
          <span className="flex justify-between gap-2 text-[0.7rem] text-[var(--achievement-muted)]"><span className="capitalize">{step.achievement.tier} tier</span><span>{nextLabel(ladder)}</span></span>
        </div>
        <div className="w-full pt-1">
          <JourneyRail ladder={ladder} focusId={step.achievement.id} around={2} />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button type="button" ref={focusOnMount} onClick={onNext} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            {last ? "Nice!" : "Next achievement"}<ArrowRightIcon className="size-4" aria-hidden="true" />
          </button>
          <Link to="/temp-profile/achievements" className="rounded-full px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">Every level</Link>
          {!last && (
            <button type="button" onClick={onSkip} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
              <FastForwardIcon className="size-3.5" aria-hidden="true" />Skip to notifications
            </button>
          )}
        </div>
      </div>
    </motion.section>
  );
}

/** A burst of paper from behind the medal. Positions are fixed per piece so the burst looks the same each time. */
function Confetti({ tier }: { tier: keyof typeof TIER_COLORS }) {
  const colors = [TIER_COLORS[tier].bg, "var(--primary)", "var(--accent-emphasis)", "var(--warning)", "var(--success)"];
  return (
    <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[38%]">
      {Array.from({ length: 42 }, (_, piece) => {
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

/** After the celebration: recent medals on a shelf (tap to replay), then everything else. */
function ShelfList({ inbox, onReplay }: { inbox: MockInbox; onReplay: (notice: MockNotice) => void }) {
  const style = useStepStyle();
  const medals = inbox.notices.filter((notice) => notice.kind === "achievement");
  const rest = inbox.notices.filter((notice) => notice.kind !== "achievement");
  return (
    <motion.section role="dialog" aria-labelledby="shelf-title"
      initial={{ opacity: 0, scale: 0.94, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: -8 }} transition={LAB_SPRING}
      style={{ transformOrigin: "top right" }}
      className="absolute inset-x-2 top-[4.5rem] @min-[22rem]:inset-x-3 z-40 flex max-h-[calc(100%-5.25rem)] flex-col overflow-hidden rounded-3xl border border-border bg-popover text-popover-foreground shadow-xl @min-[34rem]:left-auto @min-[34rem]:right-[max(0.75rem,calc(50%-15rem))] @min-[34rem]:w-[22rem]">
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-3">
        <h2 id="shelf-title" ref={focusOnMount} tabIndex={-1} className="text-sm font-semibold outline-none">Notifications</h2>
        <InboxActions inbox={inbox} className="-mr-2" />
      </header>
      {inbox.notices.length === 0 ? <EmptyInbox inbox={inbox} /> : (
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain pb-3 [&>*]:shrink-0">
          {medals.length > 0 && (
            <div className="flex flex-col gap-2 border-y border-border/60 bg-muted/30 py-3">
              <SectionLabel className="px-4">Trophy shelf · tap to replay</SectionLabel>
              <ScrollRow aria-label="Recent achievements" className="px-2">
                {medals.map((notice) => {
                  const found = achievementOf(notice);
                  if (!found) return null;
                  return (
                    <motion.button key={notice.id} type="button" onClick={() => onReplay(notice)} aria-label={`Replay ${notice.title}`} whileHover={{ y: -3 }} style={style(found.step)}
                      className="mx-1 flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-2xl p-1.5 text-center hover:bg-[var(--achievement-surface)] focus-visible:outline-2 focus-visible:outline-ring">
                      <AchievementMedallion icon={found.step.achievement.icon} earned size="small" />
                      <span className="line-clamp-2 text-[0.65rem] font-medium leading-tight">{notice.title}</span>
                      <span className="text-[0.6rem] text-muted-foreground">{ago(notice.at)}</span>
                    </motion.button>
                  );
                })}
              </ScrollRow>
            </div>
          )}
          <ul aria-label="Other notifications" className="flex flex-col gap-0.5 px-2">
            {rest.map((notice) => (
              <li key={notice.id} className={cn("flex flex-col gap-2 rounded-2xl p-2.5", notice.unread && "bg-accent/40")}>
                <button type="button" onClick={() => inbox.read(notice.id)} aria-label={noticeLabel(notice, "Mark read:")} className="flex items-start gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-ring">
                  <KindTile notice={notice} className="size-8 rounded-xl" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2 text-sm font-medium">{notice.title}{notice.unread && <UnreadDot />}</span>
                    <span className="text-xs text-muted-foreground">{notice.body}</span>
                    <span className="text-[0.65rem] text-muted-foreground/80">{ago(notice.at)}</span>
                  </span>
                </button>
                {(notice.kind === "best" || notice.kind === "room") && <div className="pl-11"><NoticeExtra notice={notice} /></div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.section>
  );
}
