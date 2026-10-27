import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowClockwiseIcon, ArrowsOutIcon, CheckIcon, CopyIcon, GhostIcon, KeyboardIcon, PaletteIcon, ProjectorScreenChartIcon, ShareNetworkIcon,
  SlidersHorizontalIcon, SpeakerHighIcon, UserMinusIcon, UsersThreeIcon, XIcon,
} from "@phosphor-icons/react";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { cn } from "@/lib/utils";
import { ROOM } from "./connect-mock";
import { CodeTiles, KidAvatar, LabCard, PresenceDot, ProgressBar } from "./ConnectParts";
import { PHASE_LABELS, kidPhase, kidProgress } from "./room-text";
import type { MockRoom } from "./use-mock-room";

const JOIN_LINK = `typesetgo.app/connect/join?code=${ROOM.code}`;
const pill = "flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border px-4 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring";

/** Full-screen code for a projector; the tiles morph out of the card. */
function BigCode({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <motion.div role="dialog" aria-modal="true" aria-label="Room code, large" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 bg-background/95 p-6 text-center backdrop-blur" onClick={onClose}>
      <p className="text-xl text-muted-foreground sm:text-3xl">Go to <strong className="text-foreground">typesetgo.app/connect</strong> and type</p>
      <motion.div layoutId="room-code-tiles" transition={LAB_SPRING}><CodeTiles code={ROOM.code} big /></motion.div>
      <button type="button" autoFocus onClick={onClose} className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
        <XIcon className="size-4" aria-hidden="true" />Close
      </button>
    </motion.div>
  );
}

