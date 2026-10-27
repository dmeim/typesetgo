import { useMemo, type ReactNode } from "react";
import { AnimatePresence, motion, useScroll } from "framer-motion";
import { BugIcon, CaretRightIcon, GithubLogoIcon, InfoIcon, ListBulletsIcon, PaletteIcon, XIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { useMenus } from "@/components/temp/header/header-utils";
import { FOOTER_LINKS, SITE, TILES, anchorsOf, type InfoDoc } from "./footer-mock";
import { useStage, useStageSections } from "./footer-stage";
import { ConceptPage, DocMeta, HeroTile, OffsiteLink, SectionCards, StageLink } from "./FooterParts";

/** 03: Privacy and Terms stay in the corner with an "i" button that opens everything else; info pages read like an article. */
export function InfoButton() {
  return <ConceptPage homeFooter={<CornerFooter home />} siteFooter={<CornerFooter />} info={(doc) => <ReadingInfo doc={doc} />} />;
}

/** Grows up out of its button. Place it inside a `relative` wrapper. */
function PopUp({ open, align, children }: { open: boolean; align: "left" | "right"; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 6 }}
          transition={LAB_SPRING}
          style={{ transformOrigin: align === "right" ? "bottom right" : "bottom left" }}
          className={cn("absolute bottom-full z-30 mb-2 w-64 max-w-[calc(100cqw-1.5rem)] rounded-3xl border border-border bg-popover p-2 text-popover-foreground shadow-xl", align === "right" ? "right-0" : "left-0")}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CornerFooter({ home = false }: { home?: boolean }) {
  const { typing } = useStage();
  const menus = useMenus<"more">();
  const open = menus.open === "more";
  const quiet = home && typing && !open;
  const row = "flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm hover:bg-accent";

  return (
    <footer className="pointer-events-none sticky bottom-0 z-30 mt-auto flex shrink-0 justify-end px-3 pb-3 pt-2">
      <div
        {...menus.root}
        className={cn(
          "pointer-events-auto relative flex items-center gap-1 rounded-full border border-border bg-card/85 py-1 pl-3.5 pr-1 text-xs text-muted-foreground shadow-md backdrop-blur transition-opacity duration-500",
          quiet && "opacity-40 focus-within:opacity-100 hover:opacity-100",
        )}
      >
        {/* Two short links in a row that never wraps, so the dot always sits between them. */}
        <nav aria-label="Legal" className="flex items-center whitespace-nowrap">
          <StageLink id="privacy" className="hover:text-foreground aria-[current=page]:text-foreground">Privacy</StageLink>
          <span aria-hidden="true" className="px-1.5 text-muted-foreground/50">·</span>
          <StageLink id="tos" className="hover:text-foreground aria-[current=page]:text-foreground">Terms</StageLink>
        </nav>
        <button
          type="button"
          onClick={() => menus.toggle("more")}
          aria-expanded={open}
          aria-label={open ? "Close the TypeSetGo menu" : "About TypeSetGo, what's new and more"}
          className="relative ml-1 flex size-7 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring aria-expanded:bg-primary aria-expanded:text-primary-foreground"
        >
          {open ? <XIcon className="size-3.5" aria-hidden="true" /> : <InfoIcon className="size-4" weight="bold" aria-hidden="true" />}
          {!open && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-(--accent-emphasis) ring-2 ring-card" />}
        </button>

        <PopUp open={open} align="right">
          <div className="flex items-center gap-3 px-2 pb-2 pt-1">
            <img src="/assets/Icon-Color.svg" alt="" className="size-8" />
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">TypeSetGo</span>
              <span className="text-[11px] text-muted-foreground">{SITE.version}</span>
            </span>
          </div>
          <nav aria-label="More" className="flex flex-col gap-0.5">
            {FOOTER_LINKS.map((link) => (
              <StageLink key={link.id} id={link.id} onPick={menus.close} className={cn(row, "text-foreground aria-[current=page]:bg-accent")}>
                <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-lg", link.tile)}>
                  <link.Icon className="size-3.5" weight="fill" aria-hidden="true" />
                </span>
                <span className="flex-1">{link.label}</span>
                {link.id === "changelog" && <span className="rounded-full bg-(--accent-emphasis) px-1.5 py-0.5 text-[10px] font-semibold text-background">New</span>}
              </StageLink>
            ))}
          </nav>
          <div className="mt-1 flex flex-col gap-0.5 border-t border-border pt-1">
            <span className={cn(row, "text-muted-foreground hover:bg-transparent")}>
              <PaletteIcon className="size-4" aria-hidden="true" />Theme: <span className="text-foreground">{SITE.theme}</span>
            </span>
            <OffsiteLink href={SITE.github} className={cn(row, "text-muted-foreground hover:text-foreground")}>
              <GithubLogoIcon className="size-4" aria-hidden="true" />Source on GitHub
            </OffsiteLink>
            <OffsiteLink href={SITE.issues} className={cn(row, "text-muted-foreground hover:text-foreground")}>
              <BugIcon className="size-4 shrink-0" aria-hidden="true" />Report a problem
            </OffsiteLink>
          </div>
        </PopUp>
      </div>
    </footer>
  );
}

/** One readable column with a reading bar on top and the contents behind a corner button. */
function ReadingInfo({ doc }: { doc: InfoDoc }) {
  const { scroller } = useStage();
  const { scrollYProgress } = useScroll({ container: scroller });
  const ids = useMemo(() => anchorsOf(doc), [doc]);
  const { active, jump } = useStageSections(ids, 20);
  const menus = useMenus<"contents">();
  const open = menus.open === "contents";
  const activeIndex = Math.max(0, ids.indexOf(active ?? ""));

  return (
    <main className="relative flex w-full flex-1 flex-col">
      <motion.div aria-hidden="true" style={{ scaleX: scrollYProgress }} className="sticky top-0 z-20 h-1 origin-left bg-primary" />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pb-6 pt-5">
        <header className="flex flex-col gap-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
            <StageLink id="about" className="hover:text-foreground">Info</StageLink>
            <CaretRightIcon className="size-3" aria-hidden="true" />
            <span aria-current="page" className="text-foreground">{doc.tab}</span>
          </nav>
          <div className="flex items-start gap-4">
            <HeroTile doc={doc} />
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="text-2xl font-bold leading-tight text-primary @2xl:text-3xl">{doc.title}</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">{doc.intro}</p>
            </div>
          </div>
          <DocMeta doc={doc} />
        </header>

        <SectionCards doc={doc} compact />

        {/* Stays at the bottom left while you read, beside the corner links. */}
        <div {...menus.root} className="sticky bottom-3 z-20 mr-auto">
          <button
            type="button"
            onClick={() => menus.toggle("contents")}
            aria-expanded={open}
            className="flex h-9 items-center gap-2 rounded-full border border-border bg-card/85 px-3 text-xs shadow-md backdrop-blur hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ListBulletsIcon className="size-4" aria-hidden="true" />
            Contents
            <span className="text-muted-foreground">{activeIndex + 1}/{ids.length}</span>
          </button>
          <PopUp open={open} align="left">
            <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">On this page</p>
            <ol className="flex flex-col gap-0.5">
              {doc.sections.map((section, index) => (
                <li key={section.id}>
                  <button
                    type="button"
                    aria-current={active === ids[index] ? "location" : undefined}
                    onClick={() => { jump(ids[index]); menus.close(); }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground aria-[current=location]:bg-accent aria-[current=location]:text-foreground"
                  >
                    <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md", TILES[index % TILES.length])}>
                      <section.Icon className="size-3" weight="fill" aria-hidden="true" />
                    </span>
                    <span className="leading-snug">{section.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          </PopUp>
        </div>
      </div>
    </main>
  );
}
