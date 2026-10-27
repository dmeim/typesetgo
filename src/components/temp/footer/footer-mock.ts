// Mock data for the footer and info page concepts in the /temp UI Lab. Nothing here is live.
import {
  ChatCircleDotsIcon, ClipboardTextIcon, CookieIcon, CopyrightIcon, GearSixIcon, HandHeartIcon, HandshakeIcon, HardDrivesIcon, InfoIcon,
  KeyboardIcon, ListChecksIcon, MegaphoneIcon, QuestionIcon, ScrollIcon, SealCheckIcon, ShareNetworkIcon, ShieldCheckIcon, SmileyIcon, TrophyIcon,
  UserCircleCheckIcon, WarningCircleIcon, type Icon,
} from "@phosphor-icons/react";
import type { PageId } from "@/components/temp/header/header-mock";

export type InfoId = "about" | "privacy" | "tos";
export type LinkId = InfoId | "changelog";

/** Where the pretend browser is. Footer links move it instead of leaving /temp. */
export type StageRoute =
  | { kind: "home" }
  | { kind: "info"; id: InfoId }
  | { kind: "changelog" }
  | { kind: "page"; id: PageId };

export interface FooterLinkItem {
  id: LinkId;
  /** Full name, for wide footers. */
  label: string;
  /** Short name, for one-line footers and phones. */
  short: string;
  path: string;
  Icon: Icon;
  tile: string;
}

export const FOOTER_LINKS: FooterLinkItem[] = [
  { id: "about", label: "About", short: "About", path: "/about", Icon: InfoIcon, tile: "bg-primary text-primary-foreground" },
  { id: "privacy", label: "Privacy Policy", short: "Privacy", path: "/privacy", Icon: ShieldCheckIcon, tile: "bg-success text-background" },
  { id: "tos", label: "Terms of Service", short: "Terms", path: "/tos", Icon: ScrollIcon, tile: "bg-warning text-background" },
  { id: "changelog", label: "What's new", short: "What's new", path: "/changelog", Icon: MegaphoneIcon, tile: "bg-(--accent-emphasis) text-background" },
];

export const LEGAL_LINKS = FOOTER_LINKS.filter((link) => link.id !== "changelog");

export const linkById = (id: LinkId) => FOOTER_LINKS.find((link) => link.id === id) ?? FOOTER_LINKS[0];

export const SITE = {
  version: "v0.2.0",
  theme: "Nord",
  year: 2026,
  github: "https://github.com/dmeim/typesetgo",
  issues: "https://github.com/dmeim/typesetgo/issues",
};

// Theme tokens only, matching the real info pages, so every theme stays legible.
export const TILES = [
  "bg-primary text-primary-foreground",
  "bg-(--accent-emphasis) text-background",
  "bg-success text-background",
  "bg-warning text-background",
  "bg-destructive text-background",
  "bg-muted-foreground text-background",
];

export interface InfoSection {
  id: string;
  title: string;
  Icon: Icon;
  short: string;
}

export interface InfoDoc {
  id: InfoId;
  title: string;
  /** The tab name when the three pages share one header. */
  tab: string;
  Icon: Icon;
  updated?: string;
  intro: string;
  minutes: number;
  sections: InfoSection[];
}

export const INFO_DOCS: Record<InfoId, InfoDoc> = {
  about: {
    id: "about",
    title: "About TypeSetGo",
    tab: "About",
    Icon: InfoIcon,
    intro: "How TypeSetGo checks your tests, and what it takes for a score to count on the leaderboard.",
    minutes: 3,
    sections: [
      { id: "validity", title: "What is Test Validity?", Icon: SealCheckIcon, short: "Finished tests get checked. Tests that pass are verified; the rest are still saved." },
      { id: "eligibility", title: "Leaderboard Eligibility", Icon: TrophyIcon, short: "Be signed in, get 90% or more right, and type for 30 seconds or 50 correct words." },
      { id: "requirements", title: "Universal Requirements", Icon: ShieldCheckIcon, short: "No more than 300 WPM, no pasting, and sign in so it can be verified." },
      { id: "modes", title: "Mode-Specific Requirements", Icon: ListChecksIcon, short: "Finish what you start. Zen is relaxed and never ranks." },
      { id: "unverified", title: "Why Was My Test Unverified?", Icon: QuestionIcon, short: "Usually it went too fast, ended early, was pasted, or you weren't signed in." },
      { id: "false-positives", title: "Note on False Positives", Icon: HandHeartIcon, short: "Fast typists are welcome. Unverified tests still stay in your history." },
    ],
  },
  privacy: {
    id: "privacy",
    title: "Privacy Policy",
    tab: "Privacy",
    Icon: ShieldCheckIcon,
    updated: "September 22, 2026",
    intro: "What TypeSetGo keeps, where it lives, who can see it, and what you can do about it.",
    minutes: 4,
    sections: [
      { id: "collect", title: "Information We Collect", Icon: ClipboardTextIcon, short: "Your typing scores, and your account details if you sign in." },
      { id: "use", title: "How We Use Your Information", Icon: GearSixIcon, short: "To run TypeSetGo, show your progress and make multiplayer work." },
      { id: "storage", title: "Data Storage", Icon: HardDrivesIcon, short: "Saved results live in our database. Some settings stay in your browser." },
      { id: "sharing", title: "Data Sharing", Icon: ShareNetworkIcon, short: "We don't sell your data. Only the services that run the site see it." },
      { id: "cookies", title: "Cookies and Tracking", Icon: CookieIcon, short: "No ad trackers. Sign-in uses the cookies it needs." },
      { id: "rights", title: "Your Rights", Icon: UserCircleCheckIcon, short: "Ask to see, fix or delete what we keep about you." },
      { id: "contact", title: "Contact Us", Icon: ChatCircleDotsIcon, short: "Questions? Open an issue on the project tracker." },
    ],
  },
  tos: {
    id: "tos",
    title: "Terms of Service",
    tab: "Terms",
    Icon: ScrollIcon,
    updated: "January 15, 2026",
    intro: "The rules for using TypeSetGo: what it is, how to play fair, and what we can and can't promise.",
    minutes: 5,
    sections: [
      { id: "acceptance", title: "Acceptance of Terms", Icon: HandshakeIcon, short: "Using TypeSetGo means you agree to these rules." },
      { id: "service", title: "Description of Service", Icon: KeyboardIcon, short: "A free typing practice site with races, rooms and leaderboards." },
      { id: "conduct", title: "User Conduct", Icon: SmileyIcon, short: "Be kind, play fair, and keep names friendly." },
      { id: "property", title: "Intellectual Property", Icon: CopyrightIcon, short: "The site and its look belong to TypeSetGo. Your results are yours." },
      { id: "warranties", title: "Disclaimer of Warranties", Icon: WarningCircleIcon, short: "We try hard, but the site comes as it is." },
      { id: "contact", title: "Contact Information", Icon: ChatCircleDotsIcon, short: "Reach us through the project tracker." },
    ],
  },
};

export const INFO_ORDER: InfoId[] = ["about", "privacy", "tos"];

/** Unique ids inside the stage, so two pages never share an anchor. */
export const sectionAnchor = (doc: InfoId, section: string) => `footer-lab-${doc}-${section}`;

export const anchorsOf = (doc: InfoDoc) => doc.sections.map((section) => sectionAnchor(doc.id, section.id));
