import { useId, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  ArrowArcRightIcon, ArrowRightIcon, ChalkboardTeacherIcon, ChartBarIcon, CircleNotchIcon, ClockCounterClockwiseIcon, ListChecksIcon, PlayIcon, PlusIcon,
  ShareNetworkIcon, SignInIcon, UsersThreeIcon,
} from "@phosphor-icons/react";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { cn } from "@/lib/utils";
import { CONNECT_ARCHIVE_HOURS, CONNECT_NAME_MAX, CONNECT_ROOM_NAME_MAX } from "@/lib/connect-types";
import { RECENT_ROOMS, ROOM } from "./connect-mock";
import { JoinCodeCard } from "./JoinCodeCard";
import type { MockRoom } from "./use-mock-room";
import { KidAvatar, LabCard } from "./ConnectParts";

const STEPS = [
  { Icon: ListChecksIcon, label: "Pick tests" },
  { Icon: ShareNetworkIcon, label: "Share the code" },
  { Icon: ChartBarIcon, label: "Watch live" },
];

const HERO_FACES = ["Maya", "Jordan", "Priya", "Leo", "Sofia"];

const field = "h-12 w-full rounded-2xl border border-input bg-background px-4 text-base outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20";

function HostCard({ onCreate }: { onCreate: (host: string, name: string) => void }) {
  const id = useId();
  const [hostName, setHostName] = useState(ROOM.host);
  const [roomName, setRoomName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (!hostName.trim()) { setError("Enter the name students will see."); return; }
    setError("");
    setPending(true);
    setTimeout(() => onCreate(hostName.trim(), roomName.trim()), 600);
  };
  return (
    <LabCard title="Host a room" description="For teachers, coaches and club leaders." Icon={ChalkboardTeacherIcon} tile="bg-(--accent-emphasis) text-background">
      <ol className="grid grid-cols-3 gap-2" aria-label="How hosting works">
        {STEPS.map(({ Icon, label }, index) => (
          <motion.li key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...LAB_SPRING, delay: 0.1 + index * 0.08 }}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-muted/50 px-2 py-3 text-center">
            <span className="relative flex size-9 items-center justify-center rounded-full bg-background text-foreground">
              <Icon weight="bold" className="size-5" aria-hidden="true" />
              <span className="absolute -right-1 -top-1 flex size-4.5 items-center justify-center rounded-full bg-(--accent-emphasis) text-[0.6rem] font-bold text-background">{index + 1}</span>
            </span>
            <span className="text-xs font-semibold leading-tight">{label}</span>
          </motion.li>
        ))}
      </ol>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor={`${id}-host`}>
            Your name
            <input id={`${id}-host`} value={hostName} maxLength={CONNECT_NAME_MAX} autoComplete="name" aria-invalid={error ? true : undefined}
              onChange={(event) => { setHostName(event.target.value); setError(""); }} placeholder="Ms. Rivera" className={cn(field, error && "border-destructive")} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor={`${id}-room`}>
            <span>Room name <span className="font-normal text-muted-foreground">(optional)</span></span>
            <input id={`${id}-room`} value={roomName} maxLength={CONNECT_ROOM_NAME_MAX} onChange={(event) => setRoomName(event.target.value)}
              placeholder={hostName.trim() ? `${hostName.trim()}'s room` : "Period 3 typing"} className={field} />
          </label>
        </div>
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <button type="submit" disabled={pending}
          className="group flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-6 font-bold text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40">
          {pending ? <CircleNotchIcon className="size-5 animate-spin" aria-hidden="true" /> : <PlusIcon className="size-5" aria-hidden="true" />}
          {pending ? "Making your room…" : "Create room"}
          {!pending && <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />}
        </button>
      </form>
    </LabCard>
  );
}

type RecentRow = { id: string; name: string; live: boolean; code: string; detail: string; tests: number; onOpen: () => void };

