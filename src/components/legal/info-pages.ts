import { InfoIcon, MegaphoneIcon, ScrollIcon, ShieldCheckIcon, type Icon } from "@phosphor-icons/react";

export interface SiteLink {
  path: string;
  /** Short name for the footer and the info page tabs. */
  label: string;
  Icon: Icon;
}

/** About, Privacy and Terms: one header with these as tabs, and the first links in the site footer. */
export const INFO_PAGES: SiteLink[] = [
  { path: "/about", label: "About", Icon: InfoIcon },
  { path: "/privacy", label: "Privacy", Icon: ShieldCheckIcon },
  { path: "/tos", label: "Terms", Icon: ScrollIcon },
];

export const CHANGELOG_LINK: SiteLink = { path: "/changelog", label: "What's new", Icon: MegaphoneIcon };

export const FOOTER_LINKS: SiteLink[] = [...INFO_PAGES, CHANGELOG_LINK];
