import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowsInLineVerticalIcon, ArrowsOutLineVerticalIcon, CardsIcon, XIcon } from "@phosphor-icons/react";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { cn } from "@/lib/utils";
import { CollectorCard, JourneyTrail } from "./AchievementParts";
import { EmptyInbox, InboxActions, KindTile, SectionLabel, StageScrim, UnreadDot } from "./NotificationParts";
import { focusOnMount, noticeLabel, useStepStyle } from "./notice-utils";
import { achievementOf, ago, clockTime, isRecent, type MockNotice } from "./notifications-mock";
import { useEscape, type ConceptProps } from "./use-mock-inbox";

const pill = "inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-md ring-1 ring-border transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring";

/** 03 Toast stack: the pop-ups you missed wait in a stack; fan them out along a timeline. Achievements become a flip card. */
export function ToastStackConcept({ inbox, open, onClose }: ConceptProps) {
  const [fanned, setFanned] = useState(false);
  const [spotId, setSpotId] = useState<string | null>(null);
  const spot = inbox.notices.find((notice) => notice.id === spotId);
  const found = spot && achievementOf(spot);
  useEscape(open, () => (found ? setSpotId(null) : onClose()));
  const sorted = [...inbox.notices].sort((a, b) => b.at - a.at);
  const openNotice = (notice: MockNotice) => {
    inbox.read(notice.id);
    if (notice.kind === "achievement") setSpotId(notice.id);
  };

  return (
    <AnimatePresence>
      {open && <StageScrim key="catcher" onClose={onClose} className={fanned ? "" : "bg-transparent backdrop-blur-none"} />}
      {open && (
        <motion.section
          key="stack"
          role="dialog"
          aria-labelledby="toast-title"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={LAB_SPRING}
          className="pointer-events-none absolute inset-x-2 top-[4.5rem] @min-[22rem]:inset-x-3 bottom-3 z-40 flex flex-col gap-3 [&>*]:pointer-events-auto @min-[30rem]:left-auto @min-[30rem]:right-[max(0.75rem,calc(50%-15rem))] @min-[30rem]:w-[22rem]"
        >
          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2">
            <h2 id="toast-title" ref={focusOnMount} tabIndex={-1} className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold shadow-md ring-1 ring-border outline-none">
              {fanned ? "Timeline" : "Recent"} · {inbox.notices.length}
            </h2>
            {inbox.notices.length > 0 && (
              <button type="button" onClick={() => setFanned((value) => !value)} aria-expanded={fanned} className={pill}>
                {fanned ? <ArrowsInLineVerticalIcon className="size-3.5" aria-hidden="true" /> : <ArrowsOutLineVerticalIcon className="size-3.5" aria-hidden="true" />}
                {fanned ? "Stack them" : "Fan out"}
              </button>
            )}
          </div>
          {inbox.notices.length === 0 ? <div className="rounded-3xl bg-popover shadow-xl ring-1 ring-border"><EmptyInbox inbox={inbox} /></div> : fanned ? (
            <>
              <ol aria-label="Notifications, newest first" className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pb-2 pl-[5rem] pr-1 [&>*]:shrink-0">
                <span aria-hidden="true" className="absolute bottom-0 left-[4.05rem] top-2 w-0.5 rounded-full bg-border" />
                <AnimatePresence initial={false}>
                  {sorted.map((notice) => (
                    <motion.li key={notice.id} layoutId={`toast-${notice.id}`} transition={LAB_SPRING} exit={{ opacity: 0, x: 80 }}
                      drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.5}
                      onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 110) inbox.remove(notice.id); }}
                      className="relative">
                      <span className="absolute -left-[5rem] top-3 w-14 whitespace-nowrap text-right text-[0.6rem] leading-tight text-muted-foreground">{isRecent(notice.at) ? clockTime(notice.at) : ago(notice.at)}</span>
                      <span aria-hidden="true" className={cn("absolute -left-[0.85rem] top-4 size-2.5 -translate-x-1/2 rounded-full ring-4 ring-background", notice.unread ? "bg-primary" : "bg-muted-foreground/50")} />
                      <Toast notice={notice} onOpen={() => openNotice(notice)} onRemove={() => inbox.remove(notice.id)} />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ol>
              <div className="flex justify-end"><InboxActions inbox={inbox} className="rounded-full bg-card shadow-md ring-1 ring-border" /></div>
            </>
          ) : (
            <div className="relative">
              {sorted.slice(0, 4).map((notice, index) => (
                <motion.div key={notice.id} layoutId={`toast-${notice.id}`} transition={LAB_SPRING}
                  animate={{ y: index * 11, scale: 1 - index * 0.06, opacity: index < 3 ? 1 - index * 0.25 : 0 }}
                  style={{ zIndex: 10 - index, transformOrigin: "bottom center" }}
                  aria-hidden={index > 0} inert={index > 0}
                  className={cn("left-0 right-0 top-0 h-[4.75rem] overflow-hidden rounded-2xl shadow-lg", index === 0 ? "relative" : "absolute")}>
                  <Toast notice={notice} onOpen={() => (index === 0 ? openNotice(notice) : setFanned(true))} className={cn("h-full", index > 0 && "[&>*]:invisible")} />
                </motion.div>
              ))}
              {sorted.length > 1 && (
                <button type="button" onClick={() => setFanned(true)} className={cn(pill, "relative z-20 mx-auto mt-9 flex w-fit text-muted-foreground hover:text-foreground")}>
                  <CardsIcon className="size-3.5" aria-hidden="true" />{sorted.length - 1} more underneath
                </button>
              )}
            </div>
          )}
        </motion.section>
      )}
      {open && found && spot && <Spotlight key="spot" notice={spot} onClose={() => setSpotId(null)} />}
    </AnimatePresence>
  );
}

