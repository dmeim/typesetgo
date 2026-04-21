import { useCallback, useEffect, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { tv } from "@/lib/theme-vars";
import {
  ACHIEVEMENT_CATEGORIES,
  TIER_COLORS,
  type Achievement,
} from "@/lib/achievement-definitions";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AchievementDetailModalProps {
  achievements: { achievement: Achievement; earnedAt: number | null }[];
  initialIndex: number;
  onClose: () => void;
}

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${month}/${day}/${year} at ${hour12}:${minutes} ${ampm}`;
}

// Individual achievement slide component
function AchievementSlide({
  achievement,
  earnedAt,
  colors,
}: {
  achievement: Achievement;
  earnedAt: number | null;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const category = ACHIEVEMENT_CATEGORIES[achievement.category];
  const tierColors = TIER_COLORS[achievement.tier];
  const isLocked = earnedAt === null;

  return (
    <div className={`flex flex-col items-center justify-center px-4 ${isLocked ? "opacity-60" : ""}`}>
      {/* Top Section: Icon/Tier + Title/Category */}
      <div className="flex items-center justify-center gap-5 mb-5">
        {/* Left: Achievement Icon & Tier Badge */}
        <div className={`flex flex-col items-center shrink-0 ${isLocked ? "grayscale" : ""}`}>
          {/* Large Icon with Tier Border */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-2"
            style={{
              backgroundColor: `${tierColors.bg}30`,
              borderWidth: 3,
              borderColor: tierColors.border,
              boxShadow: isLocked ? "none" : `0 0 20px ${tierColors.bg}40`,
            }}
          >
            {achievement.icon}
          </div>

          {/* Tier Badge */}
          <div
            className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider"
            style={{
              backgroundColor: tierColors.bg,
              color: tierColors.text,
            }}
          >
            {achievement.tier}
          </div>
        </div>

        {/* Right: Title & Category */}
        <div className="flex flex-col min-w-0">
          <h3
            className="text-2xl font-bold mb-1 truncate"
            style={{ color: tv.text.primary }}
          >
            {achievement.title}
          </h3>
          <div
            className="text-sm flex items-center gap-1.5"
            style={{ color: tv.text.secondary }}
          >
            <span>{category.icon}</span>
            <span>{category.name}</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Description & Earned Date */}
      <div
        className="text-base text-center px-5 py-4 rounded-lg mb-4 w-full"
        style={{
          backgroundColor: `${colors.bg.base}80`,
          color: tv.text.primary,
        }}
      >
        {achievement.description}
      </div>

      <div
        className="text-xs text-center"
        style={{ color: tv.text.secondary }}
      >
        {isLocked ? (
          <span className="opacity-70">Not yet earned</span>
        ) : (
          <>
            <span className="opacity-70">Earned on </span>
            <span className="font-medium" style={{ color: tv.interactive.secondary.DEFAULT }}>
              {formatDateTime(earnedAt)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default function AchievementDetailModal({
  achievements,
  initialIndex,
  onClose,
}: AchievementDetailModalProps) {
  const { colors } = useTheme();

  const [api, setApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const hasMultiple = achievements.length > 1;

  // Scroll to initial index when API is ready
  useEffect(() => {
    if (!api) return;
    api.scrollTo(initialIndex, true);
  }, [api, initialIndex]);

  // Track current slide
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrentIndex(api.selectedScrollSnap());
    };

    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const scrollPrev = useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = useCallback(() => {
    api?.scrollNext();
  }, [api]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [scrollPrev, scrollNext, onClose]);

  const canScrollPrev = currentIndex > 0;
  const canScrollNext = currentIndex < achievements.length - 1;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg p-8 shadow-xl mx-4 min-h-[360px] flex flex-col"
        style={{ backgroundColor: tv.bg.surface }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition hover:opacity-80"
            style={{ color: tv.text.muted }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
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

        {/* Carousel */}
        <div className="relative flex-1 flex items-center">
          <Carousel
            setApi={setApi}
            opts={{
              align: "center",
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent>
              {achievements.map(({ achievement, earnedAt }) => (
                <CarouselItem key={achievement.id}>
                  <AchievementSlide
                    achievement={achievement}
                    earnedAt={earnedAt}
                    colors={colors}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {/* Navigation arrows overlaid on edges */}
          {hasMultiple && (
            <>
              <button
                onClick={scrollPrev}
                disabled={!canScrollPrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full transition-all disabled:opacity-20"
                style={{
                  backgroundColor: `${colors.bg.surface}ee`,
                  color: canScrollPrev ? tv.interactive.secondary.DEFAULT : tv.text.muted,
                }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={scrollNext}
                disabled={!canScrollNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full transition-all disabled:opacity-20"
                style={{
                  backgroundColor: `${colors.bg.surface}ee`,
                  color: canScrollNext ? tv.interactive.secondary.DEFAULT : tv.text.muted,
                }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Dot indicators for multiple achievements */}
        {hasMultiple && (
          <div className="flex justify-center gap-1.5 mt-4">
            {achievements.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  backgroundColor:
                    index === currentIndex
                      ? tv.interactive.secondary.DEFAULT
                      : tv.text.muted,
                  transform: index === currentIndex ? "scale(1.2)" : "scale(1)",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
