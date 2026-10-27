import { Link } from "react-router-dom";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { SplitViewSettings } from "@/components/temp/settings/SplitViewSettings";
import { PLAYERS } from "@/components/temp/settings/mock-players";
import { useLabSettings } from "@/components/temp/settings/useLabSettings";

const BASE = "/temp-profile";

// Quick ways to try each kind of URL from a phone, where typing paths is awkward.
const TRY_LINKS: [string, string][] = [
  ["/temp-profile", "You"],
  [`/temp-profile/${PLAYERS[1].id}`, PLAYERS[1].username],
  ["/temp-profile/history", "History"],
  ["/temp-profile/not-a-real-player", "Missing"],
  ["/temp-leaderboard1", "Leaderboard"],
];

/** The split view as the Profile page, driven by the URL. Same local-only settings and mock data as /temp-settings1. */
export default function TempProfile() {
  const lab = useLabSettings();
  return (
    <div className="min-h-[100dvh] bg-background font-mono text-foreground">
      <SplitViewSettings lab={lab} basePath={BASE} />
      <nav aria-label="Profile mockup links" className="fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full border border-border bg-popover/95 p-1 text-xs shadow-xl backdrop-blur">
        <Link to="/temp" className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-3.5" aria-hidden="true" />UI Lab
        </Link>
        <span className="px-1 text-muted-foreground" aria-hidden="true">Try</span>
        {TRY_LINKS.map(([to, label]) => (
          <Link key={to} to={to} className="whitespace-nowrap rounded-full px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">{label}</Link>
        ))}
      </nav>
    </div>
  );
}
