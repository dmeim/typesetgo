// URL scheme for the Profile page (mocked at /temp-profile, planned as /profile):
//   /profile            your own stats (signed in redirects to /profile/:yourId; signed out asks you to sign in)
//   /profile/:userId    anyone's public stats; the only public view
//   /profile/history    your history; achievements, theme, text, typing, sound and keyboard work the same way
// Tab names win over user IDs. Real IDs are random Convex strings, so they never collide with a tab name.
import type { PaneId } from "./lab-settings";

export const PROFILE_TABS = ["history", "achievements", "theme", "text", "typing", "sound", "keyboard"] as const satisfies readonly Exclude<PaneId, "stats">[];

export type ProfileTab = (typeof PROFILE_TABS)[number];

export type ProfileRoute =
  | { kind: "own" }
  | { kind: "tab"; tab: ProfileTab }
  | { kind: "player"; userId: string };

const isTab = (segment: string): segment is ProfileTab => (PROFILE_TABS as readonly string[]).includes(segment);

/** Reads the first segment after `base`; anything deeper is ignored. `/stats` is an alias for your own stats. */
export function parseProfilePath(pathname: string, base: string): ProfileRoute {
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : "";
  const segment = rest.split("/").find(Boolean);
  if (!segment) return { kind: "own" };
  const lower = segment.toLowerCase();
  if (lower === "stats") return { kind: "own" };
  if (isTab(lower)) return { kind: "tab", tab: lower };
  return { kind: "player", userId: decodeURIComponent(segment) };
}

export function profilePath(base: string, route: ProfileRoute) {
  if (route.kind === "own") return base;
  if (route.kind === "tab") return `${base}/${route.tab}`;
  return `${base}/${encodeURIComponent(route.userId)}`;
}
