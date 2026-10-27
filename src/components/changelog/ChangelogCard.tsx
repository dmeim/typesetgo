import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightIcon, CheckCircleIcon, HandPointingIcon, MapPinIcon, XIcon } from "@phosphor-icons/react";
import { CHANGE_KIND_LABELS, CHANGE_STATUS_LABELS, type ChangelogEntry } from "@/lib/changelog";
import { cn } from "@/lib/utils";
import { CHANGELOG_SPRING, KIND_STYLE } from "./changelog-style";
import { LiveDemo } from "./LiveDemo";
import { ShotGallery } from "./ShotGallery";

/** One change: what it is, where to find it, screenshots, and a live demo when there is one. */
export function ChangelogCard({ entry }: { entry: ChangelogEntry }) {
  const [trying, setTrying] = useState(false);
  const kind = KIND_STYLE[entry.kind];
  const demoId = `${entry.id}-demo`;

  return (
    <motion.article
      id={entry.id}
      aria-labelledby={`${entry.id}-title`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={CHANGELOG_SPRING}
      className="scroll-mt-24 rounded-3xl border border-border bg-card p-5 text-card-foreground sm:p-6"
    >
      <div className="mb-4 flex items-start gap-3">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-sm", kind.tile)}>
          <kind.Icon className="size-6" weight="fill" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className={cn("rounded-full px-2.5 py-0.5", kind.badge)}>{CHANGE_KIND_LABELS[entry.kind]}</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground"><MapPinIcon className="size-3.5" aria-hidden="true" />{entry.area}</span>
            {entry.status === "preview" && <span className="rounded-full bg-accent px-2.5 py-0.5 text-foreground">{CHANGE_STATUS_LABELS.preview}</span>}
          </div>
          <h3 id={`${entry.id}-title`} className="text-lg font-semibold leading-snug sm:text-xl">
            <a href={`#${entry.id}`} className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-ring">{entry.title}</a>
          </h3>
        </div>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{entry.summary}</p>

      <ul className="mb-5 flex flex-col gap-2 text-sm">
        {entry.highlights.map((highlight) => (
          <li key={highlight} className="flex items-start gap-2.5">
            <CheckCircleIcon weight="fill" className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{highlight}</span>
          </li>
        ))}
      </ul>

      {entry.shots && entry.shots.length > 0 && <ShotGallery shots={entry.shots} title={entry.title} />}

      {(entry.demo || entry.link) && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {entry.demo && (
            <button
              type="button"
              aria-expanded={trying}
              aria-controls={demoId}
              onClick={() => setTrying((value) => !value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                trying ? "bg-accent text-foreground hover:bg-accent/70" : "bg-primary text-primary-foreground hover:opacity-90",
              )}
            >
              {trying ? <XIcon className="size-4" aria-hidden="true" /> : <HandPointingIcon className="size-4" weight="fill" aria-hidden="true" />}
              {trying ? "Close the demo" : "Try it here"}
            </button>
          )}
          {entry.link && (
            <Link to={entry.link.to} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              {entry.link.label}
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}

      <AnimatePresence initial={false}>
        {entry.demo && trying && (
          <motion.div
            id={demoId}
            key="demo"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={CHANGELOG_SPRING}
            className="overflow-hidden"
          >
            <div className="pt-5">
              <p className="mb-3 text-xs text-muted-foreground">A working copy with pretend data. Nothing you do here is saved.</p>
              <LiveDemo demo={entry.demo} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
