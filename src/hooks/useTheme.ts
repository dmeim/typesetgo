import { useContext } from "react";
import { ThemeContext, type ThemeContextValue } from "@/context/ThemeContext";

/**
 * Hook to access theme context.
 *
 * Provides access to:
 * - `theme` - The full theme definition
 * - `themeId` - The current theme ID
 * - `mode` - Current mode ('light' | 'dark')
 * - `setTheme(id)` - Change theme by ID
 * - `setMode(mode)` - Set light/dark mode
 * - `toggleMode()` - Toggle between light/dark
 * - `colors` - Resolved colors for current mode
 * - `supportsLightMode` - Whether current theme has light variant
 * - `isLoading` - Whether theme is still loading
 *
 * @example
 * ```tsx
 * const { colors, mode, toggleMode, supportsLightMode } = useTheme();
 *
 * // Use colors for styling
 * <div style={{ backgroundColor: colors.bg.base }}>
 *   <span style={{ color: colors.typing.correct }}>Correct!</span>
 * </div>
 *
 * // Toggle mode (only works if theme supports light)
 * {supportsLightMode && (
 *   <button onClick={toggleMode}>
 *     {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
 *   </button>
 * )}
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
