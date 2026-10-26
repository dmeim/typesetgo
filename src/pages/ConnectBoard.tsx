import { useEffect, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { CircleNotchIcon, CornersInIcon, CornersOutIcon, LinkBreakIcon, LockIcon, ProhibitIcon } from "@phosphor-icons/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ParticipantBoard } from "@/components/connect/board/ParticipantBoard";
import type { HostRoom } from "@/components/connect/types";
import { useFullscreen } from "@/components/connect/use-fullscreen";
import { useHostHeartbeat } from "@/components/connect/use-host-heartbeat";
import { useConnectBoardPrefs } from "@/hooks/useConnectBoardPrefs";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";
import { CONNECT_ARCHIVE_HOURS } from "@/lib/connect-types";
import { toast } from "@/lib/toast-manager";

function joinHost() {
  return typeof window === "undefined" ? "/connect/join" : `${window.location.host}/connect/join`;
}

function Notice({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background p-6 text-center text-foreground">
      <span className="text-muted-foreground" aria-hidden="true">{icon}</span>
      <h1 className="text-xl font-semibold">{title}</h1>
      {children}
    </div>
  );
}

function FullscreenButton() {
  const fullscreen = useFullscreen();
  const toggle = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      toast.add({ type: "error", title: "Fullscreen isn't available in this browser" });
    }
  };
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
      title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
      onClick={() => void toggle()}
    >
      {fullscreen ? <CornersInIcon aria-hidden="true" /> : <CornersOutIcon aria-hidden="true" />}
    </Button>
  );
}

function BoardStrip({ room, live }: { room: HostRoom; live: boolean }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border bg-card px-4 py-2 text-card-foreground sm:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold leading-tight sm:text-xl" title={room.name}>{room.name}</h1>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
          <span
            className={live ? "size-2 rounded-full bg-success" : "size-2 animate-pulse rounded-full bg-muted-foreground"}
            aria-hidden="true"
          />
          <span>{live ? "Live" : "Connecting…"}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">Hosted by {room.hostName}</span>
        </p>
      </div>
      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
        {room.code && (
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <p className="min-w-0 break-all text-right text-xs leading-tight text-muted-foreground sm:text-sm">
              Join at<br />
              <span className="font-medium text-foreground">{joinHost()}</span>
            </p>
            <p
              className="rounded-lg border border-border bg-background px-3 py-1 font-mono text-[clamp(1.75rem,5vw,3.5rem)] font-bold leading-none tracking-[0.15em] text-primary"
              aria-label={`Room code ${room.code.split("").join(" ")}`}
            >
              {room.code}
            </p>
          </div>
        )}
        <FullscreenButton />
      </div>
    </header>
  );
}

export default function ConnectBoard() {
  const { roomId = "" } = useParams();
  const credential = useMultiplayerCredential();
  const view = useQuery(api.connect.hostView, roomId ? { roomId, credential } : "skip");
  const heartbeat = useHostHeartbeat(roomId || undefined);
  const [prefs] = useConnectBoardPrefs(roomId);
  const roomName = view?.state === "ok" || view?.state === "ended" ? view.room.name : undefined;

  useEffect(() => {
    if (!roomName) return;
    const previous = document.title;
    document.title = `${roomName} · Board`;
    return () => { document.title = previous; };
  }, [roomName]);

  if (view === undefined) {
    return (
      <Notice icon={<CircleNotchIcon className="size-8 animate-spin" />} title="Loading board…" />
    );
  }
  if (view.state === "missing") {
    return (
      <Notice icon={<LinkBreakIcon className="size-8" />} title="This room doesn't exist">
        <p className="max-w-sm text-sm text-muted-foreground">Check the link, or create a new room from Connect.</p>
        <Button asChild variant="outline"><Link to="/connect">Go to Connect</Link></Button>
      </Notice>
    );
  }
  if (view.state === "forbidden") {
    return (
      <Notice icon={<LockIcon className="size-8" />} title="Open this board from the browser that hosts the room">
        <p className="max-w-sm text-sm text-muted-foreground">
          The board only works in the browser that created or reopened the room. Open it from the host panel in that browser.
        </p>
      </Notice>
    );
  }
  if (view.state === "ended") {
    return (
      <Notice icon={<ProhibitIcon className="size-8" />} title={`${view.room.name} has ended`}>
        <p className="max-w-sm text-sm text-muted-foreground">You can reopen it from Recent rooms on the Connect page for {CONNECT_ARCHIVE_HOURS} hours.</p>
        <Button asChild variant="outline"><Link to="/connect">Go to Connect</Link></Button>
      </Notice>
    );
  }

  const { room, participants } = view;
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <BoardStrip room={room} live={heartbeat === "ok"} />
      <main className="w-full flex-1 px-3 py-3 sm:px-5 sm:py-4">
        <ParticipantBoard
          room={room}
          participants={participants}
          prefs={prefs}
          emptyHint={room.code ? `Go to ${joinHost()} and enter code ${room.code}.` : undefined}
        />
      </main>
    </div>
  );
}
