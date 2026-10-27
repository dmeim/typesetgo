import { useId, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRightIcon, CircleNotchIcon, FlagCheckeredIcon, PlusIcon, ShareNetworkIcon, SignInIcon, SlidersHorizontalIcon, UsersThreeIcon,
} from "@phosphor-icons/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Pills, type PillOption } from "@/components/connect/ConnectParts";
import { useAppAuth } from "@/components/layout/useAppAuth";
import { BOUNCY_SPRING, RACE_SPRING } from "@/components/race/race-format";
import { RACE_PRIMARY_BUTTON, RacerAvatar } from "@/components/race/RaceParts";
import { RaceError, RaceShell } from "@/components/race/RaceState";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";
import { useSessionId } from "@/hooks/useSessionId";
import { cn } from "@/lib/utils";

type Mode = "join" | "host";

const MODES: PillOption<Mode>[] = [
  { value: "join", label: "Join a race", short: "Join", Icon: SignInIcon },
  { value: "host", label: "Host a race", short: "Host", Icon: UsersThreeIcon },
];

// Join sits on the left and host on the right, so each side slides in from its own edge.
const SLIDE = {
  enter: (mode: Mode) => ({ opacity: 0, x: mode === "join" ? -40 : 40 }),
  center: { opacity: 1, x: 0 },
  exit: (mode: Mode) => ({ opacity: 0, x: mode === "join" ? -40 : 40 }),
};

const HERO_RACERS = [
  { emoji: "🐆", color: "var(--accent-emphasis)" },
  { emoji: "⚡", color: "var(--warning)" },
  { emoji: "🏎️", color: "var(--primary)" },
  { emoji: "🚀", color: "var(--success)" },
  { emoji: "🦊", color: "var(--secondary-emphasis)" },
];

const HOST_STEPS = [
  { Icon: SlidersHorizontalIcon, label: "Pick words" },
  { Icon: ShareNetworkIcon, label: "Share code" },
  { Icon: FlagCheckeredIcon, label: "Ready, go" },
];

const field = "h-12 w-full min-w-0 rounded-2xl border border-input bg-background px-4 text-base outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-60";

function Hero() {
  return (
    <header className="flex flex-col items-center gap-4 text-center">
      <ul className="flex -space-x-2" aria-hidden="true">
        {HERO_RACERS.map((racer, index) => (
          <motion.li key={racer.emoji} initial={{ opacity: 0, y: 20, scale: 0.5 }} animate={{ opacity: 1, y: [0, -7, 0], scale: 1 }}
            transition={{ opacity: { delay: index * 0.07 }, scale: { ...BOUNCY_SPRING, delay: index * 0.07 }, y: { duration: 2.4, repeat: Infinity, delay: index * 0.25, ease: "easeInOut" } }}>
            <RacerAvatar emoji={racer.emoji} color={racer.color} size="md" className="ring-4 ring-background sm:size-16 sm:text-3xl" />
          </motion.li>
        ))}
      </ul>
      <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
        <FlagCheckeredIcon weight="fill" className="size-4" aria-hidden="true" />Race
      </span>
      <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Race your friends.</h1>
      <p className="max-w-md text-muted-foreground">Same words, same start. First to the end wins. Got a code? Jump in. Starting one? Flip to host.</p>
    </header>
  );
}

