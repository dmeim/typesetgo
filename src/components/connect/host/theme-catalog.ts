import { useCallback, useEffect, useState } from "react";
import { fetchThemeCatalogIndex } from "@/lib/themes";
import type { ThemeCatalogEntry } from "@/types/theme";

export const formatThemeId = (id: string) => id.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

export type ThemeCatalog = ReturnType<typeof useThemeCatalog>;

/** The browsing catalogue (names and swatches only); full palettes load where a theme is shown. */
export function useThemeCatalog() {
  const [themes, setThemes] = useState<ThemeCatalogEntry[] | null>(null);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const fetchCatalog = useCallback(() => fetchThemeCatalogIndex()
    .then((catalog) => {
      if (!catalog) { setState("error"); return; }
      setThemes(catalog.themes);
      setState("ready");
    })
    .catch(() => setState("error")), []);
  // Metadata is small; load it once so the current theme shows its name and swatches.
  useEffect(() => { void fetchCatalog(); }, [fetchCatalog]);
  const load = useCallback(() => { setState("loading"); void fetchCatalog(); }, [fetchCatalog]);
  return { themes, state, load };
}
