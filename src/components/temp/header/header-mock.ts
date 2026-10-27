// Mock data for the Dock header mockup in the /temp UI Lab. The header keeps only: logo (home), page links,
// leaderboard, theme, settings, notifications, light/dark, and one account button; stats live in Profile.
import {
  ChartLineUpIcon, ClockCounterClockwiseIcon, FlagCheckeredIcon, GearSixIcon, GraduationCapIcon, KeyboardIcon, PaletteIcon, TrophyIcon, UsersThreeIcon, type Icon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";

export type PageId = "type" | "race" | "lessons" | "connect" | "leaderboard" | "theme" | "settings";

export interface NavItem {
  id: PageId;
  label: string;
  Icon: Icon;
  /** Solid tile colour, matching the Profile sidebar tiles. */
  tile: string;
  soon?: boolean;
}

export const NAV: NavItem[] = [
  { id: "type", label: "Type", Icon: KeyboardIcon, tile: "bg-primary text-primary-foreground" },
  { id: "race", label: "Race", Icon: FlagCheckeredIcon, tile: "bg-destructive text-background", soon: true },
  { id: "lessons", label: "Lessons", Icon: GraduationCapIcon, tile: "bg-success text-background", soon: true },
  { id: "connect", label: "Connect", Icon: UsersThreeIcon, tile: "bg-(--accent-emphasis) text-background" },
];

export const LEADERBOARD: NavItem = { id: "leaderboard", label: "Leaderboard", Icon: TrophyIcon, tile: "bg-[#E8B931] text-black" };

// Theme and Settings sit beside the leaderboard rather than inside the account menu.
export const THEME: NavItem = { id: "theme", label: "Theme", Icon: PaletteIcon, tile: "bg-(--accent-emphasis) text-background" };
export const SETTINGS: NavItem = { id: "settings", label: "Settings", Icon: GearSixIcon, tile: "bg-muted-foreground text-background" };
export const TOOLS: NavItem[] = [LEADERBOARD, THEME, SETTINGS];
export const ALL_PAGES: NavItem[] = [...NAV, ...TOOLS];

export interface MockNotification {
  id: string;
  title: string;
  body: string;
  when: string;
  kind: "achievement" | "streak" | "info";
  unread: boolean;
}

export const NOTIFICATIONS: MockNotification[] = [
  { id: "n1", title: "Achievement unlocked", body: "Emerald II · reach 70 WPM in a single test", when: "2m ago", kind: "achievement", unread: true },
  { id: "n2", title: "Keep your streak going", body: "Type today to make it 7 days in a row", when: "3h ago", kind: "streak", unread: true },
  { id: "n3", title: "New themes", body: "640 new themes to explore in Profile → Theme", when: "Yesterday", kind: "info", unread: false },
];

export const GUEST_NOTIFICATIONS: MockNotification[] = [
  { id: "g1", title: "Welcome to TypeSetGo", body: "Sign in to save your results and earn achievements", when: "Just now", kind: "info", unread: true },
];

/** The account menu holds only your own records; Theme and Settings have their own dock buttons. */
export const ACCOUNT_LINKS: { label: string; href: string; Icon: Icon }[] = [
  { label: "Stats", href: "/temp-profile", Icon: ChartLineUpIcon },
  { label: "History", href: "/temp-profile/history", Icon: ClockCounterClockwiseIcon },
  { label: "Achievements", href: "/temp-profile/achievements", Icon: TrophyIcon },
];

export const MOCK_ACCOUNT = { username: "pixelpenguin", streak: 6 };

/** What every header mockup is given by the UI Lab frame. */
export interface HeaderDemo {
  signedIn: boolean;
  /** Mid-test: the real header steps out of the way while you type. */
  typing: boolean;
  page: PageId;
  go: (page: PageId) => void;
  dark: boolean;
  toggleDark: () => void;
  notifications: MockNotification[];
  readAll: () => void;
}

export type HeaderMockupProps = HeaderDemo & { children: ReactNode };
