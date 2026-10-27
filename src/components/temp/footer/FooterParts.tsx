import { Fragment, type MouseEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { ALL_PAGES } from "@/components/temp/header/header-mock";
import { INFO_DOCS, TILES, linkById, sectionAnchor, type InfoDoc, type LinkId } from "./footer-mock";
import { isCurrentLink, routeForLink, useStage } from "./footer-stage";

const WORDS = "the quick brown fox jumps over the lazy dog while the class races to type every word".split(" ");

/** A real link (right-click, hover URL) that moves the pretend browser instead of leaving the Lab. */
export function StageLink({ id, className, children, onPick }: { id: LinkId; className?: string; children?: ReactNode; onPick?: () => void }) {
  const { route, go } = useStage();
  const link = linkById(id);
  const current = isCurrentLink(route, id);
  const open = (event: MouseEvent) => {
    event.preventDefault();
    go(routeForLink(id));
    onPick?.();
  };
  return (
    <a href={link.path} onClick={open} aria-current={current ? "page" : undefined} className={cn("rounded-sm focus-visible:outline-2 focus-visible:outline-ring", className)}>
      {children ?? link.short}
    </a>
  );
}

/** Off-site links are inert in the Lab; the title says where they would go. */
export function OffsiteLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} onClick={(event) => event.preventDefault()} title={`Opens ${href.replace("https://", "")} (off in the Lab)`} className={cn("rounded-sm focus-visible:outline-2 focus-visible:outline-ring", className)}>
      {children}
    </a>
  );
}

/** The Home practice area. `typing` fills in a few words and hides the mode picker. */
export function MockTyping() {
  const { typing } = useStage();
  const typed = typing ? 7 : 0;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-5 py-10">
      <motion.div animate={{ opacity: typing ? 0 : 1 }} aria-hidden="true" className="flex gap-1.5 rounded-full bg-muted/60 p-1">
        {["time", "words", "quote"].map((mode, index) => (
          <span key={mode} className={cn("rounded-full px-3 py-1 text-xs text-muted-foreground", index === 0 && "bg-card text-foreground shadow-sm")}>{mode}</span>
        ))}
      </motion.div>
      <p className="max-w-xl text-center text-lg leading-relaxed @2xl:text-2xl">
        {WORDS.map((word, index) => (
          <span key={index} className={index < typed ? "text-foreground" : "text-muted-foreground/60"}>
            {index === typed && typing && <span aria-hidden="true" className="mr-0.5 inline-block h-5 w-0.5 translate-y-1 animate-pulse bg-primary" />}
            {word}{" "}
          </span>
        ))}
      </p>
      <span className="text-center text-xs text-muted-foreground">{typing ? "Mid-test: the header steps aside and the footer goes quiet." : "Turn on Typing above to see the footer go quiet."}</span>
    </div>
  );
}

/** Stand-in for pages this Lab doesn't draw (dock pages and the changelog), so their footer still shows. */
export function StagePlaceholder() {
  const { route } = useStage();
  const page = route.kind === "page" ? ALL_PAGES.find((item) => item.id === route.id) : undefined;
  const changelog = linkById("changelog");
  const Icon = page?.Icon ?? changelog.Icon;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className={cn("flex size-14 items-center justify-center rounded-2xl", page?.tile ?? changelog.tile)}>
        <Icon className="size-7" weight="fill" aria-hidden="true" />
      </span>
      <span className="text-lg font-semibold">{page?.label ?? changelog.label}</span>
      <span className="max-w-xs text-sm text-muted-foreground">Not drawn in this Lab. The footer below is what this page would get.</span>
    </div>
  );
}

/** The page's big icon, with the same pop-in as the Changelog hero. */
export function HeroTile({ doc, className }: { doc: InfoDoc; className?: string }) {
  return (
    <motion.span
      key={doc.id}
      initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={LAB_SPRING}
      className={cn("flex size-14 shrink-0 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg @2xl:size-16", className)}
    >
      <doc.Icon className="size-7 @2xl:size-8" weight="fill" aria-hidden="true" />
    </motion.span>
  );
}

/** Mock section cards: tile, title and the "In short" line from the real pages. */
export function SectionCards({ doc, compact = false }: { doc: InfoDoc; compact?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {doc.sections.map((section, index) => {
        const id = sectionAnchor(doc.id, section.id);
        return (
          <section key={id} id={id} aria-labelledby={`${id}-title`} className={cn("rounded-3xl border border-border bg-card text-card-foreground", compact ? "p-4" : "p-4 @2xl:p-5")}>
            <div className="mb-3 flex items-center gap-3">
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", TILES[index % TILES.length])}>
                <section.Icon className="size-5" weight="fill" aria-hidden="true" />
              </span>
              <h2 id={`${id}-title`} className="text-base font-semibold">
                <span className="mr-1.5 text-muted-foreground">{index + 1}.</span>{section.title}
              </h2>
            </div>
            <p className="mb-3 rounded-2xl bg-accent/60 px-3 py-2 text-sm leading-relaxed">
              <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-primary">In short</span>
              {section.short}
            </p>
            <div aria-hidden="true" className="flex flex-col gap-1.5">
              <span className="h-2 w-full rounded-full bg-muted" />
              <span className="h-2 w-11/12 rounded-full bg-muted" />
              <span className="h-2 w-2/3 rounded-full bg-muted" />
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** "Updated …" and reading time, as small chips. */
export function DocMeta({ doc, className }: { doc: InfoDoc; className?: string }) {
  return (
    <span className={cn("flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground", className)}>
      {doc.updated && <span className="rounded-full bg-muted px-2.5 py-1">Updated {doc.updated}</span>}
      <span className="rounded-full bg-muted px-2.5 py-1">{doc.sections.length} sections</span>
      <span className="rounded-full bg-muted px-2.5 py-1">About {doc.minutes} min</span>
    </span>
  );
}

/**
 * One concept's page for whatever the pretend browser shows: Home gets the practice area and the Home footer,
 * info pages get the concept's own layout, and every other page gets a stand-in plus the site footer.
 * Info pages remount per page unless `keepInfo` asks to keep them (e.g. tabs that animate between pages).
 */
export function ConceptPage({ homeFooter, siteFooter, info, keepInfo = false }: { homeFooter: ReactNode; siteFooter: ReactNode; info: (doc: InfoDoc) => ReactNode; keepInfo?: boolean }) {
  const { route } = useStage();
  if (route.kind === "home") return <><MockTyping />{homeFooter}</>;
  if (route.kind === "info") return <><Fragment key={keepInfo ? "info" : route.id}>{info(INFO_DOCS[route.id])}</Fragment>{siteFooter}</>;
  return <><StagePlaceholder />{siteFooter}</>;
}
