import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon, ArrowUpIcon, CaretDownIcon, ListBulletsIcon, SparkleIcon, type Icon } from "@phosphor-icons/react";
import Header from "@/components/layout/Header";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { INFO_PAGES } from "@/components/legal/info-pages";
import { cn } from "@/lib/utils";

export interface LegalSection {
  id: string;
  title: string;
  Icon: Icon;
  /** A plain-words version for kids and busy parents. The full text below it is what counts. */
  short: string;
  body: ReactNode;
}

interface LegalPageProps {
  title: string;
  updated?: string;
  intro: string;
  /** Overrides the note under the intro; legal pages keep the default. */
  note?: string;
  Icon: Icon;
  sections: LegalSection[];
  other: { to: string; label: string };
}

// Theme tokens only, so every theme stays legible.
const TILES = [
  "bg-primary text-primary-foreground",
  "bg-(--accent-emphasis) text-background",
  "bg-success text-background",
  "bg-warning text-background",
  "bg-destructive text-background",
  "bg-muted-foreground text-background",
];

const SPRING = { type: "spring", stiffness: 420, damping: 34 } as const;

/**
 * About, Privacy and Terms share this layout: the Dock, the three pages as tabs, a hero, then one card per section
 * with a short version on top. Contents sit on the right on desktop and in a jump menu on phones.
 */
