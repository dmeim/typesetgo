import { useRef, type MouseEvent } from "react";
import { CaretDownIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import type { ThemeCatalogEntry, ThemeVariantSummary, ThemeMode } from "@/types/theme";

interface ThemeCardProps {
  themeData: ThemeCatalogEntry;
  variant: ThemeVariantSummary;
  label: string;
  isSelected: boolean;
  selectedMode?: ThemeMode;
  isMultiVariant: boolean;
  isExpanded?: boolean;
  variantCount?: number;
  matchingVariantCount?: number;
  onCardClick: () => void;
  onLightClick?: () => void;
  onDarkClick?: () => void;
  onMouseEnter?: (immediate?: boolean) => void;
  onMouseLeave?: () => void;
  onLightMouseEnter?: (immediate?: boolean) => void;
  onDarkMouseEnter?: (immediate?: boolean) => void;
}

export default function ThemeCard({
  themeData,
  variant,
  label,
  isSelected,
  selectedMode,
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
  const pointerTarget = useRef<HTMLButtonElement | null>(null);
  const pointerPreview = (
    event: MouseEvent<HTMLButtonElement>,
    preview?: (immediate?: boolean) => void,
  ) => {
    if (pointerTarget.current === event.currentTarget) return;
    // Layout/focus scrolling can enter a card under a stationary pointer. Only
    // actual movement establishes a mouse preview, including after keyboard use.
    if (event.movementX === 0 && event.movementY === 0) return;
    pointerTarget.current = event.currentTarget;
    preview?.();
  };
  const pointerLeave = (event: MouseEvent<HTMLButtonElement>) => {
    pointerTarget.current = null;
    if (document.activeElement !== event.currentTarget) onMouseLeave?.();
  };
  const focusPreview = (preview?: (immediate?: boolean) => void) => {
    pointerTarget.current = null;
    preview?.(true);
  };
  const name = isMultiVariant || label === themeData.name ? label : `${themeData.name}: ${label}`;
  return (
    <div
      className={`flex min-w-0 overflow-hidden rounded-md border bg-card text-card-foreground ${isSelected ? "border-ring" : "border-border"}`}
    >
      <button
        type="button"
        data-theme-card-control
        onClick={onCardClick}
        aria-label={isMultiVariant ? `${name} variants` : `Select ${name}`}
        aria-expanded={isMultiVariant ? !!isExpanded : undefined}
        aria-controls={isMultiVariant ? `theme-variants-${themeData.id}` : undefined}
        aria-pressed={isMultiVariant ? undefined : isSelected}
        onMouseMove={(event) => pointerPreview(event, onMouseEnter)}
        onMouseLeave={pointerLeave}
        onFocus={() => focusPreview(onMouseEnter)}
        onBlur={onMouseLeave}
        className="min-h-20 min-w-0 flex-1 p-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span
          className="mb-2 flex items-center gap-2 rounded p-2"
          style={{ backgroundColor: variant.swatches[0] }}
          aria-hidden="true"
        >
          {variant.swatches.slice(1).map(
            (color, index) => (
              <span key={index} className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            ),
          )}
        </span>
        <span className="flex items-center justify-between gap-2 text-sm">
          <span className="min-w-0 break-words">{label}</span>
          {isMultiVariant && (
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              {matchingVariantCount ?? variantCount}
              <CaretDownIcon size={14} className={isExpanded ? "rotate-180" : ""} aria-hidden="true" />
            </span>
          )}
        </span>
        {isSelected && <span className="sr-only">Current theme</span>}
      </button>
      {!isMultiVariant && (
        <div className="flex w-11 shrink-0 flex-col border-l border-border">
          <button
            type="button"
            data-theme-card-control
            onClick={onLightClick}
            disabled={!variant.light}
            onMouseMove={(event) => pointerPreview(event, onLightMouseEnter)}
            onMouseLeave={pointerLeave}
            onFocus={() => focusPreview(onLightMouseEnter)}
            onBlur={onMouseLeave}
            aria-label={`Select ${name}, light mode`}
            aria-pressed={selectedMode ? isSelected && selectedMode === "light" : undefined}
            title={variant.light ? "Light mode" : "Light mode unavailable"}
            className="flex min-h-10 flex-1 items-center justify-center hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-40"
          >
            <SunIcon size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            data-theme-card-control
            onClick={onDarkClick}
            onMouseMove={(event) => pointerPreview(event, onDarkMouseEnter)}
            onMouseLeave={pointerLeave}
            onFocus={() => focusPreview(onDarkMouseEnter)}
            onBlur={onMouseLeave}
            aria-label={`Select ${name}, dark mode`}
            aria-pressed={selectedMode ? isSelected && selectedMode === "dark" : undefined}
            className="flex min-h-10 flex-1 items-center justify-center hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <MoonIcon size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
