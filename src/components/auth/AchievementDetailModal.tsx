import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CaretLeftIcon, CaretRightIcon, CheckCircleIcon, CircleIcon } from "@phosphor-icons/react";
import { AchievementMedallion, AchievementTierBadge } from "@/components/auth/AchievementMedallion";
import { achievementStyle, useAchievementPalette, type AchievementPresentation } from "@/components/auth/achievement-presentation";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { ACHIEVEMENT_CATEGORIES, type Achievement } from "@/lib/achievement-definitions";

interface AchievementDetailModalProps {
  achievements: { achievement: Achievement; earnedAt: number | null }[];
  initialIndex: number;
  onClose: () => void;
}

function AchievementSlide({ achievement, earnedAt, presentation, active, reduceMotion }: {
  achievement: Achievement;
  earnedAt: number | null;
  presentation: AchievementPresentation;
  active: boolean;
  reduceMotion: boolean;
}) {
  const category = ACHIEVEMENT_CATEGORIES[achievement.category];
  const medallion = <AchievementMedallion icon={achievement.icon} earned={earnedAt !== null} size="large" />;
  return (
    <div
      data-achievement-tier={achievement.tier}
      data-achievement-state={earnedAt === null ? "unearned" : "earned"}
      style={achievementStyle(presentation)}
      className="flex min-w-0 flex-col items-center gap-5 px-1 pt-3 text-center"
    >
      {active ? (
        <motion.span initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.22 }}>
          {medallion}
        </motion.span>
      ) : medallion}
      <div>
        <AchievementTierBadge tier={achievement.tier} />
        <h3 className="mt-3 text-2xl font-semibold [overflow-wrap:anywhere]">{achievement.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{category.name}</p>
      </div>
      <div className="w-full rounded-xl border border-[var(--achievement-border)] bg-[var(--achievement-surface)] p-4 text-[var(--achievement-foreground)]">
        <p className="mb-2 text-xs font-semibold text-[var(--achievement-muted)]">How to earn it</p>
        <p className="text-sm leading-relaxed [overflow-wrap:anywhere]">{achievement.description}</p>
      </div>
      <p className="flex items-start justify-center gap-2 text-sm text-muted-foreground">
        {earnedAt === null ? <CircleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <CheckCircleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
        {earnedAt === null ? "Not yet earned" : `Earned on ${new Date(earnedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`}
      </p>
    </div>
  );
}

export default function AchievementDetailModal({ achievements, initialIndex, onClose }: AchievementDetailModalProps) {
  const palette = useAchievementPalette();
  const [returnFocus] = useState(() => document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const startIndex = Math.max(0, Math.min(initialIndex, achievements.length - 1));
  const [api, setApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const reduceMotion = useReducedMotion();
  const jump = reduceMotion !== false;
  const current = achievements[currentIndex];

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrentIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-border bg-background p-4 text-foreground shadow-none sm:p-6"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
        }}
        onKeyDown={(event) => {
          if (event.target instanceof HTMLSelectElement) return;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            api?.scrollPrev(jump);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            api?.scrollNext(jump);
          }
        }}
      >
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Achievement details</DialogTitle>
          <DialogDescription>{current ? `${currentIndex + 1} of ${achievements.length} in ${ACHIEVEMENT_CATEGORIES[current.achievement.category].name}` : "No achievement selected"}</DialogDescription>
        </DialogHeader>
        <Carousel
          setApi={setApi}
          opts={{ align: "center", loop: false, startIndex }}
          className="min-w-0"
          aria-label="Achievement details"
          onKeyDownCapture={undefined}
        >
          <CarouselContent>
            {achievements.map(({ achievement, earnedAt }, index) => (
              <CarouselItem key={achievement.id} aria-hidden={index !== currentIndex}>
                <AchievementSlide
                  achievement={achievement}
                  earnedAt={earnedAt}
                  presentation={(earnedAt === null ? palette.unearned : palette.earned)[achievement.tier]}
                  active={index === currentIndex}
                  reduceMotion={jump}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        {achievements.length > 1 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline" type="button" aria-label="Previous achievement" disabled={currentIndex === 0} onClick={() => api?.scrollPrev(jump)} className="flex min-h-10 items-center gap-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ring">
                <CaretLeftIcon aria-hidden="true" className="size-4" />Prev
              </Button>
              <p role="status" className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{currentIndex + 1} / {achievements.length}</p>
              <Button
                variant="outline" type="button" aria-label="Next achievement" disabled={currentIndex === achievements.length - 1} onClick={() => api?.scrollNext(jump)} className="flex min-h-10 items-center gap-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ring">
                <CaretRightIcon aria-hidden="true" className="size-4" />Next
              </Button>
            </div>
            <NativeSelect aria-label="Choose achievement" value={currentIndex} onChange={(event) => api?.scrollTo(Number(event.target.value), jump)} className="min-w-0 w-full rounded-md border border-input bg-background pl-2 pr-9 py-2 text-sm">
              {achievements.map(({ achievement }, index) => <NativeSelectOption key={achievement.id} value={index}>{achievement.title}</NativeSelectOption>)}
            </NativeSelect>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
