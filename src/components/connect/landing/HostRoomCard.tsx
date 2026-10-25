import { useId, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { ChalkboardTeacherIcon, CircleNotchIcon, PlusIcon } from "@phosphor-icons/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";
import { CONNECT_NAME_MAX, CONNECT_ROOM_NAME_MAX } from "@/lib/connect-types";
import { loadHostName, saveHostName } from "@/lib/connect-membership";
import { FormError, LandingCard } from "@/components/connect/landing/LandingCard";
import { RecentRooms } from "@/components/connect/landing/RecentRooms";
import { readableError } from "@/components/connect/connect-errors";

export function HostRoomCard({ className }: { className?: string }) {
  const id = useId();
  const navigate = useNavigate();
  const credential = useMultiplayerCredential();
  const createRoom = useMutation(api.connect.createRoom);
  const [hostName, setHostName] = useState(loadHostName);
  const [roomName, setRoomName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const name = hostName.trim();
    if (!name) {
      setError("Enter the name students will see.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await createRoom({ hostName: name, credential, name: roomName.trim() || undefined });
      saveHostName(name);
      navigate(`/connect/host/${result.roomId}`);
    } catch (caught) {
      setError(readableError(caught, "Couldn't create the room. Check your connection and try again."));
      setPending(false);
    }
  };

  return (
    <LandingCard
      labelledBy={`${id}-title`}
      title="Host a room"
      description="Build a list of tests, share the code, and watch everyone's progress live."
      icon={<ChalkboardTeacherIcon className="size-5" />}
      className={className}
    >
      <form className="space-y-4" onSubmit={(event) => void submit(event)} noValidate>
        <div className="space-y-2">
          <Label htmlFor={`${id}-host`}>Your name</Label>
          <Input
            id={`${id}-host`}
            value={hostName}
            maxLength={CONNECT_NAME_MAX}
            autoComplete="name"
            placeholder="Ms. Rivera"
            onChange={(event) => setHostName(event.target.value)}
            aria-invalid={error && !hostName.trim() ? true : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-room`}>
            Room name <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id={`${id}-room`}
            value={roomName}
            maxLength={CONNECT_ROOM_NAME_MAX}
            placeholder={hostName.trim() ? `${hostName.trim()}'s room` : "Period 3 typing"}
            onChange={(event) => setRoomName(event.target.value)}
          />
        </div>
        <FormError>{error}</FormError>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <CircleNotchIcon className="animate-spin" aria-hidden="true" /> : <PlusIcon aria-hidden="true" />}
          {pending ? "Creating room…" : "Create room"}
        </Button>
      </form>
      <RecentRooms />
    </LandingCard>
  );
}
