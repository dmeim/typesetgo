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
        className={`group relative inline-flex items-center justify-center px-6 py-2 font-medium text-white transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
          !showPrev
            ? "opacity-0 pointer-events-none"
            : isPrevDisabled
              ? "bg-gray-800 text-gray-600 cursor-not-allowed"
              : "bg-gray-700 hover:bg-gray-600"
        }`}
        title="Previous Step"
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
          className="mr-2 transition-transform group-hover:-translate-x-1"
        >
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        Prev
      </button>

      {/* Next Button */}
      <button
        onClick={onNext}
        disabled={!showNext || isNextDisabled}
        className={`group relative inline-flex items-center justify-center px-6 py-2 font-medium text-white transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
          !showNext
            ? "opacity-0 pointer-events-none"
            : isNextDisabled
              ? "bg-gray-800 text-gray-600 cursor-not-allowed"
              : "bg-gray-700 hover:bg-gray-600"
        }`}
        title="Next Step"
      >
        {nextLabel || "Next"}
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
          className="ml-2 transition-transform group-hover:translate-x-1"
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
        <div
          className="absolute bottom-0 left-0 h-1 w-full scale-x-0 transition-transform duration-200 group-hover:scale-x-100 rounded-b-lg"
          style={{ backgroundColor: GLOBAL_COLORS.brand.primary }}
        ></div>
      </button>
    </div>
  );
}
