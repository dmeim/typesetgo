import { useEffect, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { CircleNotchIcon, CornersInIcon, CornersOutIcon, LinkBreakIcon, LockIcon, ProjectorScreenChartIcon } from "@phosphor-icons/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { joinHost, toggleFullscreen } from "@/components/connect/board/board-actions";
import { ParticipantBoard } from "@/components/connect/board/ParticipantBoard";
import { CodeTiles } from "@/components/connect/ConnectBadges";
import type { HostRoom } from "@/components/connect/types";
import { useFullscreen } from "@/components/connect/use-fullscreen";
import { useHostHeartbeat } from "@/components/connect/use-host-heartbeat";
import { useConnectBoardPrefs } from "@/hooks/useConnectBoardPrefs";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";
import { CONNECT_ARCHIVE_HOURS } from "@/lib/connect-types";
import { cn } from "@/lib/utils";

function Notice({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
      <div className="flex max-w-md flex-col items-center gap-3 rounded-3xl border border-border bg-card p-8 text-center text-card-foreground">
        <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">{icon}</span>
        <h1 className="text-2xl font-black">{title}</h1>
        {children}
      </div>
    </main>
  );
}

function FullscreenButton() {
  const fullscreen = useFullscreen();
  return (
    <button type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"} title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
      className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
      {fullscreen ? <CornersInIcon className="size-5" aria-hidden="true" /> : <CornersOutIcon className="size-5" aria-hidden="true" />}
    </button>
  );
}

/** The projector strip: room, live status, where to join, and the code. */
function BoardStrip({ room, live }: { room: HostRoom; live: boolean }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-3xl border border-border bg-card px-5 py-3 text-card-foreground">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-black sm:text-2xl" title={room.name}>{room.name}</h1>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className={cn("size-2 rounded-full", live ? "bg-success" : "animate-pulse bg-muted-foreground")} aria-hidden="true" />
          {live ? "Live" : "Connecting…"}<span aria-hidden="true">·</span><span className="truncate">Hosted by {room.hostName}</span>
        </p>
      </div>
      {/* On phones the address gets its own line above the code instead of being squeezed beside it. */}
      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-3 sm:flex-nowrap sm:gap-4">
        {room.code && (
          <>
            <p className="min-w-0 basis-full text-right text-xs leading-tight text-muted-foreground [overflow-wrap:anywhere] sm:basis-auto sm:text-sm">
              Join at<br className="hidden sm:inline" />{" "}<span className="font-semibold text-foreground">{joinHost()}</span>
            </p>
            <CodeTiles key={room.code} code={room.code}
              className="[&>span]:h-12 [&>span]:w-10 [&>span]:rounded-xl [&>span]:text-2xl sm:[&>span]:h-14 sm:[&>span]:w-11 sm:[&>span]:text-3xl" />
          </>
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
      <Notice icon={<CircleNotchIcon className="size-7 animate-spin" />} title="Loading board…" />
    );
  }
  if (view.state === "missing") {
    return (
      <Notice icon={<LinkBreakIcon className="size-7" />} title="This room doesn't exist">
        <p className="max-w-sm text-sm text-muted-foreground">Check the link, or create a new room from Connect.</p>
        <Button asChild variant="outline" className="rounded-full"><Link to="/connect">Go to Connect</Link></Button>
      </Notice>
    );
  }
  if (view.state === "forbidden") {
    return (
      <Notice icon={<LockIcon weight="fill" className="size-7" />} title="Open this board from the browser that hosts the room">
        <p className="max-w-sm text-sm text-muted-foreground">
          The board only works in the browser that created or reopened the room. Open it from the host panel in that browser.
        </p>
      </Notice>
    );
  }
  if (view.state === "ended") {
    return (
      <Notice icon={<ProjectorScreenChartIcon weight="fill" className="size-7" />} title={`${view.room.name} has ended`}>
        <p className="max-w-sm text-sm text-muted-foreground">You can reopen it from Recent rooms on the Connect page for {CONNECT_ARCHIVE_HOURS} hours.</p>
        <Button asChild variant="outline" className="rounded-full"><Link to="/connect">Go to Connect</Link></Button>
      </Notice>
    );
  }

  const { room, participants } = view;
  return (
    <main className="flex min-h-dvh flex-col gap-4 bg-background p-3 text-foreground sm:p-5">
      <BoardStrip room={room} live={heartbeat === "ok"} />
      <ParticipantBoard
        room={room}
        participants={participants}
        prefs={prefs}
        emptyHint={room.code ? `Go to ${joinHost()} and enter code ${room.code}.` : undefined}
      />
    </main>
  );
}
