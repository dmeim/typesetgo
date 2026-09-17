import { ArrowFatRightIcon, ArrowLeftIcon } from "@phosphor-icons/react";
import { GLOBAL_COLORS } from "@/lib/colors";

interface PlanNavigationProps {
  onNext?: () => void;
  onPrev?: () => void;
  isNextDisabled?: boolean;
  isPrevDisabled?: boolean;
  showPrev?: boolean;
  showNext?: boolean;
  nextLabel?: string;
}

export default function PlanNavigation({
  onNext,
  onPrev,
  isNextDisabled = false,
  isPrevDisabled = false,
  showPrev = true,
  showNext = true,
  nextLabel,
}: PlanNavigationProps) {
  return (
    <div className="flex items-center justify-center gap-4 mb-6 w-full">
      {/* Previous Button */}
      <button
        onClick={onPrev}
        disabled={!showPrev || isPrevDisabled}
        className={`group relative inline-flex items-center justify-center gap-2 px-6 py-2 font-medium text-white transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
          !showPrev
            ? "opacity-0 pointer-events-none"
            : isPrevDisabled
              ? "bg-gray-800 text-gray-600 cursor-not-allowed"
              : "bg-gray-700 hover:bg-gray-600"
        }`}
        title="Previous Step"
      >
        <ArrowLeftIcon className="size-5 shrink-0 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
        Prev
      </button>

      {/* Next Button */}
      <button
        onClick={onNext}
        disabled={!showNext || isNextDisabled}
        className={`group relative inline-flex items-center justify-center gap-2 px-6 py-2 font-medium text-white transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
          !showNext
            ? "opacity-0 pointer-events-none"
            : isNextDisabled
              ? "bg-gray-800 text-gray-600 cursor-not-allowed"
              : "bg-gray-700 hover:bg-gray-600"
        }`}
        title="Next Step"
      >
        <ArrowFatRightIcon className="size-5 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        {nextLabel || "Next"}
        <div
          className="absolute bottom-0 left-0 h-1 w-full scale-x-0 transition-transform duration-200 group-hover:scale-x-100 rounded-b-lg"
          style={{ backgroundColor: GLOBAL_COLORS.brand.primary }}
        ></div>
      </button>
    </div>
  );
}
