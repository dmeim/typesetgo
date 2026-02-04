import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import type { LegacyTheme } from "@/types/theme";
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
  initialCategory?: AchievementCategory | null;
  initialAchievementId?: string | null;
}

// Achievement card component
function AchievementCard({
  achievement,
  isEarned,
  theme,
  onClick,
  isHighlighted,
  cardRef,
}: {
  achievement: Achievement;
  isEarned: boolean;
  theme: LegacyTheme;
  onClick: () => void;
  isHighlighted?: boolean;
  cardRef?: (el: HTMLButtonElement | null) => void;
}) {
  const tierColors = TIER_COLORS[achievement.tier];

  if (isEarned) {
    return (
      <button
        ref={cardRef}
        onClick={onClick}
        className={`flex flex-col items-center p-3 rounded-lg transition-all hover:scale-105 cursor-pointer ${
          isHighlighted ? "ring-2 ring-offset-2 animate-pulse" : ""
        }`}
        style={{
          backgroundColor: `${tierColors.bg}20`,
          borderWidth: 2,
          borderColor: `${tierColors.border}60`,
          boxShadow: isHighlighted
            ? `0 0 20px ${tierColors.bg}60`
            : `0 0 12px ${tierColors.bg}25`,
          // Use CSS custom property for ring color via inline style
          ["--tw-ring-color" as string]: tierColors.bg,
        }}
        title={achievement.description}
      >
        {/* Tier Badge (top) */}
        <div
          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1.5"
          style={{
            backgroundColor: tierColors.bg,
            color: tierColors.text,
          }}
        >
          {achievement.tier}
        </div>
        
        {/* Icon (middle) */}
        <div className="text-2xl mb-1.5">{achievement.icon}</div>
        
        {/* Title (bottom) */}
        <div
          className="text-xs font-medium text-center leading-tight line-clamp-2"
          style={{ color: theme.correctText }}
        >
          {achievement.title}
        </div>
      </button>
    );
  }

  // Locked card
  return (
    <button
      ref={cardRef}
      onClick={onClick}
      className={`flex flex-col items-center p-3 rounded-lg opacity-40 grayscale cursor-pointer hover:opacity-60 transition-opacity ${
        isHighlighted ? "ring-2 ring-offset-2 animate-pulse" : ""
      }`}
      style={{
        backgroundColor: `${theme.defaultText}10`,
        borderWidth: 2,
        borderColor: `${theme.defaultText}20`,
      }}
      title={`Locked: ${achievement.description}`}
    >
      {/* Tier Badge (top) */}
      <div
        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1.5"
        style={{
          backgroundColor: `${theme.defaultText}40`,
          color: theme.backgroundColor,
        }}
      >
        {achievement.tier}
      </div>
      
      {/* Icon (middle) */}
      <div className="text-2xl mb-1.5">{achievement.icon}</div>
      
      {/* Title (bottom) */}
      <div
        className="text-xs font-medium text-center leading-tight line-clamp-2"
        style={{ color: theme.defaultText }}
      >
        {achievement.title}
      </div>
    </button>
  );
}

