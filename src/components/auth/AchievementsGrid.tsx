import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useTheme } from "@/hooks/useTheme";
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
  const { legacyTheme } = useTheme();
  
  // Fallback theme (complete)
  const theme = legacyTheme ?? {
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
        style={{ backgroundColor: `${theme.backgroundColor}80` }}
      >
        <div className="text-3xl mb-2 opacity-50">🏆</div>
        <div
          className="text-sm text-center"
          style={{ color: theme.defaultText }}
        >
          No achievements yet
        </div>
        <div
          className="text-xs text-center mt-1 opacity-70"
          style={{ color: theme.defaultText }}
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
        style={{ backgroundColor: `${theme.backgroundColor}80` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2 px-1">
          <div
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: theme.defaultText }}
          >
            Achievements
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || !user}
              className="p-1 rounded transition-all hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: theme.defaultText }}
              title="Refresh achievements"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
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
            <button
              onClick={() => setShowAchievementsModal(true)}
              className="text-xs font-medium hover:underline transition-all cursor-pointer"
              style={{ color: theme.buttonSelected }}
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
                  <div className="text-xl mb-1">{achievement.icon}</div>
                  {/* Title (bottom) */}
                  <div
                    className="text-[10px] font-medium text-center leading-tight line-clamp-2"
                    style={{ color: theme.correctText }}
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
