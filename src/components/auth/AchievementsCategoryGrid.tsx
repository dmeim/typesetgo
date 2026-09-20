import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowsClockwiseIcon, StackIcon } from "@phosphor-icons/react";
import { AchievementMedallion, AchievementTierBadge } from "@/components/auth/AchievementMedallion";
import { achievementStyle, useAchievementPalette } from "@/components/auth/achievement-presentation";
import {
  getAchievementById,
  filterToHighestAchievements,
  getAchievementsByCategory,
  ACHIEVEMENT_CATEGORIES,
  ALL_ACHIEVEMENTS,
  type Achievement,
  type AchievementCategory,
} from "@/lib/achievement-definitions";
import AchievementsModal from "./AchievementsModal";

interface AchievementsCategoryGridProps {
  earnedAchievements: Record<string, number>;
  isLoading?: boolean;
  onRefresh?: () => Promise<unknown>;
}

// 15 categories (excluding collection which is shown separately)
const CATEGORIES: AchievementCategory[] = [
  "speed",
  "words",
  "accuracy",
  "time",
  "streak",
  "tests",
  "explorer",
  "special",
  "consistency",
  "improvement",
  "challenge",
  "endurance",
  "timebased",
  "milestone",
  "quirky",
];

// Get the user's highest achievement in a category
function getHighestInCategory(
  category: AchievementCategory,
  earnedIds: string[]
): Achievement | null {
  const categoryAchievements = getAchievementsByCategory(category);
  const earnedInCategory = categoryAchievements.filter((a) =>
    earnedIds.includes(a.id)
  );

  if (earnedInCategory.length === 0) return null;

  // Filter to highest in each progressive group within this category
  const highestIds = filterToHighestAchievements(
    earnedInCategory.map((a) => a.id)
  );

  // Get the highest tier achievement among the filtered results
  const tierOrder = ["emerald", "diamond", "gold", "silver", "copper"];
  let highest: Achievement | null = null;

  for (const tier of tierOrder) {
    for (const id of highestIds) {
      const achievement = getAchievementById(id);
      if (achievement?.tier === tier) {
        highest = achievement;
        break;
      }
    }
    if (highest) break;
  }

  return highest || earnedInCategory[0];
}

function CategoryCard({
  category,
  earnedIds,
  onClick,
  isOpen,
  palette,
}: {
  category: AchievementCategory;
  earnedIds: string[];
  onClick: () => void;
  isOpen: boolean;
  palette: ReturnType<typeof useAchievementPalette>;
}) {
  const categoryInfo = ACHIEVEMENT_CATEGORIES[category];
  const categoryAchievements = getAchievementsByCategory(category);
  const earnedCount = categoryAchievements.filter((achievement) => earnedIds.includes(achievement.id)).length;
  const highestAchievement = getHighestInCategory(category, earnedIds);
  const presentation = highestAchievement ? palette.earned[highestAchievement.tier] : palette.empty;
  const isCollection = category === "collection";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-label={`${categoryInfo.name}: ${earnedCount} of ${categoryAchievements.length} earned`}
      data-achievement-category={category}
      data-achievement-tier={highestAchievement?.tier}
      style={achievementStyle(presentation)}
      className={`group flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--achievement-border)] bg-[var(--achievement-surface)] p-4 text-left text-[var(--achievement-foreground)] hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-[transform,box-shadow] motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.99] ${isCollection ? "col-span-full" : ""}`}
    >
      <span className={`flex min-w-0 gap-3 ${isCollection ? "items-center" : "flex-col items-start"}`}>
        <AchievementMedallion icon={highestAchievement?.icon ?? categoryInfo.icon} earned={!!highestAchievement} size={isCollection ? "medium" : "small"} />
        <span className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <span className="text-sm font-semibold [overflow-wrap:anywhere]">{categoryInfo.name}</span>
          {isCollection && <span className="text-xs text-[var(--achievement-muted)]">{earnedIds.length} achievements in your collection</span>}
          {highestAchievement && <AchievementTierBadge tier={highestAchievement.tier} />}
        </span>
      </span>
      <span className="text-sm [overflow-wrap:anywhere]">{highestAchievement?.title ?? "None earned yet"}</span>
      <span className="mt-auto flex flex-col gap-2">
        <span className="flex flex-wrap justify-between gap-x-2 text-xs text-[var(--achievement-muted)]">
          <span>{isCollection ? "Collection awards" : "Earned"}</span>
          <span className="font-semibold tabular-nums">{earnedCount} / {categoryAchievements.length}</span>
        </span>
        <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-[var(--achievement-track)]">
          <span className="block h-full rounded-full bg-[var(--achievement-accent)]" style={{ width: `${earnedCount / categoryAchievements.length * 100}%` }} />
        </span>
      </span>
    </button>
  );
}

export default function AchievementsCategoryGrid({
  earnedAchievements,
  isLoading = false,
  onRefresh,
}: AchievementsCategoryGridProps) {
  const palette = useAchievementPalette();
  const reduceMotion = useReducedMotion() !== false;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshPending = useRef(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | null>(null);

  const handleRefresh = async () => {
    if (!onRefresh || refreshPending.current || isLoading) return;
    refreshPending.current = true;
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      await onRefresh();
    } catch {
      setRefreshError("Achievements could not be refreshed. Please try again.");
    } finally {
      refreshPending.current = false;
      setIsRefreshing(false);
    }
  };

  const earnedIds = Object.keys(earnedAchievements);
  const openCategory = (category: AchievementCategory | null) => {
    setSelectedCategory(category);
    setShowAchievementsModal(true);
  };

  return (
    <>
      <section aria-label="Achievements" aria-busy={isLoading} className="@container flex flex-col gap-3 text-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold"><StackIcon aria-hidden="true" className="size-5 text-primary" />Achievements</h2>
            {!isLoading && (
              <button
                type="button"
                onClick={() => openCategory(null)}
                aria-haspopup="dialog"
                aria-expanded={showAchievementsModal && selectedCategory === null}
                aria-label={`View all achievements: ${earnedIds.length} of ${ALL_ACHIEVEMENTS.length} earned`}
                className="mt-1 rounded text-lg font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {earnedIds.length} / {ALL_ACHIEVEMENTS.length}
              </button>
            )}
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="flex min-h-10 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <ArrowsClockwiseIcon aria-hidden="true" className="size-4" />
              {isRefreshing ? "Refreshing…" : "Refresh achievements"}
            </button>
          )}
        </div>
        {refreshError && <p role="alert" className="text-sm text-foreground">{refreshError}</p>}
        {isRefreshing && <p role="status" className="sr-only">Refreshing achievements</p>}
        {isLoading ? (
          <p role="status" className="py-6 text-sm text-muted-foreground">Loading achievements…</p>
        ) : (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 gap-3 @min-[20rem]:grid-cols-2 @min-[34rem]:grid-cols-3"
          >
            {["collection" as const, ...CATEGORIES].map((category) => (
              <CategoryCard
                key={category}
                category={category}
                earnedIds={earnedIds}
                onClick={() => openCategory(category)}
                isOpen={showAchievementsModal && selectedCategory === category}
                palette={palette}
              />
            ))}
          </motion.div>
        )}
      </section>
      {showAchievementsModal && (
        <AchievementsModal
          earnedAchievements={earnedAchievements}
          onClose={() => {
            setShowAchievementsModal(false);
            setSelectedCategory(null);
          }}
          initialCategory={selectedCategory}
        />
      )}
    </>
  );
}
