import { useState } from "react";
import { MagnifyingGlassPlusIcon } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { ChangelogShot } from "@/lib/changelog";
import { cn } from "@/lib/utils";

function ShotButton({ shot, onOpen, large }: { shot: ChangelogShot; onOpen: () => void; large: boolean }) {
  const [missing, setMissing] = useState(false);
  if (missing) return null;
  return (
    <figure className={cn("flex min-w-0 flex-col gap-2", large && "sm:col-span-full")}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`View larger: ${shot.alt}`}
        className="group relative overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <img src={shot.src} alt="" loading="lazy" decoding="async" onError={() => setMissing(true)} className="block w-full transition-transform duration-500 group-hover:scale-[1.015]" />
        <span className="absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-card/90 text-foreground opacity-0 shadow backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <MagnifyingGlassPlusIcon className="size-4" aria-hidden="true" />
        </span>
      </button>
      {shot.caption && <figcaption className="px-1 text-xs text-muted-foreground">{shot.caption}</figcaption>}
    </figure>
  );
}

/** Screenshots of the change; the first one runs full width, the rest sit side by side. Each opens full size. */
export function ShotGallery({ shots, title }: { shots: ChangelogShot[]; title: string }) {
  const [open, setOpen] = useState<ChangelogShot | null>(null);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {shots.map((shot, index) => (
          <ShotButton key={shot.src} shot={shot} large={index === 0} onOpen={() => setOpen(shot)} />
        ))}
      </div>
      <Dialog open={open !== null} onOpenChange={(next) => { if (!next) setOpen(null); }}>
        <DialogContent className="w-[min(96vw,90rem)] max-w-none gap-3 p-3 sm:max-w-none sm:p-4">
          <DialogTitle className="px-1 text-base">{open?.caption ? `${title}: ${open.caption}` : title}</DialogTitle>
          <DialogDescription className="sr-only">{open?.alt}</DialogDescription>
          {open && <img src={open.src} alt={open.alt} className="max-h-[80dvh] w-full rounded-xl object-contain" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
