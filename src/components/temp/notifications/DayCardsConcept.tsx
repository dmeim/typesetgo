import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { cn } from "@/lib/utils";
import { CollectorCard, JourneyTrail } from "./AchievementParts";
import { EmptyInbox, InboxActions, KindTile, NoticeExtra, SectionLabel, StageScrim, UnreadDot } from "./NotificationParts";
import { focusOnMount, noticeLabel } from "./notice-utils";
import { achievementOf, ago, byDay, type MockNotice } from "./notifications-mock";
import { useEscape, type ConceptProps } from "./use-mock-inbox";

/** 01 Day cards: a popover grouped by day where achievements are wide collector cards that grow into the full card. */
export function DayCardsConcept({ inbox, open, onClose }: ConceptProps) {
  const [openedId, setOpenedId] = useState<string | null>(null);
  const opened = inbox.notices.find((notice) => notice.id === openedId);
  const found = opened && achievementOf(opened);
  useEscape(open, () => (found ? setOpenedId(null) : onClose()));
  const openNotice = (notice: MockNotice) => {
    inbox.read(notice.id);
    if (notice.kind === "achievement") setOpenedId(notice.id);
  };

  return (
    <AnimatePresence>
      {open && <StageScrim key="catcher" onClose={onClose} className={found ? "z-40" : "bg-transparent backdrop-blur-none"} />}
      {open && !found && (
        <motion.section
          key="popover"
          role="dialog"
          aria-labelledby="day-cards-title"
          initial={{ opacity: 0, scale: 0.94, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -8 }}
          transition={LAB_SPRING}
          style={{ transformOrigin: "top right" }}
          className="absolute inset-x-2 top-[4.5rem] @min-[22rem]:inset-x-3 z-40 flex max-h-[calc(100%-5.25rem)] flex-col overflow-hidden rounded-3xl border border-border bg-popover text-popover-foreground shadow-xl @min-[34rem]:left-auto @min-[34rem]:right-[max(0.75rem,calc(50%-15rem))] @min-[34rem]:w-[24rem]"
        >
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
            <h2 id="day-cards-title" ref={focusOnMount} tabIndex={-1} className="flex items-center gap-2 text-sm font-semibold outline-none">
              Notifications
              {inbox.unread > 0 && <span className="whitespace-nowrap rounded-full bg-primary px-1.5 py-px text-[0.65rem] font-bold text-primary-foreground">{inbox.unread} new</span>}
            </h2>
            <InboxActions inbox={inbox} className="-mr-2" />
          </header>
          {inbox.notices.length === 0 ? <EmptyInbox inbox={inbox} /> : (
            <div className="flex flex-col gap-4 overflow-y-auto overscroll-contain p-3 [&>*]:shrink-0">
              {byDay(inbox.notices).map((group) => (
                <section key={group.label} aria-label={group.label} className="flex flex-col gap-2">
                  <SectionLabel>{group.label}</SectionLabel>
                  {group.notices.map((notice) => <DayItem key={notice.id} notice={notice} onOpen={() => openNotice(notice)} />)}
                </section>
              ))}
            </div>
          )}
        </motion.section>
      )}
      {open && found && opened && (
        <motion.section
          key="detail"
          role="dialog"
          aria-labelledby="day-cards-detail"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[4.5rem]"
        >
          <div className="pointer-events-auto flex w-full max-w-2xl flex-col gap-4 rounded-3xl border border-border bg-popover p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <button type="button" ref={focusOnMount} onClick={() => setOpenedId(null)} className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                <ArrowLeftIcon className="size-4" aria-hidden="true" />Notifications
              </button>
              <Link to="/temp-profile/achievements" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                Every achievement<ArrowRightIcon className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            <h2 id="day-cards-detail" className="sr-only">{found.step.achievement.title}</h2>
            <div className="flex flex-col gap-4 @min-[40rem]:flex-row">
              <motion.div layoutId={`day-card-${opened.id}`} transition={LAB_SPRING} className="@min-[40rem]:w-64 @min-[40rem]:shrink-0">
                <CollectorCard ladder={found.ladder} step={found.step} isNew />
              </motion.div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <SectionLabel className="px-0">On the journey</SectionLabel>
                <JourneyTrail ladder={found.ladder} focusId={found.step.achievement.id} around={1} />
              </div>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function DayItem({ notice, onOpen }: { notice: MockNotice; onOpen: () => void }) {
  const found = achievementOf(notice);
  if (found) {
    return (
      <motion.button layoutId={`day-card-${notice.id}`} transition={LAB_SPRING} type="button" onClick={onOpen} aria-label={noticeLabel(notice)} aria-haspopup="dialog"
        whileHover={{ y: -2 }} className="relative rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <CollectorCard ladder={found.ladder} step={found.step} variant="banner" className={cn(!notice.unread && "shadow-none")} />
        {notice.unread && <UnreadDot className="absolute -left-1 -top-1 size-3 ring-2 ring-popover" />}
      </motion.button>
    );
  }
  return (
    <div className={cn("flex items-start gap-1 rounded-2xl transition-colors hover:bg-accent/60", notice.unread && "bg-accent/40")}>
      <button type="button" onClick={onOpen} aria-label={noticeLabel(notice, "Mark read:")}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl p-2.5 text-left focus-visible:outline-2 focus-visible:outline-ring">
        <KindTile notice={notice} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2 text-sm font-medium">{notice.title}{notice.unread && <UnreadDot />}</span>
          <span className="text-xs text-muted-foreground">{notice.body}</span>
          {notice.kind === "streak" && <span className="pt-1"><NoticeExtra notice={notice} /></span>}
          <span className="text-[0.65rem] text-muted-foreground/80">{ago(notice.at)}</span>
        </span>
      </button>
      {notice.kind === "room" && (
        <button type="button" onClick={() => onOpen()} aria-label={`Join the room: ${notice.title}`} className="mr-2 mt-2.5 shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90">Join</button>
      )}
    </div>
  );
}
