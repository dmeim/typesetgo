import { useState } from "react";
import type { Theme } from "@/lib/typing-constants";
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
  theme: Theme;
}

export default function AchievementsGrid({
  earnedAchievements,
  theme,
}: AchievementsGridProps) {
  // State now holds an array of achievements in the progressive group and the initial index
  const [selectedAchievements, setSelectedAchievements] = useState<{
    achievements: { achievement: Achievement; earnedAt: number }[];
    initialIndex: number;
  } | null>(null);
  
  // State for the full achievements board modal
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);

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
          <button
            onClick={() => setShowAchievementsModal(true)}
            className="text-xs font-medium hover:underline transition-all cursor-pointer"
            style={{ color: theme.buttonSelected }}
          >
            {earnedIds.length} / {ALL_ACHIEVEMENTS.length}
          </button>
        </div>

        {/* Scrollable Content - Flat Grid */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
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
                  {/* Icon */}
                  <div className="text-xl mb-1">{achievement.icon}</div>
                  {/* Title (truncated) */}
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
          theme={theme}
          onClose={() => setSelectedAchievements(null)}
        />
      )}

      {/* Full Achievements Board Modal */}
      {showAchievementsModal && (
        <AchievementsModal
          earnedAchievements={earnedAchievements}
          theme={theme}
          onClose={() => setShowAchievementsModal(false)}
        />
      )}
    </>
  );
}
