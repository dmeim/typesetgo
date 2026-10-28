import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowSquareOutIcon, CornersInIcon, CornersOutIcon, PictureInPictureIcon, ProjectorScreenChartIcon } from "@phosphor-icons/react";
import type { BoardPrefs } from "@/hooks/useConnectBoardPrefs";
import { cn } from "@/lib/utils";
import type { HostParticipant, HostRoom } from "@/components/connect/types";
import { useFullscreen } from "@/components/connect/use-fullscreen";
import { boardPath, popOutBoard, toggleFullscreen } from "@/components/connect/board/board-actions";
import { sortParticipants } from "@/components/connect/board/board-model";
import { BoardSortControls, BoardViewControls } from "@/components/connect/board/BoardControls";
import { ParticipantBoard } from "@/components/connect/board/ParticipantBoard";
import { CHIP, ConnectCard } from "@/components/connect/ConnectParts";

function OpenButtons({ roomId, fullscreen, onFullscreen }: { roomId: string; fullscreen: boolean; onFullscreen: () => void }) {
  return (
    <>
      <button type="button" onClick={onFullscreen} className={CHIP}>
        {fullscreen ? <CornersInIcon className="size-4" aria-hidden="true" /> : <CornersOutIcon className="size-4" aria-hidden="true" />}
        {fullscreen ? "Exit fullscreen" : "Fullscreen"}
      </button>
      <AnimatePresence initial={false}>
        {!fullscreen && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap gap-2">
            <button type="button" onClick={() => popOutBoard(roomId)} className={CHIP}><PictureInPictureIcon className="size-4" aria-hidden="true" />Pop out</button>
            <a href={boardPath(roomId)} target="_blank" rel="noopener" className={CHIP}><ArrowSquareOutIcon className="size-4" aria-hidden="true" />New tab</a>
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );
}

/** The host's live board: the sort beside the title, board settings, ways to put it on a projector, and the cards. */
export function LiveBoardCard({ room, participants, prefs, update, className }: {
  room: HostRoom;
  participants: HostParticipant[];
  prefs: BoardPrefs;
  update: (changes: Partial<BoardPrefs>) => void;
  className?: string;
}) {
  const section = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen();
  const onFullscreen = () => void toggleFullscreen(section.current);
  const controls = { prefs, onChange: update, currentOrder: () => sortParticipants(room, participants, prefs).map((participant) => participant._id) };
  return (
    <div ref={section} data-board="live" className={cn(fullscreen && "h-dvh overflow-y-auto bg-background p-4 sm:p-6", className)}>
      {/* The sort sits in the title row, so the cards get more of the height. */}
      <ConnectCard title="Live board" Icon={ProjectorScreenChartIcon}
        tile="bg-foreground text-background" className={cn(fullscreen && "border-0 bg-transparent p-0 sm:p-0")}
        aside={<BoardSortControls {...controls} />}
        action={<div className="ml-auto flex flex-wrap items-center gap-2"><OpenButtons roomId={room._id} fullscreen={fullscreen} onFullscreen={onFullscreen} /></div>}>
        <BoardViewControls {...controls} />
        <ParticipantBoard room={room} participants={participants} prefs={prefs} showSummary={false} onReorder={(customOrder) => update({ customOrder })}
          emptyHint="Share the room code to get students in." />
      </ConnectCard>
    </div>
  );
}
