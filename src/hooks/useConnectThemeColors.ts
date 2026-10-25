import { useEffect, useState } from "react";
import type { ConnectOverrides } from "@/lib/connect-types";
import { fetchTheme } from "@/lib/themes";
import type { ThemeColors } from "@/types/theme";

/** Loads the host's theme override; null while disabled, loading, or unavailable. */
export function useConnectThemeColors(theme: ConnectOverrides["theme"]): ThemeColors | null {
  const enabled = Boolean(theme?.enabled);
  const themeId = theme?.themeId;
  const mode = theme?.mode ?? "dark";
  const key = enabled && themeId ? `${themeId}:${mode}` : "";
  const [loaded, setLoaded] = useState<{ key: string; colors: ThemeColors | null }>({ key: "", colors: null });

  useEffect(() => {
    if (!key || !themeId) return;
    let current = true;
    void fetchTheme(themeId)
      .then((definition) => {
        if (!current) return;
        const colors = definition ? (mode === "light" && definition.light ? definition.light : definition.dark) : null;
        setLoaded({ key, colors });
      })
      .catch(() => { if (current) setLoaded({ key, colors: null }); });
    return () => { current = false; };
  }, [key, themeId, mode]);

  return key && loaded.key === key ? loaded.colors : null;
}