// Category section component
function CategorySection({
  category,
  earnedIds,
  theme,
  onAchievementClick,
  sectionRef,
  highlightedAchievementId,
  achievementRefs,
}: {
  category: AchievementCategory;
  earnedIds: Set<string>;
  theme: LegacyTheme;
  onAchievementClick: (achievement: Achievement, index: number, allInCategory: Achievement[]) => void;
  sectionRef?: (el: HTMLDivElement | null) => void;
  highlightedAchievementId?: string | null;
  achievementRefs?: React.MutableRefObject<Map<string, HTMLButtonElement>>;
}) {
  const categoryInfo = ACHIEVEMENT_CATEGORIES[category];
  const achievements = getAchievementsByCategory(category);
  const earnedCount = achievements.filter((a) => earnedIds.has(a.id)).length;

  return (
    <div ref={sectionRef} className="mb-6 last:mb-0">
      {/* Category Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{categoryInfo.icon}</span>
        <h3
          className="text-sm font-semibold"
          style={{ color: theme.correctText }}
        >
          {categoryInfo.name}
        </h3>
        <span
          className="text-xs font-medium ml-auto"
          style={{ color: theme.buttonSelected }}
        >
          {earnedCount} / {achievements.length}
        </span>
      </div>

      {/* Achievement Grid - max 7 columns */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2">
        {achievements.map((achievement, index) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            isEarned={earnedIds.has(achievement.id)}
            theme={theme}
            onClick={() => onAchievementClick(achievement, index, achievements)}
            isHighlighted={highlightedAchievementId === achievement.id}
            cardRef={(el) => {
              if (el && achievementRefs) {
                achievementRefs.current.set(achievement.id, el);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function AchievementsModal({
  earnedAchievements,
  onClose,
  initialCategory,
  initialAchievementId,
}: AchievementsModalProps) {
  const { legacyTheme } = useTheme();
  
  // Fallback theme
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

  const earnedIds = new Set(Object.keys(earnedAchievements));
  const totalEarned = earnedIds.size;
  const totalAchievements = ALL_ACHIEVEMENTS.length;

  // State for the detail modal carousel
  const [selectedCarousel, setSelectedCarousel] = useState<{
    achievements: { achievement: Achievement; earnedAt: number | null }[];
    initialIndex: number;
  } | null>(null);

  // State for highlighted achievement (from notification click)
  const [highlightedAchievementId, setHighlightedAchievementId] = useState<string | null>(
    initialAchievementId || null
  );

  // Category order
  const categories: AchievementCategory[] = [
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
    "collection",
  ];

  // Refs for category sections to enable scrolling to specific category
  const categoryRefs = useRef<Map<AchievementCategory, HTMLDivElement>>(new Map());
  const achievementRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to initial category or achievement when modal opens
  useEffect(() => {
    // Priority: specific achievement > category
    if (initialAchievementId && scrollContainerRef.current) {
      // Small delay to ensure refs are populated
      setTimeout(() => {
        const achievementElement = achievementRefs.current.get(initialAchievementId);
        if (achievementElement && scrollContainerRef.current) {
          achievementElement.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          // Fallback: find the achievement's category and scroll to it
          const achievement = getAchievementById(initialAchievementId);
          if (achievement) {
            const categoryElement = categoryRefs.current.get(achievement.category);
            if (categoryElement && scrollContainerRef.current) {
              categoryElement.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }
        }
      }, 150);

      // Clear highlight after 3 seconds
      const highlightTimer = setTimeout(() => {
        setHighlightedAchievementId(null);
      }, 3000);

      return () => clearTimeout(highlightTimer);
    } else if (initialCategory && scrollContainerRef.current) {
      // Small delay to ensure refs are populated
      setTimeout(() => {
        const categoryElement = categoryRefs.current.get(initialCategory);
        if (categoryElement && scrollContainerRef.current) {
          categoryElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [initialCategory, initialAchievementId]);

  // Handle achievement card click - open carousel with all achievements in that category
  const handleAchievementClick = (
    _clickedAchievement: Achievement,
    index: number,
    allInCategory: Achievement[]
  ) => {
    // Map all achievements in the category to the format expected by AchievementDetailModal
    const carouselAchievements = allInCategory.map((a) => ({
      achievement: a,
      earnedAt: earnedAchievements[a.id] ?? null,
    }));

    setSelectedCarousel({
      achievements: carouselAchievements,
      initialIndex: index,
    });
  };

  // Keyboard navigation - only handle Escape if detail modal is not open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !selectedCarousel) {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, selectedCarousel]);

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
        onClick={onClose}
      >
        <div
          className="w-full max-w-5xl rounded-lg shadow-xl mx-4 max-h-[90vh] flex flex-col"
          style={{ backgroundColor: theme.surfaceColor }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-6 border-b"
            style={{ borderColor: `${theme.defaultText}20` }}
          >
            <div>
              <h2
                className="text-xl font-semibold"
                style={{ color: theme.correctText }}
              >
                All Achievements
              </h2>
              <p className="text-sm mt-1" style={{ color: theme.defaultText }}>
                Progress:{" "}
                <span
                  className="font-medium"
                  style={{ color: theme.buttonSelected }}
                >
                  {totalEarned} / {totalAchievements}
                </span>
                <span className="ml-2 opacity-70">
                  ({Math.round((totalEarned / totalAchievements) * 100)}% complete)
                </span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition hover:bg-gray-700/50"
              style={{ color: theme.defaultText }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable Content */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-6"
            style={{ backgroundColor: `${theme.backgroundColor}40` }}
          >
            {categories.map((category) => (
              <CategorySection
                key={category}
                category={category}
                earnedIds={earnedIds}
                theme={theme}
                onAchievementClick={handleAchievementClick}
                sectionRef={(el) => {
                  if (el) {
                    categoryRefs.current.set(category, el);
                  }
                }}
                highlightedAchievementId={highlightedAchievementId}
                achievementRefs={achievementRefs}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Achievement Detail Carousel Modal */}
      {selectedCarousel && (
        <AchievementDetailModal
          achievements={selectedCarousel.achievements}
          initialIndex={selectedCarousel.initialIndex}
          onClose={() => setSelectedCarousel(null)}
        />
      )}
    </>
  );
}
