import { useId, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircleIcon, CircleNotchIcon, FloppyDiskIcon, HourglassIcon, PencilSimpleIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import EmojiPicker from "./EmojiPicker";
import { RACE_SPRING } from "./race-format";
import { HostTag, RacerAvatar, YouTag } from "./RaceParts";
import { RaceError } from "./RaceState";

export interface LobbyRacer {
  id: string;
  name: string;
  emoji: string;
  color: string;
  isReady: boolean;
  isHost: boolean;
  isYou: boolean;
}

const smallButton = "inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50";

/** Your name as an inline edit form; a failed save keeps the draft so nothing is lost. */
function NameEditor({ name, pending, onSave, onClose }: { name: string; pending: boolean; onSave: (name: string) => Promise<boolean>; onClose: () => void }) {
  const id = useId();
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState("");
  return (
    <form className="flex min-w-0 flex-1 flex-col gap-1.5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        if (!draft.trim()) { setError("Enter a racer name."); return; }
        setError("");
        if (await onSave(draft.trim())) onClose();
      }}>
      <label className="sr-only" htmlFor={`${id}-name`}>Racer name</label>
      <input id={`${id}-name`} autoFocus value={draft} disabled={pending} maxLength={30} onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}
        className="h-9 w-full min-w-0 rounded-full border border-input bg-background px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20" />
      <RaceError className="text-xs">{error}</RaceError>
      <div className="flex flex-wrap gap-1">
        <button type="submit" disabled={pending} className={cn(smallButton, "bg-primary text-primary-foreground")}>
          {pending ? <CircleNotchIcon className="size-3.5 motion-safe:animate-spin" aria-hidden="true" /> : error ? <WarningCircleIcon className="size-3.5" aria-hidden="true" /> : <FloppyDiskIcon className="size-3.5" aria-hidden="true" />}
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" disabled={pending} onClick={onClose} className={cn(smallButton, "text-muted-foreground hover:bg-accent hover:text-foreground")}>
          <XIcon className="size-3.5" aria-hidden="true" />Cancel
        </button>
      </div>
    </form>
  );
}

/** Everyone in the room, with your own row holding the avatar picker and name editor. */
export function LobbyRacerList({ racers, pending, locked, onEmojiChange, onNameChange }: {
  racers: LobbyRacer[];
  pending: boolean;
  /** True while the race is starting or you are leaving. */
  locked: boolean;
  onEmojiChange?: (emoji: string) => void;
  onNameChange?: (name: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <ul className="flex flex-col gap-1.5">
      {racers.map((racer) => {
        const canEditName = racer.isYou && !racer.isReady && !locked && onNameChange;
        return (
          <motion.li key={racer.id} layout="position" transition={RACE_SPRING}
            className={cn("flex min-w-0 items-center gap-2.5 rounded-2xl px-2 py-1.5", racer.isYou && "bg-primary/10")}>
            {racer.isYou && onEmojiChange
              ? <EmojiPicker selectedEmoji={racer.emoji} color={racer.color} onSelect={onEmojiChange} disabled={pending || locked || racer.isReady} />
              : <RacerAvatar emoji={racer.emoji} color={racer.color} size="sm" dim={!racer.isReady} />}
            {canEditName && editing ? (
              <NameEditor name={racer.name} pending={pending} onSave={onNameChange} onClose={() => setEditing(false)} />
            ) : (
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                {canEditName ? (
                  <button type="button" disabled={pending} aria-label={`Edit racer name: ${racer.name}`} onClick={() => setEditing(true)}
                    className="group inline-flex min-w-0 items-center gap-1 rounded-md text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">
                    <span className="truncate underline decoration-dotted underline-offset-4">{racer.name}</span>
                    <PencilSimpleIcon className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
                  </button>
                ) : <span className="truncate text-sm font-semibold">{racer.name}</span>}
                {racer.isYou && <YouTag />}
                {racer.isHost && <HostTag label={false} />}
              </span>
            )}
            {racer.isReady
              ? <CheckCircleIcon weight="fill" className="size-5 shrink-0 text-success" role="img" aria-label="Ready" />
              : <HourglassIcon className="size-5 shrink-0 text-muted-foreground" role="img" aria-label="Getting set" />}
          </motion.li>
        );
      })}
    </ul>
  );
}
