import { useRef, useState } from "react";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import AchievementIcon from "@/components/auth/AchievementIcon";
import {
  getAchievementById,
  TIER_COLORS,
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
}: {
  category: AchievementCategory;
  earnedIds: string[];
  onClick: () => void;
  isOpen: boolean;
}) {
  const categoryInfo = ACHIEVEMENT_CATEGORIES[category];
  const categoryAchievements = getAchievementsByCategory(category);
  const earnedCount = categoryAchievements.filter((achievement) => earnedIds.includes(achievement.id)).length;
  const highestAchievement = getHighestInCategory(category, earnedIds);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-label={`${categoryInfo.name}: ${earnedCount} of ${categoryAchievements.length} earned`}
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-3 text-left text-card-foreground hover:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex w-full flex-wrap items-start gap-x-2 gap-y-1">
        <AchievementIcon icon={categoryInfo.icon} className="size-5" />
        <span className="min-w-0 flex-1 text-sm font-semibold [overflow-wrap:anywhere]">{categoryInfo.name}</span>
        <span className="text-xs text-muted-foreground">{earnedCount}/{categoryAchievements.length}</span>
      </span>
      {highestAchievement ? (
        <span className="flex items-start gap-2 border-t border-border pt-3">
          <AchievementIcon icon={highestAchievement.icon} className="size-5" />
          <span className="min-w-0">
            <span className="block text-sm [overflow-wrap:anywhere]">{highestAchievement.title}</span>
            <span className="mt-1 flex items-center gap-1.5 text-xs capitalize text-muted-foreground">
              <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: TIER_COLORS[highestAchievement.tier].bg }} />
              {highestAchievement.tier}
            </span>
          </span>
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">None earned yet</span>
      )}
    </button>
  );
}

export default function AchievementsCategoryGrid({
  earnedAchievements,
  isLoading = false,
  onRefresh,
}: AchievementsCategoryGridProps) {
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
            <h2 className="text-sm font-semibold">Achievements</h2>
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
          <div className="grid grid-cols-1 gap-3 @min-[24rem]:grid-cols-2 @min-[42rem]:grid-cols-3">
            {["collection" as const, ...CATEGORIES].map((category) => (
              <CategoryCard
                key={category}
                category={category}
                earnedIds={earnedIds}
                onClick={() => openCategory(category)}
                isOpen={showAchievementsModal && selectedCategory === category}
              />
            ))}
          </div>
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
