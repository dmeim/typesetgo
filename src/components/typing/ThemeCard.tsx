import { Sun, Moon } from "lucide-react";
import type { ThemeDefinition, ThemeVariantDefinition } from "@/types/theme";

interface ThemeCardProps {
  themeData: ThemeDefinition;
  variant: ThemeVariantDefinition;
  label: string;
  isSelected: boolean;
  isMultiVariant: boolean;
  isExpanded?: boolean;
  variantCount?: number;
  matchingVariantCount?: number;
  onCardClick: () => void;
  onLightClick?: () => void;
  onDarkClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onLightMouseEnter?: () => void;
  onDarkMouseEnter?: () => void;
}

export default function ThemeCard({
  variant,
  label,
  isSelected,
  isMultiVariant,
  isExpanded,
  variantCount,
  matchingVariantCount,
  onCardClick,
  onLightClick,
  onDarkClick,
  onMouseEnter,
  onMouseLeave,
  onLightMouseEnter,
  onDarkMouseEnter,
}: ThemeCardProps) {
  const showCountBadge = isMultiVariant && !isExpanded;
  const showExpandedIndicator = isMultiVariant && isExpanded;

  return (
    <div
      className={`flex rounded-lg border transition overflow-hidden min-h-[64px] ${
        isSelected
          ? "border-gray-400 ring-1 ring-gray-400"
          : "border-gray-700 hover:border-gray-500"
      }`}
      style={{ backgroundColor: variant.dark.bg.base }}
    >
      <button
        onClick={onCardClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="flex-1 min-w-0 p-2 text-left"
      >
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: variant.dark.typing.cursor }} />
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: variant.dark.interactive.secondary.DEFAULT }} />
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: variant.dark.typing.correct }} />
        </div>
        <div className="text-xs whitespace-normal break-words leading-tight" style={{ color: variant.dark.typing.correct }}>
          {label}
        </div>
      </button>

      {(showCountBadge || showExpandedIndicator) ? (
        <div
          className="w-10 shrink-0 flex items-center justify-center border-l cursor-pointer hover:bg-white/5 transition-colors"
          style={{ borderColor: `${variant.dark.typing.correct}30` }}
          onClick={onCardClick}
        >
          <span
            className="text-sm font-semibold"
            style={{
              color: variant.dark.interactive.primary.DEFAULT,
            }}
          >
            {matchingVariantCount != null && matchingVariantCount < (variantCount ?? 0)
              ? matchingVariantCount
              : variantCount}
          </span>
        </div>
      ) : (
        <div className="w-10 shrink-0 flex flex-col border-l" style={{ borderColor: `${variant.dark.typing.correct}30` }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (variant.light && onLightClick) onLightClick();
            }}
            onMouseEnter={onLightMouseEnter}
            onMouseLeave={onMouseLeave}
            disabled={!variant.light}
            className={`flex-1 flex items-center justify-center transition-colors ${
              !variant.light
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-white/10 cursor-pointer"
            }`}
            title={variant.light ? "Light mode" : "Light mode not available"}
          >
            <Sun className="w-3 h-3" style={{ color: variant.dark.typing.correct }} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onDarkClick) onDarkClick();
            }}
            onMouseEnter={onDarkMouseEnter}
            onMouseLeave={onMouseLeave}
            className="flex-1 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors"
            title="Dark mode"
          >
            <Moon className="w-3 h-3" style={{ color: variant.dark.typing.correct }} />
          </button>
        </div>
      )}
    </div>
  );
}
