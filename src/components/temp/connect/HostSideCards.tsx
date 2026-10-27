import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowClockwiseIcon, ArrowsOutIcon, CheckIcon, CopyIcon, LinkSimpleIcon, PlayIcon, ShareNetworkIcon, UserMinusIcon, UserPlusIcon, UsersThreeIcon,
  WifiSlashIcon, XIcon,
} from "@phosphor-icons/react";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { cn } from "@/lib/utils";
import { JOIN_HOST } from "./connect-mock";
import { CodeTiles, KidAvatar, LabCard, PresenceDot, ProgressBar } from "./ConnectParts";
import { PHASE_LABELS, kidPhase, kidProgress } from "./room-text";
import type { MockRoom } from "./use-mock-room";

const pill = "flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border px-3 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring";

/** Full-screen code for a projector; the tiles morph out of the card. */
function BigCode({ code, onClose }: { code: string; onClose: () => void }) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <motion.div role="dialog" aria-modal="true" aria-label="Room code, large" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 bg-background/95 p-6 text-center backdrop-blur" onClick={onClose}>
      <p className="text-xl text-muted-foreground sm:text-3xl">Go to <strong className="text-foreground">{JOIN_HOST}</strong> and type</p>
      <motion.div layoutId="room-code-tiles" transition={LAB_SPRING}><CodeTiles code={code} big /></motion.div>
      <button type="button" autoFocus onClick={onClose} className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
        <XIcon className="size-4" aria-hidden="true" />Close
      </button>
    </motion.div>
  );
}

