import { useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { GallerySettings } from "@/components/temp/settings/GallerySettings";
import { SplitViewSettings } from "@/components/temp/settings/SplitViewSettings";
import { SpotlightSettings } from "@/components/temp/settings/SpotlightSettings";
import { StudioSettings } from "@/components/temp/settings/StudioSettings";
import { TileHubSettings } from "@/components/temp/settings/TileHubSettings";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { useLabSettings, type LabState } from "@/components/temp/settings/useLabSettings";

const MOCKUPS: { name: string; Component: ComponentType<{ lab: LabState }> }[] = [
  { name: "Split view", Component: SplitViewSettings },
  { name: "Tile hub", Component: TileHubSettings },
  { name: "Studio", Component: StudioSettings },
  { name: "Gallery", Component: GallerySettings },
  { name: "Spotlight", Component: SpotlightSettings },
];

// /temp-settings1 in the app, ?temp-settings=1 in the local fixture.
function initialMockup() {
  const fromPath = /^\/temp-settings(\d)$/.exec(location.pathname)?.[1];
  const value = Number(fromPath ?? new URLSearchParams(location.search).get("temp-settings") ?? 1);
  return Math.min(MOCKUPS.length, Math.max(1, value || 1));
}

/** Full-page settings mockups. All state is local; the site's saved settings and theme never change. */
export default function TempSettings() {
  const [mockup, setMockup] = useState(initialMockup);
  const lab = useLabSettings();
  const { Component } = MOCKUPS[mockup - 1];
  const choose = (next: number) => {
    setMockup(next);
    const url = location.pathname.startsWith("/temp-settings") ? `/temp-settings${next}` : `/?temp-settings=${next}`;
    window.history.replaceState(window.history.state, "", url);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-[100dvh] bg-background font-mono text-foreground">
      <Component key={mockup} lab={lab} />
      <nav aria-label="Settings mockups" className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-popover/95 p-1 text-xs shadow-xl backdrop-blur">
        <Link to="/temp" className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-3.5" aria-hidden="true" />UI Lab
        </Link>
        {MOCKUPS.map((entry, index) => (
          <button
            key={entry.name}
            type="button"
            aria-current={mockup === index + 1 ? "page" : undefined}
            onClick={() => choose(index + 1)}
            className={`relative rounded-full px-3 py-1.5 ${mockup === index + 1 ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {mockup === index + 1 && <motion.span layoutId="settings-mockup-tab" transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-primary" />}
            <span className="relative">{index + 1}<span className="hidden sm:inline"> {entry.name}</span></span>
          </button>
        ))}
      </nav>
    </div>
  );
}
