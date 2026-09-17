import { useRef, useState } from "react";
import AchievementIcon from "@/components/auth/AchievementIcon";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ALL_ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  TIER_COLORS,
  getAchievementsByCategory,
  getAchievementById,
  type Achievement,
  type AchievementCategory,
} from "@/lib/achievement-definitions";
import AchievementDetailModal from "./AchievementDetailModal";

interface AchievementsModalProps {
  earnedAchievements: Record<string, number>;
  onClose: () => void;
  onCloseAutoFocus?: (event: Event) => void;
  initialCategory?: AchievementCategory | null;
  initialAchievementId?: string | null;
}

const categories = Object.keys(ACHIEVEMENT_CATEGORIES) as AchievementCategory[];

export default function AchievementsModal({
  earnedAchievements,
  onClose,
  onCloseAutoFocus,
  initialCategory,
  initialAchievementId,
}: AchievementsModalProps) {
  const [returnFocus] = useState(() => document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const categoryRefs = useRef(new Map<AchievementCategory, HTMLHeadingElement>());
  const achievementRefs = useRef(new Map<string, HTMLButtonElement>());
  const [selectedCarousel, setSelectedCarousel] = useState<{
    achievements: { achievement: Achievement; earnedAt: number | null }[];
    initialIndex: number;
  } | null>(null);
  const earnedIds = new Set(Object.keys(earnedAchievements));

  const focusCategory = (category: AchievementCategory) => {
    const target = categoryRefs.current.get(category);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "start", behavior: "instant" });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden border-border bg-background p-0 text-foreground shadow-none sm:max-w-5xl"
        onOpenAutoFocus={(event) => {
          const achievement = initialAchievementId ? achievementRefs.current.get(initialAchievementId) : undefined;
          const category = initialCategory ?? (initialAchievementId ? getAchievementById(initialAchievementId)?.category : undefined);
          if (achievement) {
            event.preventDefault();
            achievement.focus({ preventScroll: true });
            achievement.scrollIntoView({ block: "center", behavior: "instant" });
          } else if (category) {
            event.preventDefault();
            focusCategory(category);
          }
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          if (!event.defaultPrevented && returnFocus?.isConnected) {
            event.preventDefault();
            returnFocus.focus({ preventScroll: true });
          }
        }}
      >
        <DialogHeader className="shrink-0 border-b border-border p-4 pr-12 text-left sm:p-6 sm:pr-12">
          <DialogTitle className="text-xl">All Achievements</DialogTitle>
          <DialogDescription>
            {earnedIds.size} / {ALL_ACHIEVEMENTS.length} earned · {Math.round(earnedIds.size / ALL_ACHIEVEMENTS.length * 100)}% complete
          </DialogDescription>
          <label className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            Category
            <NativeSelect
              aria-label="Jump to achievement category"
              defaultValue={initialCategory ?? (initialAchievementId ? getAchievementById(initialAchievementId)?.category : undefined) ?? categories[0]}
              className="min-w-0 max-w-full rounded-md border border-input bg-background pl-2 pr-9 py-2 text-sm"
              onChange={(event) => focusCategory(event.target.value as AchievementCategory)}
            >
              {categories.map((category) => <NativeSelectOption key={category} value={category}>{ACHIEVEMENT_CATEGORIES[category].name}</NativeSelectOption>)}
            </NativeSelect>
          </label>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {categories.map((category) => {
            const info = ACHIEVEMENT_CATEGORIES[category];
            const achievements = getAchievementsByCategory(category);
            const count = achievements.filter((achievement) => earnedIds.has(achievement.id)).length;
            return (
              <section key={category} aria-labelledby={`achievement-category-${category}`} className="mb-6 last:mb-0">
                <h3
                  id={`achievement-category-${category}`}
                  ref={(element) => { if (element) categoryRefs.current.set(category, element); else categoryRefs.current.delete(category); }}
                  tabIndex={-1}
                  className="mb-3 flex scroll-mt-4 flex-wrap items-center gap-2 rounded text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <AchievementIcon icon={info.icon} className="size-5" />
                  {info.name}
                  <span className="ml-auto text-xs font-normal text-muted-foreground">{count} / {achievements.length}</span>
                </h3>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3">
                  {achievements.map((achievement, index) => {
                    const isEarned = earnedIds.has(achievement.id);
                    return (
                      <button
                        type="button"
                        key={achievement.id}
                        ref={(element) => { if (element) achievementRefs.current.set(achievement.id, element); else achievementRefs.current.delete(achievement.id); }}
                        aria-label={`${info.name}: ${achievement.title}, ${achievement.tier}, ${isEarned ? "earned" : "not yet earned"}`}
                        aria-haspopup="dialog"
                        onClick={() => setSelectedCarousel({
                          achievements: achievements.map((item) => ({ achievement: item, earnedAt: earnedAchievements[item.id] ?? null })),
                          initialIndex: index,
                        })}
                        className={`flex min-w-0 flex-col items-center gap-2 rounded-lg border bg-card p-3 text-card-foreground hover:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${initialAchievementId === achievement.id ? "border-ring" : "border-border"}`}
                      >
                        <span className="flex items-center gap-1.5 text-xs capitalize text-muted-foreground">
                          <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: isEarned ? TIER_COLORS[achievement.tier].bg : "currentColor" }} />
                          {achievement.tier}
                        </span>
                        <AchievementIcon icon={achievement.icon} className={`size-6 ${isEarned ? "" : "text-muted-foreground"}`} />
                        <span className="text-sm font-medium [overflow-wrap:anywhere]">{achievement.title}</span>
                        <span className="text-xs text-muted-foreground">{isEarned ? "Earned" : "Not yet earned"}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
        {selectedCarousel && (
          <AchievementDetailModal
            achievements={selectedCarousel.achievements}
            initialIndex={selectedCarousel.initialIndex}
            onClose={() => setSelectedCarousel(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