function RecentRoomsCard({ room, onResume, onReopen, onCreate }: { room: MockRoom; onResume: () => void; onReopen: () => void; onCreate: (name: string) => void }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const rows: RecentRow[] = [
    { id: "current", name: room.name, live: !room.ended, code: room.code, detail: room.ended ? "Ended just now" : "", tests: room.tests.length, onOpen: room.ended ? onReopen : onResume },
    ...RECENT_ROOMS.map((recent) => ({ ...recent, live: false, code: "", detail: recent.ago, onOpen: () => onCreate(recent.name) })),
  ];
  const open = (row: RecentRow) => {
    setPendingId(row.id);
    setTimeout(row.onOpen, row.live ? 0 : 500);
  };
  return (
    <LabCard title="Your recent rooms" description={`From the last ${CONNECT_ARCHIVE_HOURS} hours. Reopening an ended room keeps its tests and gives it a new code.`} Icon={ClockCounterClockwiseIcon} tile="bg-muted-foreground text-background">
      <ul className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <motion.li key={row.id} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...LAB_SPRING, delay: 0.15 + index * 0.06 }}
            className={cn("flex items-center gap-3 rounded-2xl border p-3", row.live ? "border-success/40 bg-success/5" : "border-border")}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{row.name}</p>
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                {row.live ? (
                  <>
                    <span className="flex items-center gap-1 font-bold text-success"><span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-current" />Live</span>
                    <span className="rounded-md bg-muted px-1.5 font-mono font-bold tracking-widest text-foreground">{row.code}</span>
                  </>
                ) : <span>{row.detail}</span>}
                <span>{row.tests} tests</span>
              </p>
            </div>
            <button type="button" onClick={() => open(row)} disabled={pendingId !== null} aria-label={`${row.live ? "Resume" : "Reopen"} ${row.name}`}
              className={cn("flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60",
                row.live ? "bg-success text-background hover:opacity-90" : "border border-border hover:bg-accent")}>
              {pendingId === row.id ? <CircleNotchIcon className="size-4 animate-spin" aria-hidden="true" />
                : row.live ? <PlayIcon weight="fill" className="size-4" aria-hidden="true" /> : <ArrowArcRightIcon className="size-4" aria-hidden="true" />}
              {row.live ? "Resume" : "Reopen"}
            </button>
          </motion.li>
        ))}
      </ul>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <SignInIcon className="size-4 shrink-0" aria-hidden="true" />
        <span><button type="button" className="font-semibold text-foreground underline underline-offset-4 hover:text-primary">Sign in</button> to reopen rooms you host from any device.</span>
      </p>
    </LabCard>
  );
}

function Hero() {
  return (
    <header className="flex flex-col items-center gap-4 text-center">
      <ul className="flex -space-x-3" aria-hidden="true">
        {HERO_FACES.map((name, index) => (
          <motion.li key={name} initial={{ opacity: 0, y: 20, scale: 0.5 }} animate={{ opacity: 1, y: [0, -6, 0], scale: 1 }}
            transition={{ opacity: { delay: index * 0.07 }, scale: { ...LAB_SPRING, delay: index * 0.07 }, y: { duration: 2.6, repeat: Infinity, delay: index * 0.3, ease: "easeInOut" } }}>
            <KidAvatar name={name} size="lg" className="ring-4 ring-background" />
          </motion.li>
        ))}
      </ul>
      <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
        <UsersThreeIcon weight="fill" className="size-4" aria-hidden="true" />Connect
      </span>
      <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Type together, live.</h1>
      <p className="max-w-xl text-muted-foreground">Join your class with a code, or host a room and watch everyone type in real time.</p>
    </header>
  );
}

/** Landing: join with a code (the common case for students), or host and reopen recent rooms. */
export function ConnectLanding({ room, onJoin, onHost }: { room: MockRoom; onJoin: (name: string, signedIn: boolean) => void; onHost: () => void }) {
  const create = (host: string, name: string) => { room.actions.create(host, name); onHost(); };
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pt-8 md:px-6 md:pt-12">
      <Hero />
      <div className="grid items-start gap-5 md:grid-cols-2">
        <JoinCodeCard room={room} onJoin={onJoin} className="border-primary/30 shadow-[0_20px_60px_-30px_var(--primary)]" />
        <div className="flex min-w-0 flex-col gap-5">
          <HostCard onCreate={create} />
          <RecentRoomsCard room={room} onResume={onHost} onReopen={() => { room.actions.reopen(); onHost(); }} onCreate={(name) => create(room.host, name)} />
        </div>
      </div>
    </main>
  );
}
