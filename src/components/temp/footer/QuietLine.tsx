import { useMemo } from "react";
import { motion } from "framer-motion";
import { ListBulletsIcon } from "@phosphor-icons/react";
import { ScrollRow } from "@/components/ui/scroll-row";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { FOOTER_LINKS, SITE, anchorsOf, type InfoDoc } from "./footer-mock";
import { useStage, useStageSections } from "./footer-stage";
import { ConceptPage, HeroTile, OffsiteLink, SectionCards, StageLink } from "./FooterParts";

/** 01: one centred line of links with dots between them; the dots drop away on phones so nothing dangles. */
export function QuietLine() {
  return <ConceptPage homeFooter={<QuietFooter home />} siteFooter={<QuietFooter />} info={(doc) => <QuietInfo doc={doc} />} />;
}

function QuietFooter({ home = false }: { home?: boolean }) {
  const { typing } = useStage();
  const quiet = home && typing;
  return (
    <footer className={cn("flex shrink-0 flex-col items-center gap-1.5 px-4 py-4 text-xs text-muted-foreground transition-opacity duration-500", quiet && "opacity-35 focus-within:opacity-100 hover:opacity-100")}>
      <nav aria-label="Site">
        {/* Wide: one row with dots. Narrow: no dots at all, just spacing, so a wrapped line never starts or ends with one. */}
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 @min-[30rem]:flex-nowrap @min-[30rem]:gap-x-0">
          {FOOTER_LINKS.map((link, index) => (
            <li key={link.id} className="flex items-center">
              {index > 0 && <span aria-hidden="true" className="hidden px-2.5 text-muted-foreground/50 @min-[30rem]:inline">·</span>}
              <StageLink id={link.id} className="whitespace-nowrap transition-colors hover:text-foreground aria-[current=page]:text-foreground">
                {link.id === "privacy" || link.id === "tos" ? <><span className="@min-[40rem]:hidden">{link.short}</span><span className="hidden @min-[40rem]:inline">{link.label}</span></> : link.short}
              </StageLink>
            </li>
          ))}
        </ul>
      </nav>
      {!home && (
        <p className="flex flex-wrap justify-center gap-x-3 text-[11px] text-muted-foreground/70">
          <span>TypeSetGo {SITE.version}</span>
          <span className="hidden @min-[30rem]:inline">{SITE.theme} theme</span>
          <OffsiteLink href={SITE.github} className="hover:text-foreground">GitHub</OffsiteLink>
        </p>
      )}
    </footer>
  );
}

/** Centred hero like the Changelog, then the contents as a sticky row of chips. */
function QuietInfo({ doc }: { doc: InfoDoc }) {
  const ids = useMemo(() => anchorsOf(doc), [doc]);
  const { active, jump } = useStageSections(ids, 64);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-8 pt-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <HeroTile doc={doc} />
        <h1 className="text-2xl font-bold text-primary @2xl:text-4xl">{doc.title}</h1>
        {doc.updated && <p className="text-xs text-muted-foreground">Last updated {doc.updated}</p>}
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{doc.intro}</p>
      </header>

      <div className="sticky top-0 z-10 -mx-4 mb-4 mt-5 flex items-center gap-2 bg-background/90 px-4 py-2 backdrop-blur">
        <ListBulletsIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <ScrollRow aria-label="On this page" className="gap-1">
          {doc.sections.map((section, index) => {
            const current = active === ids[index];
            return (
              <button
                key={section.id}
                type="button"
                aria-current={current ? "location" : undefined}
                onClick={() => jump(ids[index])}
                className="relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-[current=location]:text-primary-foreground"
              >
                {current && <motion.span layoutId="quiet-line-chip" transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-primary" />}
                <section.Icon className="relative size-3.5" weight="fill" aria-hidden="true" />
                <span className="relative">{section.title}</span>
              </button>
            );
          })}
        </ScrollRow>
      </div>

      <SectionCards doc={doc} />
    </main>
  );
}
