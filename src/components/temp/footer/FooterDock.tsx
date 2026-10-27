import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRightIcon, CaretDownIcon, GithubLogoIcon } from "@phosphor-icons/react";
import { DockDivider } from "@/components/layout/header/DockParts";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { FOOTER_LINKS, INFO_DOCS, INFO_ORDER, SITE, TILES, anchorsOf, linkById, type InfoDoc } from "./footer-mock";
import { isCurrentLink, useStage, useStageSections } from "./footer-stage";
import { ConceptPage, DocMeta, HeroTile, OffsiteLink, SectionCards, StageLink } from "./FooterParts";

/** 02: a small pill at the bottom that mirrors the Dock at the top, with a Profile-style sidebar on info pages. */
export function FooterDock() {
  return <ConceptPage homeFooter={<DockFooter home />} siteFooter={<DockFooter />} info={(doc) => <SidebarInfo doc={doc} />} />;
}

function DockFooter({ home = false }: { home?: boolean }) {
  const { route, typing } = useStage();
  const quiet = home && typing;
  return (
    <footer className="flex shrink-0 justify-center px-3 pb-4 pt-3">
      {/* While typing the pill loses its card and sinks a little; hover or Tab brings it back. */}
      <div
        className={cn(
          "flex items-center gap-0.5 rounded-full border p-1.5 transition-all duration-500 focus-within:translate-y-0 focus-within:opacity-100 hover:translate-y-0 hover:opacity-100",
          quiet ? "translate-y-1.5 border-transparent bg-transparent opacity-45 shadow-none" : "border-border bg-card/80 shadow-lg backdrop-blur",
        )}
      >
        <nav aria-label="Site" className="flex items-center gap-0.5">
          {FOOTER_LINKS.map((link) => {
            const current = isCurrentLink(route, link.id);
            return (
              <StageLink
                key={link.id}
                id={link.id}
                className={cn(
                  "group relative flex flex-col items-center gap-0.5 rounded-full px-2 py-1 text-[10px] font-medium @min-[30rem]:h-9 @min-[30rem]:flex-row @min-[30rem]:gap-1.5 @min-[30rem]:px-3 @min-[30rem]:py-0 @min-[30rem]:text-xs",
                  current ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {current && <motion.span layoutId="footer-dock-active" transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-primary shadow-sm @max-[30rem]:rounded-2xl" />}
                <motion.span whileHover={{ y: -2, scale: 1.15 }} transition={LAB_SPRING} className="relative flex">
                  <link.Icon className="size-4" weight={current ? "fill" : "bold"} aria-hidden="true" />
                </motion.span>
                <span className="relative whitespace-nowrap">{link.short}</span>
              </StageLink>
            );
          })}
        </nav>
        {!home && (
          <>
            <DockDivider className="mx-1 hidden h-5 @min-[22rem]:block" />
            <span className="hidden whitespace-nowrap px-2 text-[11px] text-muted-foreground @min-[36rem]:inline">{SITE.version}</span>
            <OffsiteLink href={SITE.github} className="hidden size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground @min-[22rem]:flex">
              <GithubLogoIcon className="size-4" aria-hidden="true" />
              <span className="sr-only">TypeSetGo on GitHub</span>
            </OffsiteLink>
          </>
        )}
      </div>
    </footer>
  );
}

/** A sidebar like Profile's: the three info pages as tiles, the open page's sections under it, and What's new pinned at the bottom. */
function SidebarInfo({ doc }: { doc: InfoDoc }) {
  const ids = useMemo(() => anchorsOf(doc), [doc]);
  const { active, jump } = useStageSections(ids);
  const [contentsOpen, setContentsOpen] = useState(false);
  const changelog = linkById("changelog");

  const sectionList = (onPick?: () => void) => (
    <ol className="flex flex-col gap-0.5">
      {doc.sections.map((section, index) => {
        const current = active === ids[index];
        return (
          <li key={section.id}>
            <button
              type="button"
              aria-current={current ? "location" : undefined}
              onClick={() => { jump(ids[index]); onPick?.(); }}
              className="relative flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-[current=location]:text-foreground"
            >
              {current && <motion.span layoutId={`footer-dock-section-${onPick ? "phone" : "wide"}`} transition={LAB_SPRING} className="absolute inset-0 rounded-xl bg-accent" />}
              <span className={cn("relative flex size-5 shrink-0 items-center justify-center rounded-md", TILES[index % TILES.length])}>
                <section.Icon className="size-3" weight="fill" aria-hidden="true" />
              </span>
              <span className="relative leading-snug">{section.title}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className="flex w-full flex-1 flex-col @3xl:flex-row">
      <aside aria-label="Info" className="flex shrink-0 flex-col gap-4 px-4 pt-5 @3xl:sticky @3xl:top-0 @3xl:max-h-[36rem] @3xl:w-64 @3xl:self-start @3xl:overflow-y-auto @3xl:border-r @3xl:border-border @3xl:bg-card/40 @3xl:pb-5">
        <p className="hidden px-2 text-2xl font-bold @3xl:block">Info</p>
        <nav aria-label="Info pages" className="grid grid-cols-3 gap-1 @3xl:flex @3xl:flex-col @3xl:gap-0.5">
          {INFO_ORDER.map((id) => {
            const item = INFO_DOCS[id];
            const link = linkById(id);
            const current = id === doc.id;
            return (
              <div key={id} className="flex flex-col">
                <StageLink
                  id={id}
                  className="relative flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-center text-xs transition-colors @3xl:flex-row @3xl:gap-3 @3xl:rounded-xl @3xl:text-left @3xl:text-sm"
                >
                  {current && <motion.span layoutId="footer-dock-page" transition={LAB_SPRING} className="absolute inset-0 rounded-2xl bg-accent @3xl:rounded-xl" />}
                  <span className={cn("relative flex size-8 shrink-0 items-center justify-center rounded-lg", link.tile)}>
                    <item.Icon className="size-[18px]" weight="fill" aria-hidden="true" />
                  </span>
                  <span className={cn("relative", current ? "font-medium text-foreground" : "text-muted-foreground")}>{item.tab}</span>
                </StageLink>
                {current && <div className="hidden pb-2 pl-5 pt-1 @3xl:block">{sectionList()}</div>}
              </div>
            );
          })}
        </nav>
        <div className="mt-auto hidden border-t border-border pt-3 @3xl:block">
          <StageLink id="changelog" className="group flex items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-accent">
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", changelog.tile)}>
              <changelog.Icon className="size-[18px]" weight="fill" aria-hidden="true" />
            </span>
            <span className="flex-1">Changelog</span>
            <ArrowUpRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          </StageLink>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-5 px-4 pb-8 pt-5 @3xl:px-8">
        <header className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <HeroTile doc={doc} className="size-12 rounded-2xl @2xl:size-12 [&_svg]:size-6" />
            <h1 className="text-2xl font-bold text-primary @2xl:text-3xl">{doc.title}</h1>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{doc.intro}</p>
          <DocMeta doc={doc} />
        </header>

        {/* Phones: the sections fold into one button instead of a sidebar. */}
        <div className="rounded-2xl border border-border bg-card/60 @3xl:hidden">
          <button type="button" aria-expanded={contentsOpen} onClick={() => setContentsOpen((value) => !value)} className="flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-ring">
            <span>On this page <span className="text-muted-foreground">· {doc.sections.length}</span></span>
            <CaretDownIcon className={cn("size-4 text-muted-foreground transition-transform", contentsOpen && "rotate-180")} aria-hidden="true" />
          </button>
          <AnimatePresence initial={false}>
            {contentsOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={LAB_SPRING} className="overflow-hidden px-1.5 pb-1.5">
                {sectionList(() => setContentsOpen(false))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <SectionCards doc={doc} />
      </main>
    </div>
  );
}
