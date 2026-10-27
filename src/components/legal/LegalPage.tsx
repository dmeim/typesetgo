import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, ListBulletsIcon, SparkleIcon, type Icon } from "@phosphor-icons/react";
import { useTheme } from "@/hooks/useTheme";
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

/** Privacy, Terms and About share this layout: a contents list, then one card per section with a short version on top. */
export function LegalPage({ title, updated, intro, note = "Each section starts with a short version in plain words. The full text under it is what counts.", Icon, sections, other }: LegalPageProps) {
  useTheme();
  const active = useActiveSection(sections);

  return (
    <div className="min-h-[100dvh] bg-background px-4 py-10 font-mono text-foreground transition-colors duration-300 sm:py-12">
      <div className="mx-auto w-full max-w-5xl animate-fade-in">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
          Back to Homepage
        </Link>

        <header className="mb-10 flex flex-col items-center gap-4 text-center">
          <motion.span
            initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={SPRING}
            className="flex size-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg"
          >
            <Icon className="size-8" weight="fill" aria-hidden="true" />
          </motion.span>
          <h1 className="text-3xl font-bold text-primary sm:text-4xl">{title}</h1>
          {updated && <p className="text-sm text-muted-foreground">Last updated: {updated}</p>}
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{intro}</p>
          <p className="inline-flex max-w-2xl items-start gap-2 rounded-2xl bg-accent/60 px-4 py-2.5 text-left text-xs leading-relaxed text-foreground">
            <SparkleIcon className="mt-0.5 size-4 shrink-0 text-primary" weight="fill" aria-hidden="true" />
            {note}
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <nav aria-label="Sections" className="lg:sticky lg:top-6 lg:self-start">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ListBulletsIcon className="size-4" aria-hidden="true" />
              On this page
            </p>
            <ol className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    aria-current={active === section.id ? "location" : undefined}
                    className="relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground aria-[current=location]:text-foreground"
                  >
                    {active === section.id && <motion.span layoutId="legal-active" transition={SPRING} className="absolute inset-0 rounded-xl bg-accent" />}
                    <span className={cn("relative flex size-6 shrink-0 items-center justify-center rounded-lg", TILES[index % TILES.length])}>
                      <section.Icon className="size-3.5" weight="fill" aria-hidden="true" />
                    </span>
                    <span className="relative">{section.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex min-w-0 flex-col gap-4">
            {sections.map((section, index) => (
              <SectionCard key={section.id} section={section} number={index + 1} tile={TILES[index % TILES.length]} />
            ))}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-dashed border-border p-5 text-sm">
              <a href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex items-center gap-2 text-muted-foreground transition hover:text-foreground">
                <ArrowUpIcon className="size-4" aria-hidden="true" />
                Back to top
              </a>
              <Link to={other.to} className="inline-flex items-center gap-2 font-medium text-primary hover:underline">
                {other.label}
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
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
      className="scroll-mt-6 rounded-3xl border border-border bg-card p-5 text-card-foreground sm:p-6"
    >
      <div className="mb-4 flex items-center gap-3">
        <motion.span whileHover={{ rotate: -8, scale: 1.08 }} transition={SPRING} className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-sm", tile)}>
          <section.Icon className="size-6" weight="fill" aria-hidden="true" />
        </motion.span>
        <h2 id={`${section.id}-title`} className="text-lg font-semibold sm:text-xl">
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

/** Highlights the section being read in the contents list. */
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
    window.addEventListener("scroll", pick, { passive: true });
    return () => window.removeEventListener("scroll", pick);
  }, [sections]);
  return active;
}
