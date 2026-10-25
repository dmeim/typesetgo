import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftIcon, CheckIcon, PencilSimpleIcon, ShareNetworkIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { HostRoom } from "@/components/connect/types";
import { CONNECT_ARCHIVE_HOURS, CONNECT_ROOM_NAME_MAX, type ConnectRoomStatus } from "@/lib/connect-types";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "./ConfirmDialog";
import { ShareDialog } from "./ShareDialog";
import { STATUS_LABELS } from "./host-utils";

const STATUS_STYLES: Record<ConnectRoomStatus, string> = {
  lobby: "bg-muted text-muted-foreground",
  running: "bg-primary text-primary-foreground",
  paused: "bg-secondary text-secondary-foreground",
  complete: "bg-accent text-accent-foreground",
};

export function StatusBadge({ status }: { status: ConnectRoomStatus }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold", STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function RoomName({ name, onRename, saving }: { name: string; onRename: (name: string) => Promise<boolean>; saving: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (draft === null) return;
    const next = draft.trim();
    if (!next || next === name) { setDraft(null); return; }
    if (await onRename(next)) setDraft(null);
  };
  if (draft === null) {
    return (
      <div className="flex min-w-0 items-center gap-1">
        <h1 className="min-w-0 break-words text-2xl font-semibold sm:text-3xl">{name}</h1>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Rename room" onClick={() => setDraft(name)}>
          <PencilSimpleIcon aria-hidden="true" />
        </Button>
      </div>
    );
  }
  return (
    <form className="flex min-w-0 flex-wrap items-center gap-2" onSubmit={(event) => void submit(event)}>
      <Input
        autoFocus
        aria-label="Room name"
        value={draft}
        maxLength={CONNECT_ROOM_NAME_MAX}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Escape") setDraft(null); }}
        className="h-10 min-w-0 flex-1 text-lg font-semibold sm:w-80 sm:flex-none"
      />
      <Button type="submit" size="icon" aria-label="Save room name" disabled={saving || !draft.trim()}>
        <CheckIcon aria-hidden="true" />
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Cancel renaming" onClick={() => setDraft(null)}>
        <XIcon aria-hidden="true" />
      </Button>
    </form>
  );
}

export function HostHeader({ room, onRename, renaming, onEnd, ending }: {
  room: HostRoom;
  onRename: (name: string) => Promise<boolean>;
  renaming: boolean;
  onEnd: () => void;
  ending: boolean;
}) {
  const [sharing, setSharing] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const code = room.code ?? "";
  return (
    <header className="flex flex-col gap-4">
      <Link to="/connect" className="inline-flex w-fit items-center gap-2 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        Connect
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <RoomName key={room.name} name={room.name} onRename={onRename} saving={renaming} />
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={room.status} />
            <span className="break-words">Hosted by {room.hostName}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {code && (
            <button
              type="button"
              onClick={() => setSharing(true)}
              aria-label={`Share room code ${code}`}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2 text-left text-card-foreground transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="flex flex-col">
                <span className="text-xs text-muted-foreground">Room code</span>
                <span className="font-mono text-2xl font-bold tracking-[0.25em] text-primary">{code}</span>
              </span>
              <ShareNetworkIcon className="size-5 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
            </button>
          )}
          <Button type="button" variant="outline" disabled={ending} onClick={() => setConfirmEnd(true)}>
            <XIcon aria-hidden="true" />
            End room
          </Button>
        </div>
      </div>
      {code && <ShareDialog open={sharing} onOpenChange={setSharing} code={code} roomName={room.name} />}
      <ConfirmDialog
        open={confirmEnd}
        onOpenChange={setConfirmEnd}
        title="End this room?"
        description={`Everyone in the room is disconnected and the code stops working. You can reopen the room from Connect for ${CONNECT_ARCHIVE_HOURS} hours; it gets a new code.`}
        confirmLabel="End room"
        onConfirm={onEnd}
      />
    </header>
  );
}