export function LegalPage({ title, updated, intro, note = "Each section starts with a short version in plain words. The full text under it is what counts.", Icon, sections, other }: LegalPageProps) {
  const active = useActiveSection(sections);
  const jump = useJumpToSection();
  useHashOnArrival(sections);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background font-mono text-foreground transition-colors duration-300">
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-12">
        <InfoTabs />

        <header className="mt-6 mb-8 flex flex-col items-center gap-3 text-center">
          <motion.span
            initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={SPRING}
            className="flex size-14 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg sm:size-16"
          >
            <Icon className="size-7 sm:size-8" weight="fill" aria-hidden="true" />
          </motion.span>
          <h1 className="text-3xl font-bold text-primary sm:text-4xl">{title}</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{intro}</p>
          <p className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-muted-foreground">
            {updated && <span className="rounded-full bg-muted px-2.5 py-1">Last updated: {updated}</span>}
            <span className="rounded-full bg-muted px-2.5 py-1">{sections.length} sections</span>
          </p>
          <p className="inline-flex max-w-2xl items-start gap-2 rounded-2xl bg-accent/60 px-4 py-2.5 text-left text-xs leading-relaxed text-foreground">
            <SparkleIcon className="mt-0.5 size-4 shrink-0 text-primary" weight="fill" aria-hidden="true" />
            {note}
          </p>
        </header>

        <JumpMenu sections={sections} active={active} onJump={jump} />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="flex min-w-0 flex-col gap-4">
            {sections.map((section, index) => (
              <SectionCard key={section.id} section={section} number={index + 1} tile={TILES[index % TILES.length]} />
            ))}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-dashed border-border p-5 text-sm">
              <a href="#top" onClick={(event) => { event.preventDefault(); jump(); }} className="inline-flex items-center gap-2 text-muted-foreground transition hover:text-foreground">
                <ArrowUpIcon className="size-4" aria-hidden="true" />
                Back to top
              </a>
              <Link to={other.to} className="inline-flex items-center gap-2 font-medium text-primary hover:underline">
                {other.label}
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <Contents sections={sections} active={active} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** About, Privacy and Terms as tabs: real links, so each page keeps its own address. */
function InfoTabs() {
  return (
    <div className="sticky top-0 z-10 -mx-4 flex justify-center bg-background/90 px-4 py-2.5 backdrop-blur">
      <nav aria-label="Info pages">
        <ul className="flex gap-1 rounded-full bg-muted/60 p-1">
          {INFO_PAGES.map((page) => (
            <li key={page.path}>
              <NavLink
                to={page.path}
                className={({ isActive }) => cn(
                  "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring sm:px-4 sm:text-sm",
                  isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="info-tabs-pill" transition={SPRING} className="absolute inset-0 rounded-full bg-primary shadow-sm" />}
                    <page.Icon className="relative hidden size-4 min-[25rem]:block" weight={isActive ? "fill" : "bold"} aria-hidden="true" />
                    <span className="relative">{page.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/** Desktop: the contents list on the right, following the section being read. */
function Contents({ sections, active }: { sections: LegalSection[]; active: string | undefined }) {
  return (
    <nav aria-label="Sections" className="hidden lg:sticky lg:top-20 lg:block lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ListBulletsIcon className="size-4" aria-hidden="true" />
        On this page
      </p>
      <ol className="flex flex-col gap-0.5">
        {sections.map((section, index) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={active === section.id ? "location" : undefined}
              className="relative flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-[current=location]:text-foreground"
            >
              {active === section.id && <motion.span layoutId="legal-active" transition={SPRING} className="absolute inset-0 rounded-xl bg-accent" />}
              <span className={cn("relative flex size-6 shrink-0 items-center justify-center rounded-lg", TILES[index % TILES.length])}>
                <section.Icon className="size-3.5" weight="fill" aria-hidden="true" />
              </span>
              <span className="relative leading-snug">{section.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Phones and tablets: one menu to jump to a section. */
function JumpMenu({ sections, active, onJump }: { sections: LegalSection[]; active: string | undefined; onJump: (id: string) => void }) {
  return (
    <label className="relative mb-6 flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm focus-within:outline-2 focus-within:outline-ring lg:hidden">
      <ListBulletsIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">Jump to a section</span>
      <select
        value={active ?? sections[0]?.id}
        onChange={(event) => onJump(event.target.value)}
        className="min-w-0 flex-1 cursor-pointer appearance-none truncate bg-transparent pr-6 text-foreground outline-none"
      >
        {sections.map((section, index) => <option key={section.id} value={section.id}>{index + 1}. {section.title}</option>)}
      </select>
      <CaretDownIcon className="pointer-events-none absolute right-3 size-4 text-muted-foreground" aria-hidden="true" />
    </label>
  );
}

function SectionCard({ section, number, tile }: { section: LegalSection; number: number; tile: string }) {
  return (
    <motion.section
      id={section.id}
      aria-labelledby={`${section.id}-title`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={SPRING}
      className="scroll-mt-20 rounded-3xl border border-border bg-card p-5 text-card-foreground sm:p-6"
    >
      <div className="mb-4 flex items-center gap-3">
        <motion.span whileHover={{ rotate: -8, scale: 1.08 }} transition={SPRING} className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-sm", tile)}>
          <section.Icon className="size-6" weight="fill" aria-hidden="true" />
        </motion.span>
        <h2 id={`${section.id}-title`} className="min-w-0 text-lg font-semibold [overflow-wrap:anywhere] sm:text-xl">
          <span className="mr-2 text-muted-foreground">{number}.</span>{section.title}
        </h2>
      </div>
      <p className="mb-4 rounded-2xl bg-accent/60 px-4 py-3 text-sm font-medium leading-relaxed text-foreground">
        <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-primary">In short</span>
        {section.short}
      </p>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_li]:pl-1 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {section.body}
      </div>
    </motion.section>
  );
}

/** Highlights the section being read in the contents list and jump menu. */
function useActiveSection(sections: LegalSection[]) {
  const [active, setActive] = useState<string | undefined>(sections[0]?.id);
  useEffect(() => {
    const nodes = sections.map((section) => document.getElementById(section.id)).filter((node): node is HTMLElement => !!node);
    // The active section is the last whose top has passed the upper third, or the last one once the page bottoms out.
    const pick = () => {
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const passed = nodes.filter((node) => node.getBoundingClientRect().top < window.innerHeight * 0.35);
      setActive((atEnd ? nodes.at(-1) : passed.at(-1) ?? nodes[0])?.id);
    };
    pick();
    window.addEventListener("scroll", pick, { passive: true });
    return () => window.removeEventListener("scroll", pick);
  }, [sections]);
  return active;
}

/** Scrolls to a section (or the top with no id), smoothly unless reduced motion is on. */
function useJumpToSection() {
  const reduceMotion = useReducedMotion();
  const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";
  return (id?: string) => {
    if (!id) return window.scrollTo({ top: 0, behavior });
    document.getElementById(id)?.scrollIntoView({ block: "start", behavior });
  };
}

/** Deep links like /privacy#data-storage: the page renders after the browser looks for the anchor, so scroll once it exists. */
function useHashOnArrival(sections: LegalSection[]) {
  const { hash } = useLocation();
  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1));
    if (!id || !sections.some((section) => section.id === id)) return;
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [hash, sections]);
}
