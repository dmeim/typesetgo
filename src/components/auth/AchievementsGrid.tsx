import { ArrowsClockwiseIcon, TrophyIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import AchievementIcon from "@/components/auth/AchievementIcon";
import { api } from "../../../convex/_generated/api";
import { useTheme } from "@/hooks/useTheme";
import { tv } from "@/lib/theme-vars";
import {
  getAchievementById,
  TIER_COLORS,
  filterToHighestAchievements,
  getEarnedInProgressiveGroup,
  ALL_ACHIEVEMENTS,
  type Achievement,
} from "@/lib/achievement-definitions";
import AchievementDetailModal from "./AchievementDetailModal";
import AchievementsModal from "./AchievementsModal";

interface AchievementsGridProps {
  // Record of achievementId -> earnedAt timestamp
  earnedAchievements: Record<string, number>;
  // Maximum visible rows before scrolling (shows +0.5 to indicate more)
  maxVisibleRows?: number;
}

export default function AchievementsGrid({
  earnedAchievements,
  maxVisibleRows,
}: AchievementsGridProps) {
  const { user } = useUser();
  const { colors } = useTheme();
  const recheckAchievements = useMutation(api.achievements.recheckAllAchievements);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State now holds an array of achievements in the progressive group and the initial index
  const [selectedAchievements, setSelectedAchievements] = useState<{
    achievements: { achievement: Achievement; earnedAt: number }[];
    initialIndex: number;
  } | null>(null);

  // State for the full achievements board modal
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);

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

  // Get all earned achievement IDs
  const earnedIds = Object.keys(earnedAchievements);

  // Filter to only show highest in each progressive group
  const displayIds = filterToHighestAchievements(earnedIds);

  // Get achievement objects with earned timestamps
  const achievements = displayIds
    .map((id) => {
      const achievement = getAchievementById(id);
      if (!achievement) return null;
      return { achievement, earnedAt: earnedAchievements[id] };
    })
    .filter(Boolean) as { achievement: Achievement; earnedAt: number }[];

  // Handler to open the detail modal with all achievements in the progressive group
  const handleAchievementClick = (clickedAchievement: Achievement) => {
    // Get all earned achievements in the same progressive group
    const groupIds = getEarnedInProgressiveGroup(clickedAchievement.id, earnedIds);

    // Map to achievement objects with earned timestamps
    const groupAchievements = groupIds
      .map((id) => {
        const achievement = getAchievementById(id);
        if (!achievement) return null;
        return { achievement, earnedAt: earnedAchievements[id] };
      })
      .filter(Boolean) as { achievement: Achievement; earnedAt: number }[];

    // Find the index of the clicked achievement (which is the highest/last one)
    const initialIndex = groupAchievements.findIndex(
      (a) => a.achievement.id === clickedAchievement.id
    );

    setSelectedAchievements({
      achievements: groupAchievements,
      initialIndex: initialIndex >= 0 ? initialIndex : groupAchievements.length - 1,
    });
  };

  if (displayIds.length === 0) {
    return (
      <div
        className="p-4 rounded-xl flex flex-col items-center justify-center h-full"
        style={{ backgroundColor: `${colors.bg.base}80` }}
      >
        <TrophyIcon className="mb-2 size-8 text-muted-foreground" aria-hidden="true" />
        <div
          className="text-sm text-center"
          style={{ color: tv.text.secondary }}
        >
          No achievements yet
        </div>
        <div
          className="text-xs text-center mt-1 opacity-70"
          style={{ color: tv.text.secondary }}
        >
          Complete tests to earn achievements!
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="p-3 rounded-xl h-full overflow-hidden flex flex-col"
        style={{ backgroundColor: `${colors.bg.base}80` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2 px-1">
          <div
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: tv.text.secondary }}
          >
            Achievements
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || !user}
              className="p-1 rounded transition-all hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: tv.text.secondary }}
              aria-label="Refresh achievements"
              title="Refresh achievements"
            >
              <ArrowsClockwiseIcon className={`size-3 ${isRefreshing ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
            </button>
            <button
              onClick={() => setShowAchievementsModal(true)}
              className="text-xs font-medium hover:underline transition-all cursor-pointer"
              style={{ color: tv.interactive.secondary.DEFAULT }}
            >
              {earnedIds.length} / {ALL_ACHIEVEMENTS.length}
            </button>
          </div>
        </div>

        {/* Scrollable Content - Flat Grid */}
        {/* Each achievement item is ~68px tall (p-2 + icon + title), gap-2 = 8px */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={maxVisibleRows ? { maxHeight: `calc(${maxVisibleRows}.5 * 68px + ${maxVisibleRows - 1} * 8px)` } : undefined}
        >
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 p-1">
            {achievements.map(({ achievement }) => {
              const tierColors = TIER_COLORS[achievement.tier];

              return (
                <button
                  key={achievement.id}
                  onClick={() => handleAchievementClick(achievement)}
                  className="flex flex-col items-center p-2 rounded-lg transition-all hover:scale-105 hover:shadow-lg"
                  style={{
                    backgroundColor: `${tierColors.bg}20`,
                    borderWidth: 1,
                    borderColor: `${tierColors.border}50`,
                  }}
                  title={achievement.title}
                >
                  {/* Tier Badge (top) */}
                  <div
                    className="px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider mb-1"
                    style={{
                      backgroundColor: tierColors.bg,
                      color: tierColors.text,
                    }}
                  >
                    {achievement.tier}
                  </div>
                  {/* Icon (middle) */}
                  <AchievementIcon icon={achievement.icon} className="mb-1 size-5" />
                  {/* Title (bottom) */}
                  <div
                    className="text-[10px] font-medium text-center leading-tight line-clamp-2"
                    style={{ color: tv.text.primary }}
                  >
                    {achievement.title}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Achievement Detail Modal */}
      {selectedAchievements && (
        <AchievementDetailModal
          achievements={selectedAchievements.achievements}
          initialIndex={selectedAchievements.initialIndex}
          onClose={() => setSelectedAchievements(null)}
        />
      )}

      {/* Full Achievements Board Modal */}
      {showAchievementsModal && (
        <AchievementsModal
          earnedAchievements={earnedAchievements}
          onClose={() => setShowAchievementsModal(false)}
        />
      )}
    </>
  );
}