export function CodeCard({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const [big, setBig] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = () => {
    void navigator.clipboard?.writeText(`https://${JOIN_LINK}`).catch(() => undefined);
    setCopied(true);
  };
  return (
    <LabCard title="Room code" description="Students type this at typesetgo.app/connect" Icon={ShareNetworkIcon} className={cn("bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--primary)_14%,transparent),transparent_70%)]", className)}>
      <div className="flex h-16 justify-center">
        {!big && <motion.div layoutId="room-code-tiles" transition={LAB_SPRING}><CodeTiles code={ROOM.code} /></motion.div>}
      </div>
      <p className="truncate text-center font-mono text-xs text-muted-foreground">{JOIN_LINK}</p>
      <div className="flex gap-2">
        <button type="button" onClick={copy} className={pill}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={copied ? "done" : "copy"} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={LAB_SPRING} className="flex items-center gap-2">
              {copied ? <CheckIcon className="size-4 text-success" aria-hidden="true" /> : <CopyIcon className="size-4" aria-hidden="true" />}
              {copied ? "Copied!" : "Copy link"}
            </motion.span>
          </AnimatePresence>
        </button>
        <button type="button" onClick={() => setBig(true)} className={pill}>
          <ArrowsOutIcon className="size-4" aria-hidden="true" />Show big
        </button>
      </div>
      <AnimatePresence>{big && <BigCode onClose={() => setBig(false)} />}</AnimatePresence>
    </LabCard>
  );
}

const PHASE_TEXT: Record<string, string> = { typing: "text-primary", finished: "text-success", offline: "text-muted-foreground" };

function RosterRow({ room, kidId }: { room: MockRoom; kidId: string }) {
  const [confirming, setConfirming] = useState(false);
  const kid = room.kids.find((entry) => entry.id === kidId);
  if (!kid) return null;
  const phase = kidPhase(room, kid);
  const progress = kidProgress(room, kid);
  return (
    <div className="flex min-h-12 items-center gap-3 py-1.5">
      <span className="relative">
        <KidAvatar name={kid.name} size="sm" className={cn(!kid.online && "opacity-40")} />
        <span className="absolute -bottom-0.5 -right-0.5 flex rounded-full bg-card p-0.5"><PresenceDot online={kid.online} /></span>
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        {confirming ? (
          <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={LAB_SPRING} className="flex min-w-0 flex-1 items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">Remove {kid.name}?</span>
            <button type="button" onClick={() => room.actions.removeKid(kid.id)} className="rounded-full bg-destructive px-3 py-1.5 text-xs font-bold text-background focus-visible:outline-2 focus-visible:outline-ring">Remove</button>
            <button type="button" autoFocus onClick={() => setConfirming(false)} className="rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">Keep</button>
          </motion.div>
        ) : (
          <motion.div key="row" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={LAB_SPRING} className="flex min-w-0 flex-1 items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-semibold">{kid.name}{kid.isYou && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}</span>
                <span className={cn("shrink-0 text-xs font-medium", PHASE_TEXT[phase] ?? "text-muted-foreground")}>{PHASE_LABELS[phase]}</span>
              </p>
              <ProgressBar value={progress} done={phase === "finished" || phase === "done"} label={`${kid.name} progress`} className="mt-1 h-1.5" />
            </div>
            <button type="button" aria-label={`Reset ${kid.name}`} title="Restart their attempt" onClick={() => room.actions.resetKid(kid.id)} disabled={room.status === "lobby"}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-30">
              <ArrowClockwiseIcon className="size-4" aria-hidden="true" />
            </button>
            {kid.isYou ? <span aria-hidden="true" className="size-8 shrink-0" /> : (
              <button type="button" aria-label={`Remove ${kid.name}`} title="Remove from room" onClick={() => setConfirming(true)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring">
                <UserMinusIcon className="size-4" aria-hidden="true" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function RosterCard({ room, onOpenBoard, className }: { room: MockRoom; onOpenBoard: () => void; className?: string }) {
  const online = room.kids.filter((kid) => kid.online).length;
  return (
    <LabCard title="Who's here" description={`${room.kids.length} joined · ${online} online`} Icon={UsersThreeIcon} tile="bg-success text-background" className={className}>
      <ul className="flex flex-col divide-y divide-border">
        <AnimatePresence initial={false}>
          {room.kids.map((kid) => (
            <motion.li key={kid.id} layout exit={{ opacity: 0, height: 0 }} transition={LAB_SPRING} className="overflow-hidden">
              <RosterRow room={room} kidId={kid.id} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <button type="button" onClick={onOpenBoard}
        className="flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-bold text-background hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <ProjectorScreenChartIcon weight="fill" className="size-5" aria-hidden="true" />Open the live board
      </button>
    </LabCard>
  );
}

const ROOM_SETTINGS = [
  { id: "theme", label: "Same theme for everyone", Icon: PaletteIcon, on: true },
  { id: "keyboard", label: "On-screen keyboard", Icon: KeyboardIcon, on: false },
  { id: "sound", label: "Typing sounds", Icon: SpeakerHighIcon, on: true },
  { id: "ghost", label: "Ghost racer", Icon: GhostIcon, on: false },
];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}
      className={cn("flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", checked ? "justify-end bg-primary" : "justify-start bg-muted")}>
      <motion.span layout transition={LAB_SPRING} className={cn("size-5 rounded-full shadow-sm", checked ? "bg-primary-foreground" : "bg-muted-foreground")} />
    </button>
  );
}

/** Choices the host makes for everyone; the rest keep their own settings. */
export function RoomSettingsCard({ className }: { className?: string }) {
  const [values, setValues] = useState(() => Object.fromEntries(ROOM_SETTINGS.map((item) => [item.id, item.on])));
  return (
    <LabCard title="Everyone gets" description="Anything left off uses each student's own settings." Icon={SlidersHorizontalIcon} tile="bg-(--accent-emphasis) text-background" className={className}>
      <ul className="flex flex-col gap-1">
        {ROOM_SETTINGS.map(({ id, label, Icon }) => (
          <li key={id} className="flex items-center gap-3 rounded-2xl px-1 py-1.5">
            <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
            <Toggle label={label} checked={values[id]} onChange={() => setValues((current) => ({ ...current, [id]: !current[id] }))} />
          </li>
        ))}
      </ul>
    </LabCard>
  );
}
