import { useMemo, useRef, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CaretDownIcon, ListBulletsIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { FOOTER_LINKS, INFO_DOCS, INFO_ORDER, SITE, TILES, anchorsOf, type InfoDoc, type InfoId } from "./footer-mock";
import { useStage, useStageSections } from "./footer-stage";
import { ConceptPage, StageLink } from "./FooterParts";

const PANEL_ID = "footer-lab-info-panel";

/** 05: a thin status bar along the bottom edge, and About, Privacy and Terms as tabs on one page. */
export function InfoTabs() {
  return <ConceptPage homeFooter={<StatusBar home />} siteFooter={<StatusBar />} info={(doc) => <TabbedInfo doc={doc} />} keepInfo />;
}

function StatusBar({ home = false }: { home?: boolean }) {
  const { typing } = useStage();
  const quiet = home && typing;
  return (
    <footer className={cn("group/status mt-auto flex shrink-0 items-center justify-center gap-3 border-t px-3 py-1.5 text-[11px] text-muted-foreground transition-colors duration-500 @2xl:justify-between", quiet ? "border-transparent" : "border-border bg-muted/40")}>
      {/* Version and theme step out while you type; the links stay. */}
      <div className={cn("hidden min-w-0 items-center gap-3 transition-opacity duration-500 @2xl:flex", quiet && "opacity-0 group-focus-within/status:opacity-100 group-hover/status:opacity-100")}>
        <span className="whitespace-nowrap">TypeSetGo {SITE.version}</span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span aria-hidden="true" className="flex -space-x-1">
            <span className="size-2.5 rounded-full bg-primary ring-1 ring-background" />
            <span className="size-2.5 rounded-full bg-(--accent-emphasis) ring-1 ring-background" />
            <span className="size-2.5 rounded-full bg-success ring-1 ring-background" />
          </span>
          {SITE.theme}
        </span>
      </div>
      <nav aria-label="Site" className={cn("flex flex-wrap justify-center gap-x-4 gap-y-1 transition-opacity duration-500", quiet && "opacity-50 focus-within:opacity-100 hover:opacity-100")}>
        {FOOTER_LINKS.map((link) => (
          <StageLink key={link.id} id={link.id} className="inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground aria-[current=page]:text-foreground">
            {link.id === "changelog" && <span aria-hidden="true" className="size-1.5 rounded-full bg-(--accent-emphasis)" />}
            {link.short}
          </StageLink>
        ))}
      </nav>
    </footer>
  );
}

/** The three pages share one header and swap in place; each keeps its own address. */
function TabbedInfo({ doc }: { doc: InfoDoc }) {
  const { go } = useStage();
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({});
  const ids = useMemo(() => anchorsOf(doc), [doc]);
  const { active, jump } = useStageSections(ids, 64);

  const pick = (id: InfoId) => {
    go({ kind: "info", id });
    tabs.current[id]?.focus();
  };
  const onKey = (event: KeyboardEvent) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = INFO_ORDER.indexOf(doc.id);
    pick(INFO_ORDER[(index + step + INFO_ORDER.length) % INFO_ORDER.length]);
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-10">
      <div className="sticky top-0 z-10 -mx-4 flex justify-center bg-background/90 px-4 py-2.5 backdrop-blur">
        <div role="tablist" aria-label="Info pages" onKeyDown={onKey} className="flex gap-1 rounded-full bg-muted/60 p-1">
          {INFO_ORDER.map((id) => {
            const item = INFO_DOCS[id];
            const selected = id === doc.id;
            return (
              <button
                key={id}
                ref={(node) => { tabs.current[id] = node; }}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={PANEL_ID}
                tabIndex={selected ? 0 : -1}
                onClick={() => pick(id)}
                className={cn("relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring @md:px-4 @md:text-sm", selected ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {selected && <motion.span layoutId="info-tabs-pill" transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-primary shadow-sm" />}
                <item.Icon className="relative hidden size-4 @min-[20rem]:block" weight={selected ? "fill" : "bold"} aria-hidden="true" />
                <span className="relative">{item.tab}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={doc.id}
          id={PANEL_ID}
          role="tabpanel"
          aria-label={doc.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col gap-6 pt-4"
        >
          <header className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold text-primary @2xl:text-3xl">{doc.title}</h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{doc.intro}</p>
            <p className="text-xs text-muted-foreground">{doc.updated ? `Last updated ${doc.updated} · ` : ""}About {doc.minutes} min to read</p>
          </header>

          {/* Phones: a plain menu to jump to a section. */}
          <label className="relative flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm @3xl:hidden">
            <ListBulletsIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Jump to a section</span>
            <select value={active} onChange={(event) => jump(event.target.value)} className="min-w-0 flex-1 appearance-none bg-transparent pr-6 text-foreground outline-none">
              {doc.sections.map((section, index) => <option key={section.id} value={ids[index]}>{index + 1}. {section.title}</option>)}
            </select>
            <CaretDownIcon className="pointer-events-none absolute right-3 size-4 text-muted-foreground" aria-hidden="true" />
          </label>

          <div className="grid gap-8 @3xl:grid-cols-[minmax(0,1fr)_14rem]">
            <TabSections doc={doc} />
            <nav aria-label="On this page" className="hidden @3xl:sticky @3xl:top-16 @3xl:block @3xl:self-start">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ListBulletsIcon className="size-4" aria-hidden="true" />On this page
              </p>
              <ol className="flex flex-col gap-0.5">
                {doc.sections.map((section, index) => {
                  const current = active === ids[index];
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        aria-current={current ? "location" : undefined}
                        onClick={() => jump(ids[index])}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-[current=location]:text-foreground"
                      >
                        <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full transition-colors", current ? "bg-primary" : "bg-border")} />
                        <span className="leading-snug">{section.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

/** Flatter cards than the other concepts: a coloured edge instead of a big tile. */
function TabSections({ doc }: { doc: InfoDoc }) {
  const ids = anchorsOf(doc);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {doc.sections.map((section, index) => (
        <section key={ids[index]} id={ids[index]} aria-labelledby={`${ids[index]}-title`} className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 pl-5 text-card-foreground">
          <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", TILES[index % TILES.length])} />
          <h2 id={`${ids[index]}-title`} className="mb-2 flex items-center gap-2 text-base font-semibold">
            <section.Icon className="size-4 shrink-0 text-primary" weight="fill" aria-hidden="true" />
            {section.title}
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-foreground">{section.short}</p>
          <div aria-hidden="true" className="flex flex-col gap-1.5">
            <span className="h-2 w-full rounded-full bg-muted" />
            <span className="h-2 w-3/4 rounded-full bg-muted" />
          </div>
        </section>
      ))}
      <p className="text-center text-xs text-muted-foreground">
        Also read{" "}
        {INFO_ORDER.filter((id) => id !== doc.id).map((id, index) => (
          <span key={id}>{index > 0 && " and "}<StageLink id={id} className="text-primary hover:underline">{INFO_DOCS[id].title}</StageLink></span>
        ))}
      </p>
    </div>
  );
}
