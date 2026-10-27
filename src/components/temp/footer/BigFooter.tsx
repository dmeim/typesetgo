import { useMemo, type ReactNode } from "react";
import { motion } from "framer-motion";
import { BugIcon, GithubLogoIcon, PaletteIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { NAV, LEADERBOARD, type NavItem } from "@/components/temp/header/header-mock";
import { FOOTER_LINKS, INFO_DOCS, INFO_ORDER, SITE, anchorsOf, type InfoDoc } from "./footer-mock";
import { useStage, useStageSections } from "./footer-stage";
import { ConceptPage, DocMeta, HeroTile, OffsiteLink, SectionCards, StageLink } from "./FooterParts";

const COLUMN_LINK = "w-fit text-sm text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-foreground";

/** 04: a full footer with columns on every page but Home, where a single small line does the job. */
export function BigFooter() {
  return <ConceptPage homeFooter={<TinyFooter />} siteFooter={<FullFooter />} info={(doc) => <BannerInfo doc={doc} />} />;
}

function TinyFooter() {
  const { typing } = useStage();
  return (
    <footer className={cn("flex shrink-0 flex-col-reverse items-center gap-1.5 px-4 py-3 text-xs text-muted-foreground transition-opacity duration-500 @2xl:flex-row @2xl:justify-between @2xl:px-6", typing && "opacity-40 focus-within:opacity-100 hover:opacity-100")}>
      <span className={cn("whitespace-nowrap transition-opacity duration-500", typing && "@2xl:opacity-0")}>© {SITE.year} TypeSetGo · {SITE.version}</span>
      <nav aria-label="Site" className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {FOOTER_LINKS.map((link) => (
          <StageLink key={link.id} id={link.id} className="whitespace-nowrap hover:text-foreground">{link.short}</StageLink>
        ))}
      </nav>
    </footer>
  );
}

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function PageButton({ item }: { item: NavItem }) {
  const { go } = useStage();
  return (
    <button type="button" disabled={item.soon} onClick={() => go(item.id === "type" ? { kind: "home" } : { kind: "page", id: item.id })} className={cn(COLUMN_LINK, "flex items-center gap-1.5 text-left disabled:cursor-not-allowed disabled:hover:text-muted-foreground")}>
      {item.label}
      {item.soon && <span className="rounded-full bg-muted px-1.5 text-[10px]">Soon</span>}
    </button>
  );
}

function FullFooter() {
  return (
    <footer className="mt-auto shrink-0 border-t border-border bg-card/40 px-5 pb-5 pt-8">
      <div className="mx-auto grid max-w-5xl gap-8 @3xl:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
        <div className="flex flex-col items-start gap-3">
          <img src="/assets/Banner-Color.svg" alt="TypeSetGo" className="h-auto w-32" />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">Typing practice for classrooms, races with friends, and everyone in between.</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <PaletteIcon className="size-3.5" aria-hidden="true" />{SITE.theme} theme
          </span>
        </div>
        <div className="grid grid-cols-2 gap-6 @md:grid-cols-3 @3xl:contents">
          <Column title="Practice">
            {[...NAV, LEADERBOARD].map((item) => <PageButton key={item.id} item={item} />)}
          </Column>
          <Column title="Info">
            {FOOTER_LINKS.map((link) => <StageLink key={link.id} id={link.id} className={COLUMN_LINK}>{link.label}</StageLink>)}
          </Column>
          <Column title="Project">
            <OffsiteLink href={SITE.github} className={cn(COLUMN_LINK, "inline-flex items-center gap-1.5")}><GithubLogoIcon className="size-4 shrink-0" aria-hidden="true" />GitHub</OffsiteLink>
            <OffsiteLink href={SITE.issues} className={cn(COLUMN_LINK, "inline-flex items-center gap-1.5")}><BugIcon className="size-4 shrink-0" aria-hidden="true" />Report a problem</OffsiteLink>
          </Column>
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-5xl flex-col items-center gap-1 border-t border-border pt-4 text-xs text-muted-foreground @2xl:flex-row @2xl:justify-between">
        <span>© {SITE.year} TypeSetGo</span>
        <span>{SITE.version}</span>
      </div>
    </footer>
  );
}

/** A banner card for the hero, the three pages as chips inside it, and a numbered contents rail beside the sections. */
function BannerInfo({ doc }: { doc: InfoDoc }) {
  const ids = useMemo(() => anchorsOf(doc), [doc]);
  const { active, jump } = useStageSections(ids);
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pb-10 pt-5">
      <header className="relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-border bg-card p-5 text-card-foreground @2xl:p-8">
        <doc.Icon aria-hidden="true" weight="regular" className="pointer-events-none absolute -bottom-12 -right-10 size-56 text-primary opacity-10" />
        <nav aria-label="Info pages" className="relative flex flex-wrap gap-1">
          {INFO_ORDER.map((id) => (
            <StageLink key={id} id={id} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground">
              {INFO_DOCS[id].tab}
            </StageLink>
          ))}
        </nav>
        <div className="relative flex flex-col gap-3 @2xl:flex-row @2xl:items-center @2xl:gap-5">
          <HeroTile doc={doc} />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-primary @2xl:text-4xl">{doc.title}</h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{doc.intro}</p>
          </div>
        </div>
        <DocMeta doc={doc} className="relative" />
      </header>

      <div className="grid gap-6 @3xl:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="On this page" className="@3xl:sticky @3xl:top-4 @3xl:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">On this page</p>
          <ol className="grid grid-cols-1 gap-x-4 @md:grid-cols-2 @3xl:grid-cols-1 @3xl:border-l @3xl:border-border">
            {doc.sections.map((section, index) => {
              const current = active === ids[index];
              return (
                <li key={section.id} className="relative">
                  {current && <motion.span layoutId="big-footer-rail" transition={LAB_SPRING} className="absolute inset-y-1 -left-px hidden w-0.5 rounded-full bg-primary @3xl:block" />}
                  <button
                    type="button"
                    aria-current={current ? "location" : undefined}
                    onClick={() => jump(ids[index])}
                    className="flex w-full items-baseline gap-2 rounded-lg px-1 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-[current=location]:text-foreground @3xl:pl-4"
                  >
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                    <span className="leading-snug">{section.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        <SectionCards doc={doc} />
      </div>
    </main>
  );
}
