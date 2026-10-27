import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftIcon, ArrowRightIcon, EnvelopeOpenIcon, EnvelopeSimpleIcon, XIcon } from "@phosphor-icons/react";
import { ScrollRow } from "@/components/ui/scroll-row";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { cn } from "@/lib/utils";
import { CollectorCard, JourneyTrail } from "./AchievementParts";
import { EmptyInbox, InboxActions, KindTile, NoticeExtra, SectionLabel, StageScrim, UnreadDot } from "./NotificationParts";
import { focusOnMount, noticeLabel } from "./notice-utils";
import { KIND_LABELS, achievementOf, ago, isRecent, type MockNotice, type NoticeKind } from "./notifications-mock";
import { useEscape, type ConceptProps } from "./use-mock-inbox";

const FILTERS: ("all" | NoticeKind)[] = ["all", "achievement", "streak", "best", "room", "system"];
const iconAction = "flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";

/** 02 Inbox drawer: a full-height drawer with filters; an achievement slides to its own page with the card and the journey. */
export function InboxDrawerConcept({ inbox, open, onClose }: ConceptProps) {
  const [filter, setFilter] = useState<"all" | NoticeKind>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const opened = inbox.notices.find((notice) => notice.id === openedId);
  const found = opened && achievementOf(opened);
  useEscape(open, () => (found ? setOpenedId(null) : onClose()));
  const shown = inbox.notices.filter((notice) => (filter === "all" || notice.kind === filter) && (!unreadOnly || notice.unread || notice.id === openedId));
  const countOf = (kind: "all" | NoticeKind) => inbox.notices.filter((notice) => kind === "all" || notice.kind === kind).length;

  return (
    <AnimatePresence>
      {open && <StageScrim key="scrim" onClose={onClose} className="z-50" />}
      {open && (
        <motion.aside
          key="drawer"
          role="dialog"
          aria-labelledby="inbox-title"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={LAB_SPRING}
          className="absolute inset-y-0 right-0 z-50 flex w-full flex-col overflow-hidden border-l border-border bg-popover text-popover-foreground shadow-2xl @min-[30rem]:w-[24rem] @min-[30rem]:rounded-l-3xl"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {found && opened ? (
              <motion.div key="detail" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={LAB_SPRING} className="flex min-h-0 flex-1 flex-col">
                <header className="flex items-center gap-2 border-b border-border/60 px-3 py-3">
                  <button type="button" ref={focusOnMount} onClick={() => setOpenedId(null)} aria-label="Back to inbox" className={iconAction}><ArrowLeftIcon className="size-4" aria-hidden="true" /></button>
                  <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{found.ladder.title}</h2>
                  <span className="text-xs text-muted-foreground">{ago(opened.at)}</span>
                </header>
                <div className="flex flex-col gap-4 overflow-y-auto overscroll-contain p-4 [&>*]:shrink-0">
                  <CollectorCard ladder={found.ladder} step={found.step} isNew={isRecent(opened.at)} />
                  <AchievementJourney key={opened.id} notice={opened} />
                  <Link to="/temp-profile/achievements" className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs hover:bg-accent">
                    All achievements in Profile<ArrowRightIcon className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ x: "-30%", opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "-30%", opacity: 0 }} transition={LAB_SPRING} className="flex min-h-0 flex-1 flex-col">
                <header className="flex flex-col gap-3 border-b border-border/60 px-4 pb-3 pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 id="inbox-title" ref={focusOnMount} tabIndex={-1} className="text-lg font-bold outline-none">Inbox</h2>
                    <div className="flex items-center gap-2">
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                        Unread only
                        <button type="button" role="switch" aria-checked={unreadOnly} aria-label="Unread only" onClick={() => setUnreadOnly((value) => !value)}
                          className="relative h-5 w-9 rounded-full bg-muted transition-colors aria-checked:bg-primary focus-visible:outline-2 focus-visible:outline-ring">
                          <motion.span layout transition={LAB_SPRING} className={cn("absolute top-0.5 size-4 rounded-full bg-background shadow", unreadOnly ? "right-0.5" : "left-0.5")} />
                        </button>
                      </label>
                      <button type="button" onClick={onClose} aria-label="Close inbox" className={iconAction}><XIcon className="size-4" aria-hidden="true" /></button>
                    </div>
                  </div>
                  <ScrollRow aria-label="Filter notifications" className="-mx-1">
                    {FILTERS.map((kind) => (
                      <button key={kind} type="button" aria-pressed={filter === kind} onClick={() => setFilter(kind)}
                        className="mx-0.5 shrink-0 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground">
                        {kind === "all" ? "All" : KIND_LABELS[kind]} <span className="tabular-nums opacity-70">{countOf(kind)}</span>
                      </button>
                    ))}
                  </ScrollRow>
                </header>
                {inbox.notices.length === 0 ? <EmptyInbox inbox={inbox} title="Your inbox is empty" className="flex-1 justify-center" /> : (
                  <>
                    <ul aria-label="Notifications" className="flex flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-2 [&>*]:shrink-0">
                      {shown.map((notice) => (
                        <InboxRow key={notice.id} notice={notice}
                          onOpen={() => { inbox.read(notice.id); if (notice.kind === "achievement") setOpenedId(notice.id); }}
                          onToggle={() => inbox.toggleRead(notice.id)} onRemove={() => inbox.remove(notice.id)} />
                      ))}
                      {shown.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted-foreground">Nothing {unreadOnly ? "unread " : ""}in {filter === "all" ? "your inbox" : KIND_LABELS[filter]}.</li>}
                    </ul>
                    <footer className="flex justify-end border-t border-border/60 px-2 py-2"><InboxActions inbox={inbox} /></footer>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function AchievementJourney({ notice }: { notice: MockNotice }) {
  const [all, setAll] = useState(false);
  const found = achievementOf(notice);
  if (!found) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <SectionLabel className="px-0">The journey</SectionLabel>
        <button type="button" onClick={() => setAll((value) => !value)} aria-expanded={all} className="text-xs text-primary hover:underline">{all ? "Fewer levels" : `All ${found.ladder.steps.length} levels`}</button>
      </div>
      <JourneyTrail ladder={found.ladder} focusId={found.step.achievement.id} around={all ? found.ladder.steps.length : 2} />
    </div>
  );
}

function InboxRow({ notice, onOpen, onToggle, onRemove }: { notice: MockNotice; onOpen: () => void; onToggle: () => void; onRemove: () => void }) {
  const achievement = notice.kind === "achievement";
  return (
    <motion.li layout transition={LAB_SPRING} exit={{ opacity: 0, x: 40 }} className={cn("group flex items-start gap-1 rounded-2xl transition-colors hover:bg-accent/60", notice.unread && "bg-accent/30")}>
      <button type="button" onClick={onOpen} aria-label={noticeLabel(notice, achievement ? "Open" : "Mark read:")} className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl p-2.5 text-left focus-visible:outline-2 focus-visible:outline-ring">
        <span className="relative">
          <KindTile notice={notice} className="size-10 rounded-2xl" />
          {notice.unread && <UnreadDot className="absolute -left-0.5 -top-0.5 ring-2 ring-popover" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline justify-between gap-2">
            <span className={cn("line-clamp-2 text-sm", notice.unread ? "font-semibold" : "font-medium")}>{notice.title}</span>
            <span className="shrink-0 text-[0.65rem] text-muted-foreground">{ago(notice.at)}</span>
          </span>
          <span className="line-clamp-2 text-xs text-muted-foreground">{notice.body}</span>
          {notice.kind === "best" && <span className="pt-1.5"><NoticeExtra notice={notice} /></span>}
          {achievement && <span className="pt-0.5 text-[0.7rem] font-medium text-primary">See the card and the journey</span>}
        </span>
      </button>
      <span className="flex flex-col pr-1 pt-1.5 opacity-100 transition-opacity @min-[30rem]:opacity-0 @min-[30rem]:group-focus-within:opacity-100 @min-[30rem]:group-hover:opacity-100">
        <button type="button" onClick={onToggle} aria-label={`Mark ${notice.unread ? "read" : "unread"}: ${notice.title}`} className={iconAction}>
          {notice.unread ? <EnvelopeOpenIcon className="size-4" aria-hidden="true" /> : <EnvelopeSimpleIcon className="size-4" aria-hidden="true" />}
        </button>
        <button type="button" onClick={onRemove} aria-label={`Remove ${notice.title}`} className={iconAction}><XIcon className="size-4" aria-hidden="true" /></button>
      </span>
    </motion.li>
  );
}