/** Copies text and flips to a tick for a moment. */
function CopyButton({ text, label, Icon }: { text: string; label: string; Icon: typeof CopyIcon }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = () => {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopied(true);
  };
  return (
    <button type="button" onClick={copy} className={pill} aria-label={copied ? `${label} copied` : label}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={copied ? "done" : "copy"} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={LAB_SPRING} className="flex items-center gap-2">
          {copied ? <CheckIcon className="size-4 text-success" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}
          {copied ? "Copied!" : label}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export function CodeCard({ room, className }: { room: MockRoom; className?: string }) {
  const [big, setBig] = useState(false);
  const link = `${JOIN_HOST}?code=${room.code}`;
  return (
    <LabCard title="Room code" description={`Students type this at ${JOIN_HOST}`} Icon={ShareNetworkIcon} className={cn("bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--primary)_14%,transparent),transparent_70%)]", className)}>
      <div className="flex h-16 justify-center">
        {!big && <motion.div key={room.code} layoutId="room-code-tiles" transition={LAB_SPRING}><CodeTiles code={room.code} /></motion.div>}
      </div>
      <p className="truncate text-center font-mono text-xs text-muted-foreground">{link}</p>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={room.code} label="Copy code" Icon={CopyIcon} />
        <CopyButton text={`https://${link}`} label="Copy link" Icon={LinkSimpleIcon} />
        <button type="button" onClick={() => setBig(true)} className={pill}>
          <ArrowsOutIcon className="size-4" aria-hidden="true" />Show big
        </button>
      </div>
      <AnimatePresence>{big && <BigCode code={room.code} onClose={() => setBig(false)} />}</AnimatePresence>
    </LabCard>
  );
}

const PHASE_TEXT: Record<string, string> = { typing: "text-primary", finished: "text-success", late: "text-warning", offline: "text-muted-foreground" };

type Asking = "reset" | "remove" | null;

/** Inline "are you sure" strip that slides over the row. */
function ConfirmStrip({ text, action, destructive, onConfirm, onKeep }: { text: string; action: string; destructive: boolean; onConfirm: () => void; onKeep: () => void }) {
  return (
    <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={LAB_SPRING} className="flex min-w-0 flex-1 items-center gap-2">
      <span className="min-w-0 flex-1 text-sm font-semibold [overflow-wrap:anywhere]">{text}</span>
      <button type="button" onClick={onConfirm} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-bold focus-visible:outline-2 focus-visible:outline-ring", destructive ? "bg-destructive text-background" : "bg-primary text-primary-foreground")}>{action}</button>
      <button type="button" autoFocus onClick={onKeep} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">Cancel</button>
    </motion.div>
  );
}

function RosterRow({ room, kidId }: { room: MockRoom; kidId: string }) {
  const [asking, setAsking] = useState<Asking>(null);
  const kid = room.kids.find((entry) => entry.id === kidId);
  if (!kid) return null;
  const phase = kidPhase(room, kid);
  const progress = kidProgress(room, kid);
  const late = phase === "late";
  return (
    <div className="flex min-h-12 items-center gap-3 py-1.5">
      <span className="relative">
        <KidAvatar name={kid.name} photo={kid.signedIn} size="sm" className={cn(!kid.online && "opacity-40")} />
        <span className="absolute -bottom-0.5 -right-0.5 flex rounded-full bg-card p-0.5"><PresenceDot online={kid.online} /></span>
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        {asking === "remove" ? (
          <ConfirmStrip text={`Remove ${kid.name}? They can rejoin with the code.`} action="Remove" destructive onConfirm={() => room.actions.removeKid(kid.id)} onKeep={() => setAsking(null)} />
        ) : asking === "reset" ? (
          <ConfirmStrip text={late ? `Let ${kid.name} start this test now?` : `Restart ${kid.name}'s attempt? Earlier results stay.`} action={late ? "Start now" : "Restart"} destructive={!late}
            onConfirm={() => { room.actions.resetKid(kid.id); setAsking(null); }} onKeep={() => setAsking(null)} />
        ) : (
          <motion.div key="row" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={LAB_SPRING} className="flex min-w-0 flex-1 items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-semibold">{kid.name}{kid.isYou && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}</span>
                <span className={cn("shrink-0 text-xs font-medium", PHASE_TEXT[phase] ?? "text-muted-foreground")}>{PHASE_LABELS[phase]}</span>
              </p>
              <ProgressBar value={progress} done={phase === "finished" || phase === "done"} label={`${kid.name} progress`} className="mt-1 h-1.5" />
            </div>
            <button type="button" aria-label={late ? `Let ${kid.name} start now` : `Restart ${kid.name}'s attempt`} title={late ? "Let them start this test now" : "Restart their attempt"}
              onClick={() => setAsking("reset")} disabled={room.status === "lobby" || room.status === "complete"}
              className={cn("flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-30",
                late ? "bg-warning/15 text-warning" : "text-muted-foreground hover:text-foreground")}>
              {late ? <PlayIcon weight="fill" className="size-4" aria-hidden="true" /> : <ArrowClockwiseIcon className="size-4" aria-hidden="true" />}
            </button>
            <button type="button" aria-label={`Remove ${kid.name}`} title="Remove from room" onClick={() => setAsking("remove")}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring">
              <UserMinusIcon className="size-4" aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const pretend = "flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 font-semibold text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring";

export function RosterCard({ room, className }: { room: MockRoom; className?: string }) {
  const online = room.kids.filter((kid) => kid.online).length;
  const late = room.kids.filter((kid) => room.late(kid)).length;
  return (
    <LabCard title="Who's here" description={`${room.kids.length} joined · ${online} online${late ? ` · ${late} waiting` : ""}`} Icon={UsersThreeIcon} tile="bg-success text-background" className={className}>
      {room.kids.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No one has joined yet. Share the code to get started.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          <AnimatePresence initial={false}>
            {room.kids.map((kid) => (
              <motion.li key={kid.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={LAB_SPRING} className="overflow-hidden">
                <RosterRow room={room} kidId={kid.id} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      {late > 0 && (
        <p className="rounded-2xl bg-warning/10 px-3 py-2 text-xs text-warning">
          Late arrivals sit out the test in progress and join the next one. Tap <PlayIcon weight="fill" className="inline size-3" aria-label="start now" /> to let someone in early.
        </p>
      )}
      <div role="group" aria-label="Mockup controls" className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-border p-2 text-xs text-muted-foreground">
        <span className="px-1">Pretend:</span>
        <button type="button" onClick={room.actions.someoneJoins} className={pretend}><UserPlusIcon className="size-3.5" aria-hidden="true" />Someone joins</button>
        <button type="button" onClick={room.actions.wifiBlip} className={pretend}><WifiSlashIcon className="size-3.5" aria-hidden="true" />Wi-Fi blip</button>
      </div>
    </LabCard>
  );
}
