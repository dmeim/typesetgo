import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpIcon, CalendarBlankIcon, ListBulletsIcon, MegaphoneIcon, UserCircleIcon } from "@phosphor-icons/react";
import Header from "@/components/layout/Header";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ChangelogCard } from "@/components/changelog/ChangelogCard";
import { CHANGELOG_SPRING, KIND_STYLE } from "@/components/changelog/changelog-style";
import { CHANGE_KIND_LABELS, CHANGELOG, formatChangelogDay, groupChangelogByDay, type ChangeKind } from "@/lib/changelog";
import { cn } from "@/lib/utils";

type Filter = "all" | ChangeKind;

const FILTERS: Filter[] = ["all", "new", "improved", "fixed"];

function countFor(filter: Filter) {
  return filter === "all" ? CHANGELOG.length : CHANGELOG.filter((entry) => entry.kind === filter).length;
}

/** Highlights the entry being read in the contents list. */
function useActiveEntry(ids: string[]) {
  const [active, setActive] = useState<string | undefined>(ids[0]);
  useEffect(() => {
    const pick = () => {
      const nodes = ids.map((id) => document.getElementById(id)).filter((node): node is HTMLElement => !!node);
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const passed = nodes.filter((node) => node.getBoundingClientRect().top < window.innerHeight * 0.35);
      setActive((atEnd ? nodes.at(-1) : passed.at(-1) ?? nodes[0])?.id);
    };
    pick();
    window.addEventListener("scroll", pick, { passive: true });
    return () => window.removeEventListener("scroll", pick);
  }, [ids]);
  return active;
}

function FilterPills({ value, onChange }: { value: Filter; onChange: (value: Filter) => void }) {
  return (
    <div role="group" aria-label="Show changes" className="flex flex-wrap justify-center gap-1 rounded-full bg-muted/60 p-1">
      {FILTERS.filter((filter) => countFor(filter) > 0).map((filter) => {
        const selected = value === filter;
        return (
          <button
            key={filter}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(filter)}
            className={cn("relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring", selected ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {selected && <motion.span layoutId="changelog-filter" transition={CHANGELOG_SPRING} className="absolute inset-0 rounded-full bg-primary" />}
            <span className="relative">{filter === "all" ? "Everything" : CHANGE_KIND_LABELS[filter]} <span className="opacity-70">{countFor(filter)}</span></span>
          </button>
        );
      })}
    </div>
  );
}

/** What changed on TypeSetGo, newest first, with screenshots and working demos. */
export default function Changelog() {
  const [filter, setFilter] = useState<Filter>("all");
  const days = useMemo(() => groupChangelogByDay(filter === "all" ? CHANGELOG : CHANGELOG.filter((entry) => entry.kind === filter)), [filter]);
  const ids = useMemo(() => days.flatMap((day) => day.entries.map((entry) => entry.id)), [days]);
  const active = useActiveEntry(ids);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background font-mono text-foreground transition-colors duration-300">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-16">
        <header className="mb-10 flex flex-col items-center gap-4 text-center">
          <motion.span
            initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={CHANGELOG_SPRING}
            className="flex size-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg"
          >
            <MegaphoneIcon className="size-8" weight="fill" aria-hidden="true" />
          </motion.span>
          <h1 className="text-3xl font-bold text-primary sm:text-4xl">What's new</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Everything that changed on TypeSetGo, newest first. Look at the screenshots, or press <strong className="text-foreground">Try it here</strong> to play with a working copy right on this page.
          </p>
          <FilterPills value={filter} onChange={setFilter} />
        </header>

        <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <nav aria-label="Changes" className="hidden lg:sticky lg:top-6 lg:block lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ListBulletsIcon className="size-4" aria-hidden="true" />
              On this page
            </p>
            {days.map((day) => (
              <div key={day.date} className="mb-4">
                <p className="mb-1 px-2.5 text-xs text-muted-foreground">{formatChangelogDay(day.date)}</p>
                <ol className="flex flex-col gap-0.5">
                  {day.entries.map((entry) => {
                    const kind = KIND_STYLE[entry.kind];
                    return (
                      <li key={entry.id}>
                        <a
                          href={`#${entry.id}`}
                          aria-current={active === entry.id ? "location" : undefined}
                          className="relative flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground aria-[current=location]:text-foreground"
                        >
                          {active === entry.id && <motion.span layoutId="changelog-active" transition={CHANGELOG_SPRING} className="absolute inset-0 rounded-xl bg-accent" />}
                          <span className={cn("relative flex size-5 shrink-0 items-center justify-center rounded-md", kind.tile)}>
                            <kind.Icon className="size-3" weight="fill" aria-hidden="true" />
                          </span>
                          <span className="relative leading-snug">{entry.title}</span>
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </nav>

          <div className="flex min-w-0 flex-col gap-10">
            <AnimatePresence mode="popLayout" initial={false}>
              {days.map((day) => (
                <motion.section
                  key={day.date}
                  layout="position"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  aria-labelledby={`day-${day.date}`}
                  className="flex flex-col gap-4"
                >
                  <h2 id={`day-${day.date}`} className="sticky top-0 z-10 -mx-1 flex items-center gap-2 bg-background/90 px-1 py-2 text-sm font-semibold text-muted-foreground backdrop-blur">
                    <CalendarBlankIcon className="size-4" aria-hidden="true" />
                    <time dateTime={day.date}>{formatChangelogDay(day.date)}</time>
                    <span className="font-normal">· {day.entries.length} {day.entries.length === 1 ? "change" : "changes"}</span>
                  </h2>
                  {day.entries.map((entry) => <ChangelogCard key={entry.id} entry={entry} />)}
                </motion.section>
              ))}
            </AnimatePresence>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-dashed border-border p-5 text-sm">
              <a href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex items-center gap-2 text-muted-foreground transition hover:text-foreground">
                <ArrowUpIcon className="size-4" aria-hidden="true" />
                Back to top
              </a>
              <Link to="/profile" className="inline-flex items-center gap-2 font-medium text-primary hover:underline">
                <UserCircleIcon className="size-4" aria-hidden="true" />
                Back to your profile
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
