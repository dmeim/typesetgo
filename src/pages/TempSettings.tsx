import { useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { SplitViewSettings } from "@/components/temp/settings/SplitViewSettings";
import { StudioSettings } from "@/components/temp/settings/StudioSettings";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { useLabSettings, type LabState } from "@/components/temp/settings/useLabSettings";

// Numbers stay as first published so /temp-settings1 and /temp-settings3 links keep working.
const MOCKUPS: { number: number; name: string; Component: ComponentType<{ lab: LabState }> }[] = [
  { number: 1, name: "Split view", Component: SplitViewSettings },
  { number: 3, name: "Studio", Component: StudioSettings },
];

// /temp-settings1 in the app, ?temp-settings=1 in the local fixture.
function initialMockup() {
  const fromPath = /^\/temp-settings(\d)$/.exec(location.pathname)?.[1];
  const value = Number(fromPath ?? new URLSearchParams(location.search).get("temp-settings") ?? 1);
  return MOCKUPS.some((entry) => entry.number === value) ? value : 1;
}

/** Full-page settings mockups. All state is local; the site's saved settings and theme never change. */
export default function TempSettings() {
  const [mockup, setMockup] = useState(initialMockup);
  const lab = useLabSettings();
  const { Component } = MOCKUPS.find((entry) => entry.number === mockup) ?? MOCKUPS[0];
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
        {MOCKUPS.map((entry) => (
          <button
            key={entry.name}
            type="button"
            aria-current={mockup === entry.number ? "page" : undefined}
            onClick={() => choose(entry.number)}
            className={`relative rounded-full px-3 py-1.5 ${mockup === entry.number ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {mockup === entry.number && <motion.span layoutId="settings-mockup-tab" transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-primary" />}
            <span className="relative">{entry.number}<span className="hidden sm:inline"> {entry.name}</span></span>
          </button>
        ))}
      </nav>
    </div>
  );
}
