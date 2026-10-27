import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { CollectorCard, JourneyTrail } from "@/components/achievements/AchievementCards";
import type { LadderLevel } from "@/components/achievements/achievement-levels";
import { PROFILE_SPRING } from "@/components/profile/profile-sections";
import type { Notification } from "@/lib/notification-store";
import { cardLayoutId } from "./notification-groups";
import { SectionLabel } from "./NotificationItems";

const DAY = 24 * 60 * 60 * 1000;
const focusOnMount = (node: HTMLElement | null) => node?.focus({ preventScroll: true });

/** An opened achievement notification: the full collector card beside the levels just behind and ahead. */
export function AchievementNoticeDetail({ notification, level, titleId, onBack, onLeave }: {
  notification: Notification;
  level: LadderLevel;
  titleId: string;
  onBack: () => void;
  /** Called when the link to every achievement is followed. */
  onLeave: () => void;
}) {
  const { ladder, step } = level;
  const [openedAt] = useState(Date.now);
  const recent = openedAt - (step.earnedAt ?? notification.timestamp) < DAY;
  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" ref={focusOnMount} onClick={onBack} aria-label="Back to notifications"
          className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <ArrowLeftIcon className="size-4" aria-hidden="true" />Notifications
        </button>
        <Link to="/profile/achievements" onClick={onLeave}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">
          Every achievement<ArrowRightIcon className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      <h2 id={titleId} className="sr-only">{step.achievement.title}</h2>
      <div className="flex flex-col gap-4 @min-[36rem]:flex-row">
        <motion.div layoutId={cardLayoutId(notification)} transition={PROFILE_SPRING} className="@min-[36rem]:w-64 @min-[36rem]:shrink-0">
          <CollectorCard ladder={ladder} step={step} isNew={recent} />
        </motion.div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <SectionLabel className="px-0">On the journey</SectionLabel>
          <JourneyTrail ladder={ladder} focusId={step.achievement.id} around={1} focusLabel={recent ? "Just earned" : "This one"} />
        </div>
      </div>
    </div>
  );
}
