import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeftIcon, CircleNotchIcon, DoorIcon, DoorOpenIcon, LockKeyIcon, MagnifyingGlassIcon, type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ConnectShell } from "@/components/connect/ConnectShell";
import { HostPanel } from "@/components/connect/host/HostPanel";
import { readableError } from "@/components/connect/connect-errors";
import { useHostHeartbeat } from "@/components/connect/use-host-heartbeat";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";
import { toast } from "@/lib/toast-manager";

function BackToConnect() {
  return (
    <Button variant="outline" className="rounded-full" asChild>
      <Link to="/connect">
        <ArrowLeftIcon aria-hidden="true" />
        Back to Connect
      </Link>
    </Button>
  );
}

function StateCard({ title, Icon, children }: { title: string; Icon: PhosphorIcon; children: ReactNode }) {
  return (
    <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-4 rounded-3xl border border-border bg-card p-6 text-center text-card-foreground sm:p-8">
      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon weight="fill" className="size-7" />
      </span>
      <h1 className="text-2xl font-black">{title}</h1>
      {children}
    </div>
  );
}

/** Reopens an ended room or takes over hosting from another browser. */
function ReopenAction({ roomId, label }: { roomId: string; label: string }) {
  const credential = useMultiplayerCredential();
  const reopen = useMutation(api.connect.reopenRoom);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const run = async () => {
    setPending(true);
    setError("");
    try {
      const result = await reopen({ roomId: roomId as Id<"connectRooms">, credential });
      toast.add({ type: "success", title: `Room open with code ${result.code}` });
    } catch (caught) {
      setError(readableError(caught, "The room couldn't be reopened."));
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" className="rounded-full" disabled={pending} onClick={() => void run()}>
          {pending ? <CircleNotchIcon className="animate-spin" aria-hidden="true" /> : <DoorOpenIcon aria-hidden="true" />}
          {label}
        </Button>
        <BackToConnect />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function HostView({ roomId }: { roomId: string }) {
  const credential = useMultiplayerCredential();
  const view = useQuery(api.connect.hostView, { roomId, credential });
  useHostHeartbeat(view?.state === "ok" ? roomId : undefined);

  if (view === undefined) {
    return (
      <p role="status" className="mt-12 flex items-center justify-center gap-2 text-muted-foreground">
        <CircleNotchIcon className="size-5 animate-spin" aria-hidden="true" />
        Loading room…
      </p>
    );
  }
  if (view.state === "missing") {
    return (
      <StateCard title="Room not found" Icon={MagnifyingGlassIcon}>
        <p className="text-muted-foreground">This room doesn't exist or was closed more than a day ago.</p>
        <div className="flex justify-center"><BackToConnect /></div>
      </StateCard>
    );
  }
  if (view.state === "forbidden") {
    return (
      <StateCard title="This room is hosted from another browser" Icon={LockKeyIcon}>
        <p className="text-muted-foreground">
          Take over to host it here. If you're signed in as the room's owner, or this is the browser that created it, you can continue.
        </p>
        <ReopenAction roomId={roomId} label="Host from this browser" />
      </StateCard>
    );
  }
  if (view.state === "ended") {
    return (
      <StateCard title="This room has ended" Icon={DoorIcon}>
        <p className="text-muted-foreground">
          {view.room.name} is closed. Reopen it to keep the same tests and settings; it gets a new code for participants.
        </p>
        <ReopenAction roomId={roomId} label="Reopen room" />
      </StateCard>
    );
  }
  return <HostPanel room={view.room} participants={view.participants} />;
}

export default function ConnectHost() {
  const { roomId = "" } = useParams();
  return (
    <ConnectShell className="max-w-6xl">
      <HostView key={roomId} roomId={roomId} />
    </ConnectShell>
  );
}
