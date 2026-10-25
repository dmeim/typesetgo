import { useRef, useState } from "react";
import { ArrowSquareOutIcon, CornersInIcon, CornersOutIcon, PictureInPictureIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { BoardControls } from "@/components/connect/board/BoardControls";
import { ParticipantBoard } from "@/components/connect/board/ParticipantBoard";
import type { HostParticipant, HostRoom } from "@/components/connect/types";
import { useFullscreen } from "@/components/connect/use-fullscreen";
import { useConnectBoardPrefs } from "@/hooks/useConnectBoardPrefs";
import { toast } from "@/lib/toast-manager";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "./ConfirmDialog";
import type { HostRoomActions } from "./use-host-room";

type Confirmation = { kind: "reset" | "remove"; participant: HostParticipant };

export function ParticipantsSection({ room, participants, actions }: {
  room: HostRoom;
  participants: HostParticipant[];
  actions: HostRoomActions;
}) {
  const section = useRef<HTMLElement>(null);
  const fullscreen = useFullscreen();
  const [prefs, updatePrefs] = useConnectBoardPrefs(room._id);
  // The last target stays set while the dialog animates closed.
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [confirming, setConfirming] = useState(false);
  const online = participants.filter((participant) => participant.isConnected).length;
  const boardPath = `/connect/host/${room._id}/board`;

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await section.current?.requestFullscreen();
    } catch {
      toast.add({ type: "error", title: "Fullscreen isn't available in this browser" });
    }
  };

  // Dialog portals render outside the fullscreen element, so leave fullscreen before confirming.
  const confirm = async (next: Confirmation) => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        toast.add({ type: "error", title: "Exit fullscreen to manage this participant" });
        return;
      }
    }
    setConfirmation(next);
    setConfirming(true);
  };

  const popOut = () => {
    const opened = window.open(boardPath, `typesetgo-board-${room._id}`, "popup=yes,width=1200,height=800");
    if (!opened) toast.add({ type: "error", title: "The pop-out was blocked", description: "Allow pop-ups for this site, or use Open in new tab." });
  };

  return (
    <section
      ref={section}
      aria-labelledby="connect-participants-heading"
      className={cn("min-w-0 space-y-4 rounded-xl border border-border bg-card p-4 text-card-foreground sm:p-5", fullscreen && "h-dvh overflow-y-auto rounded-none border-0 bg-background")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="connect-participants-heading" className="text-lg font-semibold">Participants</h2>
          <p className="text-sm text-muted-foreground">
            {participants.length} joined · {online} online
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void toggleFullscreen()}>
            {fullscreen ? <CornersInIcon aria-hidden="true" /> : <CornersOutIcon aria-hidden="true" />}
            {fullscreen ? "Exit fullscreen" : "Fullscreen"}
          </Button>
          {!fullscreen && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={popOut}>
                <PictureInPictureIcon aria-hidden="true" />
                Pop out
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={boardPath} target="_blank" rel="noopener">
                  <ArrowSquareOutIcon aria-hidden="true" />
                  Open in new tab
                </a>
              </Button>
            </>
          )}
        </div>
      </div>
      <BoardControls prefs={prefs} onChange={updatePrefs} />
      <ParticipantBoard
        room={room}
        participants={participants}
        prefs={prefs}
        showSummary={false}
        onPrefsChange={updatePrefs}
        onReorder={(customOrder) => updatePrefs({ customOrder })}
        onReset={(participant) => void confirm({ kind: "reset", participant })}
        onRemove={(participant) => void confirm({ kind: "remove", participant })}
      />
      <ConfirmDialog
        open={confirming && confirmation?.kind === "reset"}
        onOpenChange={setConfirming}
        title={`Reset ${confirmation?.participant.name ?? "participant"}?`}
        description="Their current attempt is cleared and they start this test again. Earlier results are kept."
        confirmLabel="Reset attempt"
        onConfirm={() => { if (confirmation) void actions.resetParticipant(confirmation.participant._id); }}
      />
      <ConfirmDialog
        open={confirming && confirmation?.kind === "remove"}
        onOpenChange={setConfirming}
        title={`Remove ${confirmation?.participant.name ?? "participant"}?`}
        description="They leave the board and see that the host removed them. They can join again with the room code."
        confirmLabel="Remove"
        onConfirm={() => { if (confirmation) void actions.removeParticipant(confirmation.participant._id); }}
      />
    </section>
  );
}
