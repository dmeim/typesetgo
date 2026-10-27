import { useId, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { motion } from "framer-motion";
import { ArrowRightIcon, ChalkboardTeacherIcon, ChartBarIcon, CircleNotchIcon, ListChecksIcon, PlusIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import { api } from "../../../../convex/_generated/api";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";
import { CONNECT_NAME_MAX, CONNECT_ROOM_NAME_MAX } from "@/lib/connect-types";
import { loadHostName, saveHostName } from "@/lib/connect-membership";
import { cn } from "@/lib/utils";
import { ConnectCard } from "@/components/connect/ConnectParts";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";
import { readableError } from "@/components/connect/connect-errors";
import { FormError } from "./FormError";

const STEPS = [
  { Icon: ListChecksIcon, label: "Pick tests" },
  { Icon: ShareNetworkIcon, label: "Share the code" },
  { Icon: ChartBarIcon, label: "Watch live" },
];

const field = "h-12 w-full rounded-2xl border border-input bg-background px-4 text-base font-normal outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20";

export function HostRoomCard() {
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
    if (pending) return;
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
    <ConnectCard title="Host a room" description="For teachers, coaches and club leaders." Icon={ChalkboardTeacherIcon} bare hideHeader>
      <ol className="grid grid-cols-3 gap-2" aria-label="How hosting works">
        {STEPS.map(({ Icon, label }, index) => (
          <motion.li key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...CONNECT_SPRING, delay: 0.1 + index * 0.08 }}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-muted/50 px-2 py-3 text-center">
            <span className="relative flex size-9 items-center justify-center rounded-full bg-background text-foreground">
              <Icon weight="bold" className="size-5" aria-hidden="true" />
              <span aria-hidden="true" className="absolute -right-1 -top-1 flex size-4.5 items-center justify-center rounded-full bg-(--accent-emphasis) text-[0.6rem] font-bold text-background">{index + 1}</span>
            </span>
            <span className="text-xs font-semibold leading-tight">{label}</span>
          </motion.li>
        ))}
      </ol>
      <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor={`${id}-host`}>
            Your name
            <input id={`${id}-host`} value={hostName} maxLength={CONNECT_NAME_MAX} autoComplete="name" placeholder="Ms. Rivera"
              aria-invalid={error && !hostName.trim() ? true : undefined}
              onChange={(event) => { setHostName(event.target.value); setError(""); }} className={cn(field, error && !hostName.trim() && "border-destructive")} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor={`${id}-room`}>
            <span>Room name <span className="font-normal text-muted-foreground">(optional)</span></span>
            <input id={`${id}-room`} value={roomName} maxLength={CONNECT_ROOM_NAME_MAX} onChange={(event) => setRoomName(event.target.value)}
              placeholder={hostName.trim() ? `${hostName.trim()}'s room` : "Period 3 typing"} className={field} />
          </label>
        </div>
        <FormError>{error}</FormError>
        <button type="submit" disabled={pending}
          className="group flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-6 font-bold text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40">
          {pending ? <CircleNotchIcon className="size-5 animate-spin" aria-hidden="true" /> : <PlusIcon className="size-5" aria-hidden="true" />}
          {pending ? "Making your room…" : "Create room"}
          {!pending && <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />}
        </button>
      </form>
    </ConnectCard>
  );
}
