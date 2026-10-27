import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightIcon, CaretDownIcon, EnvelopeSimpleIcon, LockSimpleIcon, XIcon } from "@phosphor-icons/react";
import { toGo } from "@/components/profile/profile-stats";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { cn } from "@/lib/utils";
import { CollectorCard } from "./AchievementParts";
import { EmptyInbox, InboxActions, KindTile, NoticeExtra, StageScrim, UnreadDot } from "./NotificationParts";
import { focusOnMount, useStepStyle } from "./notice-utils";
import { achievementOf, ago, type MockNotice } from "./notifications-mock";
import { useEscape, type ConceptProps, type MockInbox } from "./use-mock-inbox";

const smallAction = "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";

/** 05 Compact list: one line per notification; each opens in place to show what it is about. */
export function CompactListConcept({ inbox, open, onClose }: ConceptProps) {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  useEscape(open, () => (expanded ? setExpanded(null) : onClose()));
  // The open row stays put even after it is marked read.
  const shown = inbox.notices.filter((notice) => !unreadOnly || notice.unread || notice.id === expanded);
  const toggle = (notice: MockNotice) => {
    inbox.read(notice.id);
    setExpanded((current) => (current === notice.id ? null : notice.id));
  };

  return (
    <AnimatePresence>
      {open && <StageScrim key="catcher" onClose={onClose} className="bg-transparent backdrop-blur-none" />}
      {open && (
        <motion.section key="list" role="dialog" aria-labelledby="compact-title"
          initial={{ opacity: 0, scale: 0.94, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: -8 }} transition={LAB_SPRING}
          style={{ transformOrigin: "top right" }}
          className="absolute inset-x-2 top-[4.5rem] @min-[22rem]:inset-x-3 z-40 flex max-h-[calc(100%-5.25rem)] flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl @min-[34rem]:left-auto @min-[34rem]:right-[max(0.75rem,calc(50%-15rem))] @min-[34rem]:w-[22rem]">
          <header className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
            <h2 id="compact-title" ref={focusOnMount} tabIndex={-1} className="text-sm font-semibold outline-none">Notifications</h2>
            <div role="group" aria-label="Show" className="flex rounded-full bg-muted p-0.5 text-[0.7rem]">
              {[false, true].map((value) => (
                <button key={String(value)} type="button" aria-pressed={unreadOnly === value} onClick={() => setUnreadOnly(value)}
                  className="rounded-full px-2.5 py-0.5 text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm">
                  {value ? `Unread ${inbox.unread}` : "All"}
                </button>
              ))}
            </div>
          </header>
          {inbox.notices.length === 0 ? <EmptyInbox inbox={inbox} /> : (
            <>
              <ul aria-label="Notifications" className="flex min-h-0 flex-col overflow-y-auto overscroll-contain py-1 [&>*]:shrink-0">
                {shown.map((notice) => (
                  <CompactRow key={notice.id} notice={notice} inbox={inbox} expanded={expanded === notice.id} onToggle={() => toggle(notice)} />
                ))}
                {shown.length === 0 && <li className="px-4 py-8 text-center text-xs text-muted-foreground">No unread notifications.</li>}
              </ul>
              <footer className="flex justify-end border-t border-border/60 px-1.5 py-1"><InboxActions inbox={inbox} /></footer>
            </>
          )}
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function CompactRow({ notice, inbox, expanded, onToggle }: { notice: MockNotice; inbox: MockInbox; expanded: boolean; onToggle: () => void }) {
  const panelId = `compact-${notice.id}`;
  return (
    <li className={cn("border-l-2 transition-colors", expanded ? "border-primary bg-accent/40" : "border-transparent")}>
      <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={panelId}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
        <KindTile notice={notice} className="size-6 rounded-lg" />
        <span className={cn("min-w-0 flex-1 truncate text-[0.8rem]", notice.unread ? "font-semibold" : "text-muted-foreground")}>
          {notice.title}{notice.unread && <span className="sr-only">, unread</span>}
        </span>
        <span className="shrink-0 text-[0.65rem] text-muted-foreground">{ago(notice.at)}</span>
        {notice.unread ? <UnreadDot /> : <span className="size-2 shrink-0" />}
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} className="shrink-0 text-muted-foreground"><CaretDownIcon className="size-3.5" aria-hidden="true" /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div id={panelId} key="panel" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={LAB_SPRING} className="overflow-hidden">
            <div className={cn("flex flex-col gap-3 px-3 pb-3 pt-1", notice.kind !== "achievement" && "pl-11")}>
              {notice.kind === "achievement" ? <AchievementPeek notice={notice} /> : (
                <>
                  <p className="text-xs text-muted-foreground">{notice.body}</p>
                  <NoticeExtra notice={notice} />
                </>
              )}
              <div className={cn("-ml-2 flex flex-wrap gap-1", notice.kind === "achievement" && "ml-0")}>
                <button type="button" onClick={() => inbox.toggleRead(notice.id)} className={smallAction}><EnvelopeSimpleIcon className="size-3.5" aria-hidden="true" />{notice.unread ? "Mark read" : "Mark unread"}</button>
                <button type="button" onClick={() => inbox.remove(notice.id)} className={smallAction}><XIcon className="size-3.5" aria-hidden="true" />Remove</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/** The small card, then the next few levels and how far away each one is. */
function AchievementPeek({ notice }: { notice: MockNotice }) {
  const style = useStepStyle();
  const found = achievementOf(notice);
  if (!found) return null;
  const { ladder, step } = found;
  const at = ladder.steps.indexOf(step);
  const upcoming = ladder.steps.slice(at + 1).filter((candidate) => !candidate.earned).slice(0, 3);
  return (
    <div className="flex flex-col gap-2">
      <CollectorCard ladder={ladder} step={step} variant="banner" className="shadow-none" />
      {upcoming.length > 0 && (
        <ol aria-label="Next levels" className="flex flex-col gap-1">
          {upcoming.map((next) => (
            <li key={next.achievement.id} style={style(next)} className="flex items-center gap-2 rounded-lg bg-[var(--achievement-surface)] px-2 py-1.5 text-xs">
              <LockSimpleIcon className="size-3.5 shrink-0 text-[var(--achievement-accent)]" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-medium">{next.achievement.title}</span>
              <span className="shrink-0 text-[0.65rem] text-[var(--achievement-muted)]">{toGo(ladder, next)}</span>
            </li>
          ))}
        </ol>
      )}
      <Link to="/temp-profile/achievements" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
        See every level<ArrowRightIcon className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
