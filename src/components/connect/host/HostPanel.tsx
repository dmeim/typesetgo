import { useNavigate } from "react-router-dom";
import type { HostParticipant, HostRoom } from "@/components/connect/types";
import { useConnectBoardPrefs } from "@/hooks/useConnectBoardPrefs";
import { CodeCard } from "@/components/connect/host/CodeCard";
import { HostHeader } from "@/components/connect/host/HostHeader";
import { LiveBoardCard } from "@/components/connect/host/LiveBoardCard";
import { OverridesPanel } from "@/components/connect/host/OverridesPanel";
import { RosterCard } from "@/components/connect/host/RosterCard";
import { RunCard } from "@/components/connect/host/RunControls";
import { TestsCard } from "@/components/connect/host/TestList";
import { useHostRoom } from "@/components/connect/host/use-host-room";

/**
 * The host's room: run controls and tests on the left, code and roster on the right, the live board below.
 * On phones the cards stack code, run, roster, tests, then "Everyone gets".
 */
export function HostPanel({ room, participants }: { room: HostRoom; participants: HostParticipant[] }) {
  const navigate = useNavigate();
  const actions = useHostRoom(room);
  const [prefs, updatePrefs] = useConnectBoardPrefs(room._id);

  return (
    <div className="flex flex-col gap-6">
      <HostHeader
        room={room}
        onRename={actions.rename}
        renaming={actions.busy === "rename"}
        ending={actions.busy === "end"}
        onEnd={() => void actions.endRoom().then((ok) => { if (ok) navigate("/connect"); })}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          <RunCard room={room} tests={actions.tests} participants={participants} actions={actions} className="order-2" />
          <TestsCard room={room} tests={actions.tests} participants={participants} onSave={actions.saveTests} className="order-4" />
          <OverridesPanel overrides={actions.overrides} onChange={actions.changeOverrides} className="order-5" />
        </div>
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          <CodeCard code={room.code} className="order-1" />
          <RosterCard room={room} participants={participants} actions={actions} className="order-3" />
        </div>
      </div>
      <LiveBoardCard room={room} participants={participants} prefs={prefs} update={updatePrefs} />
    </div>
  );
}
