import { FlagCheckeredIcon, GraduationCapIcon, KeyboardIcon, TrophyIcon, UsersThreeIcon, type Icon } from "@phosphor-icons/react";

export interface HeaderPage {
  label: string;
  path: string;
  Icon: Icon;
  /** Shown but not open yet. */
  soon?: boolean;
  isActive: (pathname: string) => boolean;
}

const startsWithSegment = (path: string) => (pathname: string) => pathname === path || pathname.startsWith(`${path}/`);

export const PRACTICE_PAGES: HeaderPage[] = [
  { label: "Type", path: "/", Icon: KeyboardIcon, isActive: (pathname) => pathname === "/" },
  { label: "Race", path: "/race", Icon: FlagCheckeredIcon, soon: true, isActive: startsWithSegment("/race") },
  { label: "Lessons", path: "/lessons", Icon: GraduationCapIcon, soon: true, isActive: startsWithSegment("/lessons") },
  { label: "Connect", path: "/connect", Icon: UsersThreeIcon, isActive: startsWithSegment("/connect") },
];

export const LEADERBOARD_PAGE: HeaderPage = { label: "Leaderboard", path: "/leaderboard", Icon: TrophyIcon, isActive: startsWithSegment("/leaderboard") };

/** Where the account button sends you for your stats, history and achievements. Change it here when /profile ships. */
export const accountStatsPath = (userId: string) => `/user/${userId}`;
