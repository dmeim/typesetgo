// URL scheme for the Profile page:
//   /profile            your own stats (signed in redirects to /profile/:yourId; signed out asks you to sign in)
//   /profile/:userId    anyone's public stats; the only public view (old /user/:userId links redirect here)
//   /profile/history    your history; achievements, theme, text, typing, sound and keyboard work the same way
// Tab names win over user IDs. Real IDs are random Convex strings, so they never collide with a tab name.
import type { PaneId } from "./profile-sections";

export const PROFILE_BASE = "/profile";

export const PROFILE_TABS = ["history", "achievements", "theme", "text", "typing", "sound", "keyboard"] as const satisfies readonly Exclude<PaneId, "stats">[];

export type ProfileTab = (typeof PROFILE_TABS)[number];

export type ProfileRoute =
  | { kind: "own" }
  | { kind: "tab"; tab: ProfileTab }
  | { kind: "player"; userId: string };

const isTab = (segment: string): segment is ProfileTab => (PROFILE_TABS as readonly string[]).includes(segment);

/** Reads the first segment after `base`; anything deeper is ignored. `/stats` is an alias for your own stats. */
export function parseProfilePath(pathname: string, base: string = PROFILE_BASE): ProfileRoute {
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : "";
  const segment = rest.split("/").find(Boolean);
  if (!segment) return { kind: "own" };
  const lower = segment.toLowerCase();
  if (lower === "stats") return { kind: "own" };
  if (isTab(lower)) return { kind: "tab", tab: lower };
  return { kind: "player", userId: safeDecode(segment) };
}

function safeDecode(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function profilePath(base: string, route: ProfileRoute) {
  if (route.kind === "own") return base;
  if (route.kind === "tab") return `${base}/${route.tab}`;
  return `${base}/${encodeURIComponent(route.userId)}`;
}

/** Someone's public stats, e.g. for leaderboard names and the header account button. */
export const publicProfilePath = (userId: string) => profilePath(PROFILE_BASE, { kind: "player", userId });

/** The tab a route opens; a player route (yours or someone else's) shows stats. */
export const paneForRoute = (route: ProfileRoute): PaneId => (route.kind === "tab" ? route.tab : "stats");