/** Landing: one card that opens on joining, with a switch over to hosting (like Connect). */
export default function Race() {
  const id = useId();
  const { user, isLoaded } = useAppAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = useSessionId();
  const credential = useMultiplayerCredential();
  const createRoom = useMutation(api.rooms.create);
  const joinRoom = useMutation(api.participants.join);
  const [mode, setMode] = useState<Mode>("join");
  const [draftName, setDraftName] = useState<string | null>(searchParams.get("name"));
  const [code, setCode] = useState((searchParams.get("code") ?? "").toUpperCase().slice(0, 6));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [createdRoom, setCreatedRoom] = useState<{ roomId: Id<"rooms">; code: string } | null>(null);
  const name = draftName ?? (user?.username?.trim() || user?.firstName?.trim() || "").slice(0, 30);
  const host = mode === "host";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pendingRef.current || !isLoaded) return;
    if (!name.trim()) { setError("Pick a racer name first."); return; }
    if (!host && !code.trim()) { setError("Enter the code your host shared."); return; }
    pendingRef.current = true;
    setPending(true);
    setError("");
    let roomToJoin = createdRoom;
    try {
      if (host && !roomToJoin) {
        roomToJoin = await createRoom({ credential, hostName: name.trim(), hostSessionId: sessionId, gameMode: "race" });
        setCreatedRoom(roomToJoin);
      }
      const joined = await joinRoom({
        credential,
        roomCode: host ? roomToJoin!.code : code.trim().toUpperCase(),
        sessionId,
        name: name.trim(),
        gameMode: "race",
      });
      if (!joined?.room) throw new Error("No room returned");
      navigate(`/race/lobby/${joined.room._id}`);
    } catch {
      setError(host
        ? roomToJoin
          ? `Room ${roomToJoin.code} was created, but you could not join. Retry to enter the same room.`
          : "Could not create the race. Try again."
        : "Could not join this race. Check the code and try again.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const SubmitIcon = pending ? CircleNotchIcon : host && !createdRoom ? PlusIcon : SignInIcon;
  const submitLabel = pending
    ? host ? "Making your race…" : "Joining…"
    : host ? createdRoom ? "Retry joining your room" : "Create race" : "Join race";

  return (
    <RaceShell className="max-w-xl gap-8 md:pt-12">
      <Hero />
      <motion.form layout onSubmit={submit} noValidate transition={RACE_SPRING} aria-label={host ? "Host a race" : "Join a race"}
        className={cn("flex min-w-0 flex-col gap-5 overflow-hidden rounded-3xl border bg-card p-4 text-card-foreground transition-[border-color,box-shadow] sm:p-6",
          host ? "border-border shadow-[0_20px_60px_-30px_var(--accent-emphasis)]" : "border-primary/30 shadow-[0_20px_60px_-30px_var(--primary)]")}>
        <Pills<Mode> label="Join or host" value={mode} onChange={(next) => { setMode(next); setError(""); }} size="lg" options={MODES} disabled={pending} />
        <AnimatePresence mode="popLayout" initial={false} custom={mode}>
          <motion.div key={mode} custom={mode} variants={SLIDE} initial="enter" animate="center" exit="exit" transition={RACE_SPRING} className="flex min-w-0 flex-col gap-4">
            {host && (
              <ol className="grid grid-cols-3 gap-2" aria-label="How hosting works">
                {HOST_STEPS.map(({ Icon, label }, index) => (
                  <li key={label} className="flex flex-col items-center gap-1.5 rounded-2xl bg-muted/50 px-1 py-3 text-center">
                    <span className="relative flex size-9 items-center justify-center rounded-full bg-background">
                      <Icon className="size-5" aria-hidden="true" />
                      <span aria-hidden="true" className="absolute -right-1 -top-1 flex size-4.5 items-center justify-center rounded-full bg-primary text-[0.6rem] font-bold text-primary-foreground">{index + 1}</span>
                    </span>
                    <span className="text-xs font-semibold leading-tight">{label}</span>
                  </li>
                ))}
              </ol>
            )}
            <div className={cn("grid gap-3", !host && "sm:grid-cols-2")}>
              <div className="flex min-w-0 flex-col gap-1.5">
                <label htmlFor={`${id}-name`} className="text-sm font-semibold">Racer name</label>
                <input id={`${id}-name`} value={name} maxLength={30} autoComplete="nickname" disabled={pending || !isLoaded} aria-describedby={`${id}-name-hint`}
                  onChange={(event) => { setDraftName(event.target.value); setError(""); }} className={field} />
                <span id={`${id}-name-hint`} className="text-xs text-muted-foreground">This is how other racers see you.</span>
              </div>
              {!host && (
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label htmlFor={`${id}-code`} className="text-sm font-semibold">Room code</label>
                  <input id={`${id}-code`} value={code} maxLength={6} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="ZOOM42" disabled={pending}
                    onChange={(event) => { setCode(event.target.value.toUpperCase()); setError(""); }}
                    className={cn(field, "text-center font-bold uppercase tracking-[0.3em] placeholder:text-muted-foreground/40")} />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
        <RaceError>{error}</RaceError>
        <button type="submit" disabled={pending || !isLoaded} className={RACE_PRIMARY_BUTTON}>
          <SubmitIcon className={cn("size-5", pending && "motion-safe:animate-spin")} aria-hidden="true" />
          {submitLabel}
          {!pending && <ArrowRightIcon className="size-4 transition-transform motion-safe:group-hover:translate-x-1" aria-hidden="true" />}
        </button>
      </motion.form>
    </RaceShell>
  );
}
