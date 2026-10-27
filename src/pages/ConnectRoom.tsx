import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ArrowLeftIcon, ArrowsClockwiseIcon, CircleNotchIcon, DoorOpenIcon, LinkBreakIcon, UserMinusIcon, UserPlusIcon } from "@phosphor-icons/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";
import { clearMembership, loadMembership, saveMembership } from "@/lib/connect-membership";
import { Button } from "@/components/ui/button";
import { RoomMessage, RoomPage } from "@/components/connect/room/RoomChrome";
import { RoomLive } from "@/components/connect/room/RoomLive";
import { useRoomMembership } from "@/components/connect/room/use-room-membership";
import { useParticipantHeartbeat } from "@/components/connect/room/use-participant-heartbeat";
import { readableError } from "@/components/connect/connect-errors";

const joinAction = { to: "/connect/join", label: "Join again", icon: <UserPlusIcon aria-hidden="true" /> };
const backAction = { to: "/connect", label: "Back to Connect", icon: <ArrowLeftIcon aria-hidden="true" /> };

function RoomSession({ roomId }: { roomId: string }) {
  const navigate = useNavigate();
  const credential = useMultiplayerCredential();
  const leaveMutation = useMutation(api.connect.leave);
  // Signed-in seats are checked against the account, so wait for sign-in to settle before asking.
  const { isLoading: authLoading } = useConvexAuth();
  const { membership, rejoin, recoverStaleSeat, retry } = useRoomMembership(roomId, !authLoading);
  const participantId = membership.status === "member" ? membership.participantId : undefined;
  const view = useQuery(api.connect.participantView, participantId && !authLoading ? { roomId, participantId, credential } : "skip");
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string>();

  const viewState = view?.state;
  const heartbeatId = participantId && (viewState === undefined || viewState === "ok") ? participantId : undefined;
  const rejoinAfterOffline = useCallback(() => { void rejoin(); }, [rejoin]);
  const { reconnecting } = useParticipantHeartbeat(leaving ? undefined : heartbeatId, rejoinAfterOffline);

  // A stored seat the server does not recognise, or one held by another account, is replaced once by a session rejoin.
  const recoveredRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!participantId || (viewState !== "missing" && viewState !== "forbidden" && viewState !== "account")) return;
    if (recoveredRef.current === participantId) return;
    recoveredRef.current = participantId;
    recoverStaleSeat();
  }, [participantId, viewState, recoverStaleSeat]);

  useEffect(() => {
    if (viewState === "ended") clearMembership(roomId);
  }, [viewState, roomId]);

  const participantName = view?.state === "ok" ? view.participant.name : undefined;
  useEffect(() => {
    if (!participantId || !participantName || loadMembership(roomId)?.name === participantName) return;
    saveMembership(roomId, { participantId, name: participantName });
  }, [roomId, participantId, participantName]);

  const leave = useCallback(async () => {
    if (leaving) return;
    setLeaving(true);
    setLeaveError(undefined);
    try {
      if (participantId) await leaveMutation({ participantId: participantId as Id<"connectParticipants">, credential });
    } catch (error) {
      console.warn("Connect leave failed", { roomId, participantId, error });
      setLeaveError(`Couldn't leave the room: ${readableError(error)}`);
      setLeaving(false);
      return;
    }
    clearMembership(roomId);
    navigate("/connect");
  }, [leaving, participantId, leaveMutation, credential, roomId, navigate]);

  if (membership.status === "removed" || viewState === "removed") {
    return <RoomPage><RoomMessage Icon={UserMinusIcon} title="The host removed you from this room" description="You can join again with the room code if the host lets you back in." action={joinAction} /></RoomPage>;
  }
  if (membership.status === "ended" || viewState === "ended") {
    return <RoomPage><RoomMessage Icon={DoorOpenIcon} title="This room has ended" description="Thanks for typing! The host has closed this room." action={backAction} /></RoomPage>;
  }
  if (membership.status === "not_member") {
    return <RoomPage><RoomMessage Icon={UserPlusIcon} title="You're not in this room yet" description="Enter the room code from your host to join." action={{ ...joinAction, label: "Join with a code" }} /></RoomPage>;
  }
  if (membership.status === "error") {
    return (
      <RoomPage>
        <RoomMessage Icon={LinkBreakIcon} title="Couldn't reach the room" description={membership.message} action={backAction}>
          <Button variant="outline" className="rounded-full" onClick={retry}>
            <ArrowsClockwiseIcon aria-hidden="true" />
            Try again
          </Button>
        </RoomMessage>
      </RoomPage>
    );
  }
  if (!participantId || view?.state !== "ok") {
    return (
      <RoomPage>
        <RoomMessage title="Joining the room…">
          <CircleNotchIcon className="size-6 text-muted-foreground motion-safe:animate-spin" role="status" aria-label="Connecting" />
        </RoomMessage>
      </RoomPage>
    );
  }
  return (
    <RoomLive roomId={roomId} participantId={participantId} room={view.room} participant={view.participant}
      reconnecting={reconnecting} leaving={leaving} leaveError={leaveError} onLeave={() => void leave()} />
  );
}

export default function ConnectRoom() {
  const { roomId = "" } = useParams();
  return <RoomSession key={roomId} roomId={roomId} />;
}