function Toast({ notice, onOpen, onRemove, className }: { notice: MockNotice; onOpen: () => void; onRemove?: () => void; className?: string }) {
  const style = useStepStyle();
  const found = achievementOf(notice);
  return (
    <div style={found ? style(found.step) : undefined}
      className={cn("flex items-start gap-1 rounded-2xl border bg-card text-card-foreground shadow-lg", className, found ? "border-[var(--achievement-border)] bg-[linear-gradient(110deg,var(--achievement-surface),var(--card)_70%)]" : "border-border")}>
      <button type="button" onClick={onOpen} aria-label={noticeLabel(notice, found ? "Open" : "Mark read:")} className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl p-3 text-left focus-visible:outline-2 focus-visible:outline-ring">
        <KindTile notice={notice} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2 text-sm font-semibold">
            {found && <span className="text-[0.6rem] font-bold uppercase tracking-wider text-[var(--achievement-accent)]">{found.step.achievement.tier}</span>}
            <span className="line-clamp-2">{notice.title}</span>
            {notice.unread && <UnreadDot />}
          </span>
          <span className="line-clamp-2 text-xs text-muted-foreground">{notice.body}</span>
        </span>
      </button>
      {onRemove && <button type="button" onClick={onRemove} aria-label={`Dismiss ${notice.title}`} className="m-1.5 flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"><XIcon className="size-3.5" aria-hidden="true" /></button>}
    </div>
  );
}

/** The achievement as a card in the middle of the screen; flip it to see the levels around it. */
function Spotlight({ notice, onClose }: { notice: MockNotice; onClose: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const found = achievementOf(notice);
  if (!found) return null;
  const face = "absolute inset-0 [backface-visibility:hidden]";
  return (
    <motion.div role="dialog" aria-label={`${found.step.achievement.title} card`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/70 p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.5, y: -160, rotate: 12 }} animate={{ scale: 1, y: 0, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="h-[min(25rem,calc(100%-4rem))] w-[min(17rem,100%)] [perspective:1200px]">
        <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: "spring", stiffness: 200, damping: 24 }} className="relative size-full [transform-style:preserve-3d]">
          <div className={face} inert={flipped} aria-hidden={flipped}>
            <CollectorCard ladder={found.ladder} step={found.step} isNew={isRecent(notice.at)} className="h-full" />
          </div>
          <div className={cn(face, "flex flex-col gap-2 overflow-hidden rounded-2xl border-2 border-border bg-popover p-3 [transform:rotateY(180deg)]")} inert={!flipped} aria-hidden={!flipped}>
            <SectionLabel className="px-0">{found.ladder.title} journey</SectionLabel>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <JourneyTrail ladder={found.ladder} focusId={found.step.achievement.id} around={2} />
            </div>
          </div>
        </motion.div>
      </motion.div>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" ref={focusOnMount} aria-pressed={flipped} onClick={() => setFlipped((value) => !value)} className={pill}>
          <CardsIcon className="size-3.5" aria-hidden="true" />{flipped ? "Show the card" : "Flip for the journey"}
        </button>
        <button type="button" onClick={onClose} className={pill}><XIcon className="size-3.5" aria-hidden="true" />Close the card</button>
      </div>
    </motion.div>
  );
}
