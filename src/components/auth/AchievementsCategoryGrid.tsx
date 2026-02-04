import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useTheme } from "@/hooks/useTheme";
import type { LegacyTheme } from "@/types/theme";
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
  // Record of achievementId -> earnedAt timestamp
  earnedAchievements: Record<string, number>;
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

// Category card component
function CategoryCard({
  category,
  earnedIds,
  theme,
  onClick,
}: {
  category: AchievementCategory;
  earnedIds: string[];
  theme: LegacyTheme;
  onClick: () => void;
}) {
  const categoryInfo = ACHIEVEMENT_CATEGORIES[category];
  const categoryAchievements = getAchievementsByCategory(category);
  const earnedCount = categoryAchievements.filter((a) =>
    earnedIds.includes(a.id)
  ).length;
  const highestAchievement = getHighestInCategory(category, earnedIds);

  const hasEarned = earnedCount > 0;
  const tierColors = highestAchievement
    ? TIER_COLORS[highestAchievement.tier]
    : null;

  return (
    <button
      onClick={onClick}
      className="flex flex-col p-2.5 rounded-xl transition-all hover:scale-[1.02] hover:shadow-lg text-left h-full"
      style={{
        backgroundColor: hasEarned
          ? `${tierColors?.bg}15`
          : `${theme.defaultText}08`,
        borderWidth: 1,
        borderColor: hasEarned
          ? `${tierColors?.border}40`
          : `${theme.defaultText}15`,
      }}
    >
      {/* Category Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{categoryInfo.icon}</span>
        <span
          className="text-xs font-semibold truncate flex-1"
          style={{ color: theme.correctText }}
        >
          {categoryInfo.name}
        </span>
        <span
          className="text-[10px] font-medium"
          style={{ color: theme.buttonSelected }}
        >
          {earnedCount}/{categoryAchievements.length}
        </span>
      </div>

      {/* Achievement Level Card */}
      {hasEarned && highestAchievement ? (
        <div
          className="flex items-center gap-2 p-2 rounded-lg flex-1"
          style={{
            backgroundColor: `${tierColors?.bg}20`,
            borderWidth: 1,
            borderColor: `${tierColors?.border}50`,
          }}
        >
          {/* Achievement Icon */}
          <div className="text-xl shrink-0">{highestAchievement.icon}</div>

          {/* Achievement Info */}
          <div className="flex-1 min-w-0">
            <div
              className="text-[11px] font-medium line-clamp-1"
              style={{ color: theme.correctText }}
            >
              {highestAchievement.title}
            </div>
            <div
              className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider inline-block mt-0.5"
              style={{
                backgroundColor: tierColors?.bg,
                color: tierColors?.text,
              }}
            >
              {highestAchievement.tier}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex items-center justify-center p-2 rounded-lg opacity-40 flex-1"
          style={{
            backgroundColor: `${theme.defaultText}10`,
            borderWidth: 1,
            borderColor: `${theme.defaultText}20`,
          }}
        >
          <span className="text-xs" style={{ color: theme.defaultText }}>
            None yet
          </span>
        </div>
      )}
    </button>
  );
}

export default function AchievementsCategoryGrid({
  earnedAchievements,
}: AchievementsCategoryGridProps) {
  const { user } = useUser();
  const { legacyTheme } = useTheme();
  
  // Fallback theme (complete)
  const theme: LegacyTheme = legacyTheme ?? {
    cursor: "#3cb5ee",
    defaultText: "#4b5563",
    upcomingText: "#4b5563",
    correctText: "#d1d5db",
    incorrectText: "#ef4444",
    buttonUnselected: "#3cb5ee",
    buttonSelected: "#0097b2",
    backgroundColor: "#323437",
    surfaceColor: "#2c2e31",
    ghostCursor: "#a855f7",
  };
  const recheckAchievements = useMutation(
    api.achievements.recheckAllAchievements
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State for the full achievements board modal (optionally filtered by category)
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<AchievementCategory | null>(null);

  const handleRefresh = async () => {
    if (!user || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await recheckAchievements({ clerkId: user.id });
    } catch (error) {
      console.error("Failed to refresh achievements:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const earnedIds = Object.keys(earnedAchievements);
  const totalEarned = earnedIds.length;

  // Get the user's highest collection achievement
  const collectionAchievement = getHighestInCategory("collection", earnedIds);
  const collectionTierColors = collectionAchievement
    ? TIER_COLORS[collectionAchievement.tier]
    : null;

  const handleCategoryClick = (category: AchievementCategory) => {
    setSelectedCategory(category);
    setShowAchievementsModal(true);
  };

  return (
    <>
      <div className="flex flex-col h-full gap-3">
        {/* Header Cards Row */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          {/* Left Card - Achievements Title & Count */}
          <div
            className="p-3 rounded-xl flex flex-col justify-center"
            style={{
              backgroundColor: `${theme.backgroundColor}80`,
              border: `1px solid ${theme.defaultText}20`,
            }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-wide mb-1"
              style={{ color: theme.defaultText }}
            >
              Achievements
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setShowAchievementsModal(true);
                }}
                className="text-lg font-bold hover:underline transition-all cursor-pointer"
                style={{ color: theme.buttonSelected }}
              >
                {totalEarned} / {ALL_ACHIEVEMENTS.length}
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || !user}
                className="p-1.5 rounded transition-all hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: theme.defaultText }}
                title="Refresh achievements"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isRefreshing ? "animate-spin" : ""}
                  style={{ animationDirection: "reverse" }}
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Card - Collection Achievement (Prestige) */}
          <button
            onClick={() => handleCategoryClick("collection")}
            className="p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02] text-left"
            style={{
              backgroundColor: collectionAchievement
                ? `${collectionTierColors?.bg}15`
                : `${theme.backgroundColor}80`,
              border: `1px solid ${
                collectionAchievement
                  ? `${collectionTierColors?.border}40`
                  : `${theme.defaultText}20`
              }`,
            }}
          >
            {collectionAchievement ? (
              <>
                {/* Achievement Icon */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
                  style={{
                    backgroundColor: `${collectionTierColors?.bg}30`,
                    borderWidth: 2,
                    borderColor: collectionTierColors?.border,
                  }}
                >
                  {collectionAchievement.icon}
                </div>
                {/* Achievement Info */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-semibold truncate"
                    style={{ color: theme.correctText }}
                  >
                    {collectionAchievement.title}
                  </div>
                  <div
                    className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider inline-block mt-1"
                    style={{
                      backgroundColor: collectionTierColors?.bg,
                      color: collectionTierColors?.text,
                    }}
                  >
                    {collectionAchievement.tier}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col justify-center">
                <div
                  className="text-xs font-semibold uppercase tracking-wide mb-1"
                  style={{ color: theme.defaultText }}
                >
                  Collector
                </div>
                <div
                  className="text-sm opacity-60"
                  style={{ color: theme.defaultText }}
                >
                  Earn achievements to unlock
                </div>
              </div>
            )}
          </button>
        </div>

        {/* Category Grid - 5x3 for 15 categories */}
        <div className="flex-1 grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-3 grid-rows-5 gap-2">
          {CATEGORIES.map((category) => (
            <CategoryCard
              key={category}
              category={category}
              earnedIds={earnedIds}
              theme={theme}
              onClick={() => handleCategoryClick(category)}
            />
          ))}
        </div>
      </div>

      {/* Full Achievements Board Modal */}
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
