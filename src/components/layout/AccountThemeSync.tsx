import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { api } from "../../../convex/_generated/api";
import { useAccount } from "@/components/layout/useAccount";
import { useAppAuth } from "@/components/layout/useAppAuth";
import { useTheme } from "@/hooks/useTheme";

type AccountPreferences = FunctionArgs<typeof api.preferences.savePreferences>["preferences"];
type AccountThemeSelection = Parameters<ReturnType<typeof useTheme>["setThemeSelection"]>[0];

/** Short, so a quick toggle followed by a page change or reload still reaches the account. */
const ACCOUNT_SAVE_DELAY_MS = 400;
const DOCUMENT_FIELDS = new Set(["_id", "_creationTime", "userId", "updatedAt"]);

/**
 * Keeps the site theme and the account's saved theme in step for the whole app, not per page.
 * The account's theme applies once per sign-in, unless the player already picked one during this visit. From then on
 * the current pick is the theme on every page, and each pick made anywhere (the Dock's light/dark toggle included) is
 * saved to the account once.
 */
export function AccountThemeSync() {
  const { user } = useAppAuth();
  const { status } = useAccount();
  const accountId = status === "ready" ? user?.id ?? null : null;
  const { themeId, variantId, mode, isLoading, userSelectionRevision, setThemeSelection } = useTheme();
  const stored = useQuery(api.preferences.getPreferences, accountId ? { clerkId: accountId } : "skip");
  const savePreferences = useMutation(api.preferences.savePreferences);

  // `baseline` is the last pick the account already has. Picks made while signed out follow the first sign-in; picks
  // from one account never follow another.
  const [visit, setVisit] = useState({ accountId, baseline: userSelectionRevision, settled: false });
  const [accountTheme, setAccountTheme] = useState<{ selection: AccountThemeSelection; revision: number } | null>(null);
  if (visit.accountId !== accountId) {
    setVisit({ accountId, baseline: visit.accountId === null ? visit.baseline : userSelectionRevision, settled: false });
  } else if (accountId && !visit.settled && stored !== undefined) {
    setVisit({ ...visit, settled: true });
    if (userSelectionRevision === visit.baseline && stored?.themeId) {
      const storedMode = stored.themeMode === "light" || stored.themeMode === "dark" ? stored.themeMode : undefined;
      setAccountTheme({
        selection: { themeId: stored.themeId, variantId: stored.themeVariantId || undefined, mode: storedMode },
        revision: visit.baseline,
      });
    }
  }

  useEffect(() => {
    if (!accountTheme) return;
    setThemeSelection(accountTheme.selection, { source: "preferences", expectedUserSelectionRevision: accountTheme.revision })
      .catch((error: unknown) => console.warn("Failed to apply the account theme:", error));
  }, [accountTheme, setThemeSelection]);

  // Only a new pick is saved, so another tab or device changing the account theme never bounces back from here.
  useEffect(() => {
    if (!accountId || !stored || !visit.settled || isLoading || userSelectionRevision === visit.baseline) return;
    const revision = userSelectionRevision;
    const timer = setTimeout(() => {
      setVisit((current) => (current.accountId === accountId ? { ...current, baseline: revision } : current));
      if (stored.themeId === themeId && stored.themeVariantId === variantId && stored.themeMode === mode) return;
      const kept = Object.entries(stored).filter(([key]) => !DOCUMENT_FIELDS.has(key));
      const preferences = { ...Object.fromEntries(kept), themeId, themeVariantId: variantId, themeMode: mode } as AccountPreferences;
      savePreferences({ clerkId: accountId, preferences })
        .catch((error: unknown) => console.warn("Failed to save the theme to the account:", error));
    }, ACCOUNT_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [accountId, stored, visit, isLoading, userSelectionRevision, themeId, variantId, mode, savePreferences]);

  return null;
}
