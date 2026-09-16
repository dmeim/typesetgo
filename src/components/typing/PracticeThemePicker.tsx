import { MODE_SELECTOR_OPTIONS } from "./practice-config";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Shuffle } from "lucide-react";
import { fetchAllThemes, groupThemesByCategory, CATEGORY_CONFIG, type ThemeDefinition, type GroupedThemes, type ThemeCategory } from "@/lib/themes";
import type { ThemeColors, ThemeMode } from "@/types/theme";
import { useTheme } from "@/hooks/useTheme";
import { useGridColumns } from "@/hooks/useGridColumns";
import { tv } from "@/lib/theme-vars";
import ThemeCard from "./ThemeCard";
import VariantDrawer from "./VariantDrawer";

const normalizeThemeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const themeSearchMatches = (value: string, normalizedQuery: string) => {
  if (!normalizedQuery) return true;

  const normalizedValue = normalizeThemeSearchText(value);
  return (
    normalizedValue.includes(normalizedQuery) ||
    normalizedValue.replace(/\s/g, "").includes(normalizedQuery.replace(/\s/g, ""))
  );
};

interface PracticeThemePickerProps {
  showThemeModal: boolean;
  setShowThemeModal: (show: boolean) => void;
}

export default function PracticeThemePicker({ showThemeModal, setShowThemeModal }: PracticeThemePickerProps) {
  // Theme context (replaces props and internal state)
  const {
    colors,
    themeName: selectedThemeName,
    themeId: selectedThemeId,
    variantId: selectedVariantId,
    mode: selectedMode,
    setTheme: setThemeById,
    setThemeSelection,
  } = useTheme();
  const [isCustomThemeOpen, setIsCustomThemeOpen] = useState(false);
  const [, setAvailableThemes] = useState<ThemeDefinition[]>([]);
  const [groupedThemes, setGroupedThemes] = useState<GroupedThemes[]>([]);
  const [expandedThemeId, setExpandedThemeId] = useState<string | null>(null);
  const themeGridColumns = useGridColumns();
  const [previewThemeDef, setPreviewThemeDef] = useState<(ThemeDefinition & { previewMode?: ThemeMode; previewVariantId?: string }) | null>(null);

  // Helper to set preview theme with optional mode and variant
  const setPreviewTheme = useCallback((theme: ThemeDefinition | null, mode?: ThemeMode, variantId?: string) => {
    if (!theme) {
      setPreviewThemeDef(null);
    } else {
      setPreviewThemeDef({ ...theme, previewMode: mode, previewVariantId: variantId });
    }
  }, []);

  // Resolve preview colors for the theme preview panel
  const resolvedPreviewColors: ThemeColors = previewThemeDef
    ? (() => {
        const variant = previewThemeDef.variants.find(
          v => v.id === (previewThemeDef.previewVariantId || previewThemeDef.defaultVariantId)
        ) || previewThemeDef.variants[0];
        return previewThemeDef.previewMode === "light" && variant.light
          ? variant.light
          : variant.dark;
      })()
    : colors;

  /*
   * TEMP_DISABLED_CATEGORIES_TAB
   * Keep categories mode wiring for easy restore; force all-themes mode for now.
   *
  const [themeViewMode, setThemeViewMode] = useState<"all" | "categories">("all");
   */
  const themeViewMode = "all" as const;
  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory | null>(null);
  const [themeSearchQuery, setThemeSearchQuery] = useState("");
  // Collapse state for "All Themes" view — all collapsed except "Featured" by default
  const getDefaultCollapsedCategories = useCallback(() => {
    const allCategoryKeys = Object.keys(CATEGORY_CONFIG) as ThemeCategory[];
    return new Set(allCategoryKeys.filter((c) => c !== "default"));
  }, []);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<ThemeCategory>>(getDefaultCollapsedCategories);
  const normalizedThemeSearchQuery = normalizeThemeSearchText(themeSearchQuery);
  const filteredGroupedThemes = useMemo(() => {
    if (!normalizedThemeSearchQuery) return groupedThemes;

    return groupedThemes
      .map((group) => ({
        ...group,
        themes: (() => {
          const displayNameMatch = themeSearchMatches(group.displayName, normalizedThemeSearchQuery);
          const categoryKeyMatch = themeSearchMatches(group.category, normalizedThemeSearchQuery);

          if (displayNameMatch || categoryKeyMatch) {
            return group.themes;
          }

          return group.themes.filter((themeData) => {
            const nameMatch = themeSearchMatches(themeData.name, normalizedThemeSearchQuery);
            const idMatch = themeSearchMatches(themeData.id, normalizedThemeSearchQuery);
            const variantMatch = themeData.variants.some(v =>
              themeSearchMatches(v.id, normalizedThemeSearchQuery) ||
              themeSearchMatches(v.label, normalizedThemeSearchQuery)
            );
            return nameMatch || idMatch || variantMatch;
          });
        })(),
      }))
      .filter((group) => group.themes.length > 0);
  }, [groupedThemes, normalizedThemeSearchQuery]);
  /*
   * TEMP_DISABLED_CATEGORIES_TAB
   * Keeping category-only filtering logic in place for easy restore later.
   *
  const filteredCategoryGroups = useMemo(() => {
    if (!normalizedThemeSearchQuery) return groupedThemes;

    return groupedThemes.filter((group) => {
      const displayNameMatch = group.displayName.toLowerCase().includes(normalizedThemeSearchQuery);
      const categoryKeyMatch = group.category.toLowerCase().includes(normalizedThemeSearchQuery);
      return displayNameMatch || categoryKeyMatch;
    });
  }, [groupedThemes, normalizedThemeSearchQuery]);
  const filteredSelectedCategoryThemes = useMemo(() => {
    if (!selectedCategory) return [];

    const categoryThemes = groupedThemes.find((group) => group.category === selectedCategory)?.themes ?? [];
    if (!normalizedThemeSearchQuery) return categoryThemes;

    return categoryThemes.filter((themeData) => {
      const nameMatch = themeData.name.toLowerCase().includes(normalizedThemeSearchQuery);
      const idMatch = themeData.id.toLowerCase().includes(normalizedThemeSearchQuery);
      return nameMatch || idMatch;
    });
  }, [groupedThemes, selectedCategory, normalizedThemeSearchQuery]);
  */
  // --- Load available themes ---
  useEffect(() => {
    fetchAllThemes().then((themes) => {
      setAvailableThemes(themes);
      setGroupedThemes(groupThemesByCategory(themes));
    });
  }, []);

  const handleThemeSelect = async (themeId: string, variantId?: string, mode?: ThemeMode) => {
    await setThemeSelection({ themeId, variantId, mode });
  };


  return (
    <>
      {/* Theme Modal */}
      {showThemeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowThemeModal(false);
            setIsCustomThemeOpen(false);
            setPreviewTheme(null);
            setSelectedCategory(null);
            setThemeSearchQuery("");
            setCollapsedCategories(getDefaultCollapsedCategories());
          }}
        >
          <div
            className="w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-2rem)] lg:w-[calc(100vw-3rem)] max-h-[85vh] rounded-lg shadow-xl flex overflow-hidden"
            style={{ backgroundColor: tv.bg.surface }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Preview Panel (40%) - Realistic Homepage Preview */}
            <div
              className="w-2/5 overflow-hidden relative"
              style={{ backgroundColor: resolvedPreviewColors.bg.base }}
            >
              {/* Mini Header - Absolute positioned at top */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-10">
                {/* Theme name + variant label */}
                <div className="min-w-0">
                  <div
                    className="text-lg font-semibold truncate"
                    style={{ color: resolvedPreviewColors.interactive.secondary.DEFAULT }}
                  >
                    {previewThemeDef?.name ?? selectedThemeName}
                  </div>
                  {previewThemeDef && previewThemeDef.variants.length > 1 && previewThemeDef.previewVariantId && (
                    <div
                      className="text-xs truncate"
                      style={{ color: resolvedPreviewColors.text.secondary }}
                    >
                      {previewThemeDef.variants.find(v => v.id === previewThemeDef.previewVariantId)?.label}
                    </div>
                  )}
                </div>
                {/* Header icons */}
                <div className="flex items-center gap-3">
                  {/* Trophy icon */}
                  <div
                    className="w-8 h-8 flex items-center justify-center rounded"
                    style={{ color: resolvedPreviewColors.interactive.primary.DEFAULT }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                      <path d="M4 22h16" />
                      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                    </svg>
                  </div>
                  {/* User avatar placeholder */}
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: resolvedPreviewColors.bg.surface, border: `2px solid ${resolvedPreviewColors.typing.default}40` }}
                  />
                </div>
              </div>

              {/* Settings Controls Area - Absolute positioned below header */}
              <div className="absolute top-16 left-0 right-0 flex flex-col items-center gap-2 px-6 py-2 z-10">
                {/* Row 1: Mode Selector */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium" style={{ color: resolvedPreviewColors.typing.default }}>Mode</span>
                  <div
                    className="flex rounded-lg p-1"
                    style={{ backgroundColor: resolvedPreviewColors.bg.surface }}
                  >
                    {MODE_SELECTOR_OPTIONS.map((m, idx) => (
                      <span
                        key={m}
                        className="px-3 py-1 rounded text-xs"
                        style={{
                          color: idx === 1 ? resolvedPreviewColors.interactive.secondary.DEFAULT : resolvedPreviewColors.interactive.primary.DEFAULT,
                          backgroundColor: idx === 1 ? resolvedPreviewColors.bg.base : "transparent",
                          fontWeight: idx === 1 ? 500 : 400
                        }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Row 2: Zen infinity + Difficulty */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium" style={{ color: resolvedPreviewColors.typing.default }}>Duration</span>
                  <div
                    className="flex rounded-lg px-4 py-1.5"
                    style={{ backgroundColor: resolvedPreviewColors.bg.surface }}
                  >
                    <span className="text-base" style={{ color: resolvedPreviewColors.interactive.secondary.DEFAULT }}>∞</span>
                  </div>
                  <div className="w-px h-4" style={{ backgroundColor: resolvedPreviewColors.typing.default, opacity: 0.3 }} />
                  <span className="text-xs font-medium" style={{ color: resolvedPreviewColors.typing.default }}>Difficulty</span>
                  <div
                    className="flex rounded-lg p-1"
                    style={{ backgroundColor: resolvedPreviewColors.bg.surface }}
                  >
                    {["easy", "medium", "hard"].map((d, idx) => (
                      <span
                        key={d}
                        className="px-3 py-1 rounded text-xs"
                        style={{
                          color: idx === 1 ? resolvedPreviewColors.interactive.secondary.DEFAULT : resolvedPreviewColors.interactive.primary.DEFAULT,
                          backgroundColor: idx === 1 ? resolvedPreviewColors.bg.base : "transparent",
                          fontWeight: idx === 1 ? 500 : 400
                        }}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Typing Area - Full height, vertically centered */}
              <div className="absolute inset-0 flex items-center justify-center px-8">
                {/* Sample Typing Text */}
                <div className="text-2xl font-mono leading-loose text-center">
                  {/* Line 1: correctly typed */}
                  <span style={{ color: resolvedPreviewColors.typing.correct }}>the quick brown fox </span>
                  {/* Line 1: error */}
                  <span style={{ color: resolvedPreviewColors.typing.incorrect }}>jum</span>
                  {/* Cursor */}
                  <span
                    className="inline-block w-0.5 h-6 align-middle animate-pulse"
                    style={{ backgroundColor: resolvedPreviewColors.typing.cursor }}
                  />
                  {/* Line 1: untyped */}
                  <span style={{ color: resolvedPreviewColors.typing.default }}>ps over the lazy dog</span>
                </div>
              </div>

              {/* Color Swatches - Absolute positioned at bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 px-6 py-4 border-t"
                style={{
                  backgroundColor: resolvedPreviewColors.bg.surface,
                  borderColor: `${resolvedPreviewColors.typing.default}20`
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: resolvedPreviewColors.typing.cursor }} />
                  <span className="text-xs" style={{ color: resolvedPreviewColors.typing.default }}>cursor</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: resolvedPreviewColors.typing.correct }} />
                  <span className="text-xs" style={{ color: resolvedPreviewColors.typing.default }}>correct</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: resolvedPreviewColors.typing.incorrect }} />
                  <span className="text-xs" style={{ color: resolvedPreviewColors.typing.default }}>incorrect</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: resolvedPreviewColors.typing.default }} />
                  <span className="text-xs" style={{ color: resolvedPreviewColors.typing.default }}>untyped</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: resolvedPreviewColors.interactive.secondary.DEFAULT }} />
                  <span className="text-xs" style={{ color: resolvedPreviewColors.typing.default }}>selected</span>
                </div>
              </div>

            </div>

            {/* Right: Theme Browser (60%) */}
            <div className="w-3/5 p-6 flex flex-col overflow-hidden border-l" style={{ borderColor: tv.border.subtle }}>
              {/* Header with close button */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold" style={{ color: tv.text.primary }}>Theme</h2>
                <button
                  onClick={() => {
                    setShowThemeModal(false);
                    setIsCustomThemeOpen(false);
                    setPreviewTheme(null);
                    setSelectedCategory(null);
                    setThemeSearchQuery("");
                    setCollapsedCategories(getDefaultCollapsedCategories());
                  }}
                  className="rounded-md px-2.5 py-1.5 text-xl leading-none transition-colors"
                  style={{ color: tv.text.secondary }}
                  aria-label="Close theme picker"
                  onMouseEnter={(e) => e.currentTarget.style.color = tv.text.primary}
                  onMouseLeave={(e) => e.currentTarget.style.color = tv.text.secondary}
                >
                  ✕
                </button>
              </div>

              {/* TEMP_DISABLED_CATEGORIES_TAB: view mode toggle hidden while only all-themes mode is active */}

              <div className="mb-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allThemes = groupedThemes.flatMap((g) => g.themes);
                    if (allThemes.length === 0) return;
                    const theme = allThemes[Math.floor(Math.random() * allThemes.length)];
                    const variant = theme.variants[Math.floor(Math.random() * theme.variants.length)];
                    handleThemeSelect(theme.id, variant.id, selectedMode);
                  }}
                  className="shrink-0 rounded-lg p-2 transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: tv.bg.base,
                    color: tv.text.secondary,
                    border: `1px solid ${tv.border.subtle}`,
                  }}
                  aria-label="Random theme"
                  title="Random theme"
                >
                  <Shuffle size={16} />
                </button>
                <input
                  type="text"
                  value={themeSearchQuery}
                  onChange={(e) => setThemeSearchQuery(e.target.value)}
                  placeholder={
                    themeViewMode === "all"
                      ? "Search themes or categories..."
                      : selectedCategory
                        ? `Search ${CATEGORY_CONFIG[selectedCategory].displayName} themes...`
                        : "Search categories..."
                  }
                  className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: tv.bg.base,
                    color: tv.text.primary,
                    border: `1px solid ${tv.border.subtle}`,
                    "--tw-ring-color": tv.interactive.secondary.DEFAULT,
                  } as React.CSSProperties}
                />
                {themeViewMode === "all" && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCollapsedCategories(new Set())}
                      className="px-2.5 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-80 whitespace-nowrap"
                      style={{
                        backgroundColor: tv.bg.base,
                        color: tv.text.secondary,
                        border: `1px solid ${tv.border.subtle}`,
                      }}
                    >
                      Expand All
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const all = new Set(filteredGroupedThemes.map((g) => g.category));
                        setCollapsedCategories(all);
                      }}
                      className="px-2.5 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-80 whitespace-nowrap"
                      style={{
                        backgroundColor: tv.bg.base,
                        color: tv.text.secondary,
                        border: `1px solid ${tv.border.subtle}`,
                      }}
                    >
                      Collapse All
                    </button>
                  </div>
                )}
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto pr-2">
                {/* All Themes View */}
                {themeViewMode === "all" && (
                  <>
                    {filteredGroupedThemes.length === 0 && (
                      <div className="text-sm py-6 text-center" style={{ color: tv.text.muted }}>
                        No themes found for "{themeSearchQuery.trim()}".
                      </div>
                    )}
                    {filteredGroupedThemes.map((group, index) => {
                      const isSearchActive = normalizedThemeSearchQuery.length > 0;
                      const isExpanded = isSearchActive || !collapsedCategories.has(group.category);
                      return (
                        <div
                          key={group.category}
                          className={`last:mb-0 ${index === 0 ? "" : "mt-4 pt-4 border-t"}`}
                          style={index === 0 ? undefined : { borderColor: tv.border.subtle }}
                        >
                          {/* Collapsible category header */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isSearchActive) return;
                              setCollapsedCategories((prev) => {
                                const next = new Set(prev);
                                if (next.has(group.category)) {
                                  next.delete(group.category);
                                } else {
                                  next.add(group.category);
                                }
                                return next;
                              });
                            }}
                            className={`w-full flex items-center justify-between text-sm font-medium py-2 px-2 rounded-md sticky top-0 z-10 transition-colors ${
                              isSearchActive ? "cursor-default" : "cursor-pointer hover:opacity-80"
                            }`}
                            style={{ backgroundColor: tv.bg.surface, color: tv.text.secondary }}
                          >
                            <span className="flex items-center gap-2">
                              {group.displayName}
                              <span className="text-xs font-normal" style={{ color: tv.text.muted }}>
                                ({group.themes.length})
                              </span>
                            </span>
                            {!isSearchActive && (
                              <ChevronDown
                                className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? "rotate-0" : "-rotate-90"}`}
                                style={{ color: tv.text.secondary }}
                              />
                            )}
                          </button>

                          {/* Collapsible theme grid */}
                          <div
                            className={`overflow-hidden transition-all duration-200 ease-in-out ${
                              isExpanded ? "max-h-[5000px] opacity-100 mt-2" : "max-h-0 opacity-0"
                            }`}
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                              {(() => {
                                const elements: React.ReactNode[] = [];
                                const expandedIndex = group.themes.findIndex(t => t.id === expandedThemeId);
                                const expandedRow = expandedIndex >= 0 ? Math.floor(expandedIndex / themeGridColumns) : -1;
                                const drawerAfterIndex = expandedRow >= 0
                                  ? Math.min((expandedRow + 1) * themeGridColumns - 1, group.themes.length - 1)
                                  : -1;
                                const expandedThemeData = expandedIndex >= 0 ? group.themes[expandedIndex] : null;

                                group.themes.forEach((themeData, idx) => {
                                  const isMultiVariant = themeData.variants.length > 1;
                                  const isThemeExpanded = expandedThemeId === themeData.id;
                                  const isSelected = selectedThemeId === themeData.id;
                                  const defaultVariant = themeData.variants.find(v => v.id === themeData.defaultVariantId) || themeData.variants[0];
                                  const matchingVariants = normalizedThemeSearchQuery
                                    ? themeData.variants.filter(v =>
                                        themeSearchMatches(v.id, normalizedThemeSearchQuery) ||
                                        themeSearchMatches(v.label, normalizedThemeSearchQuery)
                                      )
                                    : themeData.variants;

                                  elements.push(
                                    <div
                                      key={themeData.id}
                                      className="transition-opacity duration-200"
                                      style={{
                                        opacity: expandedThemeId && expandedThemeId !== themeData.id ? 0.5 : 1,
                                      }}
                                    >
                                      <ThemeCard
                                        themeData={themeData}
                                        variant={defaultVariant}
                                        label={themeData.name}
                                        isSelected={isSelected}
                                        isMultiVariant={isMultiVariant}
                                        isExpanded={isThemeExpanded}
                                        variantCount={themeData.variants.length}
                                        matchingVariantCount={
                                          normalizedThemeSearchQuery && matchingVariants.length > 0 && matchingVariants.length < themeData.variants.length
                                            ? matchingVariants.length
                                            : undefined
                                        }
                                        onCardClick={() => {
                                          if (isMultiVariant) {
                                            setExpandedThemeId(isThemeExpanded ? null : themeData.id);
                                          } else {
                                            handleThemeSelect(themeData.id);
                                          }
                                        }}
                                        onLightClick={() => {
                                          if (defaultVariant.light) handleThemeSelect(themeData.id, defaultVariant.id, "light");
                                        }}
                                        onDarkClick={() => handleThemeSelect(themeData.id, defaultVariant.id, "dark")}
                                        onMouseEnter={() => setPreviewTheme(themeData)}
                                        onMouseLeave={() => setPreviewTheme(null)}
                                        onLightMouseEnter={() => defaultVariant.light && setPreviewTheme(themeData, "light", defaultVariant.id)}
                                        onDarkMouseEnter={() => setPreviewTheme(themeData, "dark", defaultVariant.id)}
                                      />
                                    </div>
                                  );

                                  if (idx === drawerAfterIndex && expandedThemeData) {
                                    const expandedMatchingVariants = normalizedThemeSearchQuery
                                      ? expandedThemeData.variants.filter(v =>
                                          themeSearchMatches(v.id, normalizedThemeSearchQuery) ||
                                          themeSearchMatches(v.label, normalizedThemeSearchQuery)
                                        )
                                      : expandedThemeData.variants;
                                    const displayedVariants = normalizedThemeSearchQuery && expandedMatchingVariants.length > 0
                                      ? expandedMatchingVariants
                                      : expandedThemeData.variants;

                                    elements.push(
                                      <VariantDrawer
                                        key={`drawer-${expandedThemeData.id}`}
                                        themeData={expandedThemeData}
                                        variants={displayedVariants}
                                        selectedThemeId={selectedThemeId}
                                        selectedVariantId={selectedVariantId}
                                        isOpen={true}
                                        onClose={() => setExpandedThemeId(null)}
                                        onVariantSelect={handleThemeSelect}
                                        onPreviewEnter={setPreviewTheme}
                                        onPreviewLeave={() => setPreviewTheme(null)}
                                      />
                                    );
                                  }
                                });

                                return elements;
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/*
                  TEMP_DISABLED_CATEGORIES_TAB

                Categories View
                {themeViewMode === "categories" && !selectedCategory && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {filteredCategoryGroups.map((group) => (
                      <button
                        key={group.category}
                        onClick={() => setSelectedCategory(group.category)}
                        className="p-4 rounded-lg border transition text-left hover:opacity-90"
                        style={{ backgroundColor: theme.backgroundColor, borderColor: theme.borderSubtle }}
                      >
                        <div className="text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>
                          {group.displayName}
                        </div>
                        <div className="text-xs" style={{ color: theme.textMuted }}>
                          {group.themes.length} theme{group.themes.length !== 1 ? "s" : ""}
                        </div>
                        {group.themes[0] && (
                          <div className="flex items-center gap-1 mt-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: group.themes[0].dark.typing.cursor }} />
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: group.themes[0].dark.interactive.secondary.DEFAULT }} />
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: group.themes[0].dark.typing.correct }} />
                          </div>
                        )}
                      </button>
                    ))}
                    {filteredCategoryGroups.length === 0 && (
                      <div className="col-span-full text-sm py-6 text-center" style={{ color: theme.textMuted }}>
                        No categories found for "{themeSearchQuery.trim()}".
                      </div>
                    )}
                  </div>
                )}

                Single Category View
                {themeViewMode === "categories" && selectedCategory && (
                  <>
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="flex items-center gap-2 text-sm mb-4 transition hover:opacity-80"
                      style={{ color: theme.textSecondary }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Categories
                    </button>
                    <h3 className="text-sm font-medium mb-3" style={{ color: theme.textSecondary }}>
                      {CATEGORY_CONFIG[selectedCategory].displayName}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                      {filteredSelectedCategoryThemes.map((themeData) => (
                          <div
                            key={themeData.name}
                            className={`flex rounded-lg border transition overflow-hidden min-h-[64px] ${
                              selectedThemeName.toLowerCase() === themeData.name.toLowerCase()
                                ? "border-gray-400 ring-1 ring-gray-400"
                                : "border-gray-700 hover:border-gray-500"
                            }`}
                            style={{ backgroundColor: themeData.dark.bg.base }}
                          >
                            <button
                              onClick={() => handleThemeSelect(themeData.name)}
                              onMouseEnter={() => setPreviewTheme(themeData)}
                              onMouseLeave={() => setPreviewTheme(null)}
                              className="flex-1 min-w-0 p-2 text-left"
                            >
                              <div className="flex items-center gap-1.5 mb-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: themeData.dark.typing.cursor }} />
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: themeData.dark.interactive.secondary.DEFAULT }} />
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: themeData.dark.typing.correct }} />
                              </div>
                              <div className="text-xs whitespace-normal break-words leading-tight" style={{ color: themeData.dark.typing.correct }}>
                                {themeData.name}
                              </div>
                            </button>

                            <div className="w-10 shrink-0 flex flex-col border-l" style={{ borderColor: `${themeData.dark.typing.correct}30` }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (themeData.light) handleThemeSelect(themeData.name, "light");
                                }}
                                onMouseEnter={() => themeData.light && setPreviewTheme(themeData, "light")}
                                onMouseLeave={() => setPreviewTheme(null)}
                                disabled={!themeData.light}
                                className={`flex-1 flex items-center justify-center transition-colors ${
                                  !themeData.light
                                    ? "opacity-30 cursor-not-allowed"
                                    : "hover:bg-white/10 cursor-pointer"
                                }`}
                                title={themeData.light ? "Light mode" : "Light mode not available"}
                              >
                                <Sun className="w-3 h-3" style={{ color: themeData.dark.typing.correct }} />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleThemeSelect(themeData.name, "dark");
                                }}
                                onMouseEnter={() => setPreviewTheme(themeData, "dark")}
                                onMouseLeave={() => setPreviewTheme(null)}
                                className="flex-1 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors"
                                title="Dark mode"
                              >
                                <Moon className="w-3 h-3" style={{ color: themeData.dark.typing.correct }} />
                              </button>
                            </div>
                          </div>
                        ))}
                      {filteredSelectedCategoryThemes.length === 0 && (
                        <div className="col-span-full text-sm py-6 text-center" style={{ color: theme.textMuted }}>
                          No themes found for "{themeSearchQuery.trim()}".
                        </div>
                      )}
                    </div>
                  </>
                )}
                */}

                {/* Separator */}
                <div className="border-t border-gray-600 my-4" />

                {/* Custom Theme Dropdown */}
                <div className="border rounded-lg overflow-hidden mb-4" style={{ borderColor: tv.border.subtle }}>
                  <button
                    type="button"
                    onClick={() => setIsCustomThemeOpen(!isCustomThemeOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:opacity-90"
                    style={{ backgroundColor: tv.bg.base }}
                  >
                    <span className="text-sm font-medium" style={{ color: tv.text.primary }}>Custom Theme</span>
                    <svg
                      className={`w-5 h-5 transition-transform ${isCustomThemeOpen ? "rotate-180" : ""}`}
                      style={{ color: tv.text.muted }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isCustomThemeOpen
                        ? "max-h-[500px] opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="p-4 space-y-3" style={{ backgroundColor: tv.bg.elevated }}>
                      {/* Current Theme Colors (Read-only preview) */}
                      <p className="text-sm text-center mb-4" style={{ color: tv.text.secondary }}>
                        Current theme colors (read-only)
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: tv.text.secondary }}>Background</span>
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: tv.bg.base, borderColor: tv.border.subtle }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: tv.text.secondary }}>Surface</span>
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: tv.bg.surface, borderColor: tv.border.subtle }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: tv.text.secondary }}>Cursor</span>
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: tv.typing.cursor, borderColor: tv.border.subtle }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: tv.text.secondary }}>Ghost Cursor</span>
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: tv.typing.cursorGhost, borderColor: tv.border.subtle }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: tv.text.secondary }}>Default Text</span>
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: tv.typing.default, borderColor: tv.border.subtle }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: tv.text.secondary }}>Correct Text</span>
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: tv.typing.correct, borderColor: tv.border.subtle }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: tv.text.secondary }}>Incorrect Text</span>
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: tv.typing.incorrect, borderColor: tv.border.subtle }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: tv.text.secondary }}>Btn Selected</span>
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: tv.interactive.secondary.DEFAULT, borderColor: tv.border.subtle }}
                          />
                        </div>
                      </div>

                      {/* Reset to Default Button */}
                      <button
                        onClick={() => setThemeById("typesetgo")}
                        className="w-full py-2 mt-2 text-sm border rounded-lg transition-colors hover:opacity-80"
                        style={{ color: tv.text.secondary, borderColor: tv.border.subtle, backgroundColor: "transparent" }}
                      >
                        Reset to TypeSetGo Theme
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
