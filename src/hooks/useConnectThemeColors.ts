import { useEffect, useState } from "react";
import type { ConnectOverrides } from "@/lib/connect-types";
import { fetchTheme } from "@/lib/themes";
import type { ThemeColors, ThemeMode } from "@/types/theme";

export type ConnectRoomTheme = { colors: ThemeColors; mode: ThemeMode };

/** Loads the host's theme override; null while disabled, loading, or unavailable. */
export function useConnectThemeColors(theme: ConnectOverrides["theme"]): ConnectRoomTheme | null {
  const enabled = Boolean(theme?.enabled);
  const themeId = theme?.themeId;
  const mode = theme?.mode ?? "dark";
  const key = enabled && themeId ? `${themeId}:${mode}` : "";
  const [loaded, setLoaded] = useState<{ key: string; theme: ConnectRoomTheme | null }>({ key: "", theme: null });

  useEffect(() => {
    if (!key || !themeId) return;
    let current = true;
    void fetchTheme(themeId)
      .then((definition) => {
        if (!current) return;
        if (!definition) { setLoaded({ key, theme: null }); return; }
        // Themes without a light palette stay dark.
        const light = mode === "light" && definition.light;
        setLoaded({ key, theme: light ? { colors: light, mode: "light" } : { colors: definition.dark, mode: "dark" } });
      })
      .catch(() => { if (current) setLoaded({ key, theme: null }); });
    return () => { current = false; };
  }, [key, themeId, mode]);

  return key && loaded.key === key ? loaded.theme : null;
}
