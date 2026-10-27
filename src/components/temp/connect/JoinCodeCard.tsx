import { useEffect, useId, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircleIcon, CircleNotchIcon, SignInIcon, SparkleIcon, UserCircleIcon, UsersThreeIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { cn } from "@/lib/utils";
import { CODE_LENGTH, YOUR_ACCOUNT, sanitizeCode } from "./connect-mock";
import { KidAvatar, LabCard, Pills } from "./ConnectParts";

const LOOKUP_MS = 550;
const SHAKE = { x: [0, -12, 12, -8, 8, -3, 0], transition: { duration: 0.45 } };

type Lookup = "typing" | "checking" | "found" | "missing";

/** The one pretend room a code can find. */
export interface JoinableRoom { code: string; name: string; host: string; ended: boolean }

/** Big letter boxes over one real input, so typing, pasting and phone keyboards all work as usual. */
function CodeBoxes({ code, onChange, lookup, inputId, describedBy }: {
  code: string;
  onChange: (code: string) => void;
  lookup: Lookup;
  inputId: string;
  describedBy: string;
}) {
  const [focused, setFocused] = useState(false);
  const found = lookup === "found";
  return (
    <motion.div animate={lookup === "missing" ? SHAKE : { x: 0 }} className="relative mx-auto flex w-fit gap-2 sm:gap-3">
      <input
        id={inputId}
        value={code}
        onChange={(event) => onChange(sanitizeCode(event.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-describedby={describedBy}
        className="absolute inset-0 z-10 w-full cursor-text opacity-0"
      />
      {Array.from({ length: CODE_LENGTH }, (_, index) => {
        const char = code[index];
        const active = focused && index === Math.min(code.length, CODE_LENGTH - 1) && !found;
        return (
          <motion.span
            key={index}
            aria-hidden="true"
            animate={found ? { y: [0, -10, 0], transition: { delay: index * 0.07, duration: 0.4 } } : { y: 0 }}
            className={cn(
              "relative flex h-18 w-14 items-center justify-center rounded-2xl border-2 bg-background text-4xl font-black transition-colors sm:h-22 sm:w-17 sm:text-5xl",
              found ? "border-success bg-success/10 text-success" : lookup === "missing" ? "border-destructive text-destructive" : char ? "border-primary/50 text-foreground" : "border-border text-muted-foreground",
            )}
          >
            {active && <motion.span layoutId="join-code-cursor" transition={LAB_SPRING} className="absolute -inset-1 rounded-[1.2rem] ring-4 ring-primary/40" />}
            <AnimatePresence mode="popLayout" initial={false}>
              {char ? (
                <motion.span key={char} initial={{ scale: 0.3, y: 14, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }} transition={{ type: "spring", stiffness: 600, damping: 22 }}>
                  {char}
                </motion.span>
              ) : active ? (
                <motion.span key="caret" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 1, repeat: Infinity }} className="h-9 w-1 rounded-full bg-primary" />
              ) : null}
            </AnimatePresence>
          </motion.span>
        );
      })}
    </motion.div>
  );
}

function LookupLine({ lookup, id, room }: { lookup: Lookup; id: string; room: JoinableRoom }) {
  const content = {
    typing: (
      <p className="text-sm text-muted-foreground">
        Ask your teacher for the <span className="whitespace-nowrap">{CODE_LENGTH}-letter</span> code. <span className="whitespace-nowrap">{room.ended ? "(The mockup room has ended; reopen it from Host.)" : <>(Psst: try <strong className="font-mono text-foreground">{room.code}</strong>)</>}</span>
      </p>
    ),
    checking: <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><CircleNotchIcon className="size-4 animate-spin" aria-hidden="true" />Looking for that room…</p>,
    missing: <p className="flex items-center justify-center gap-2 text-sm font-medium text-destructive"><WarningCircleIcon weight="fill" className="size-5 shrink-0" aria-hidden="true" />Hmm, no room with that code. Check the letters?</p>,
    found: (
      <div className="flex items-center gap-3 rounded-2xl bg-success/10 p-3 text-left">
        <KidAvatar name={room.host} />
        <p className="min-w-0 flex-1 text-sm">
          <span className="flex items-center gap-1.5 font-bold text-success"><CheckCircleIcon weight="fill" className="size-4" aria-hidden="true" />Found it!</span>
          <span className="block truncate"><strong>{room.name}</strong> <span className="text-muted-foreground">with {room.host}</span></span>
        </p>
      </div>
    ),
  }[lookup];
  return (
    <div id={id} aria-live="polite" className="min-h-12 text-center">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={lookup} initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={LAB_SPRING}>
          {content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Signed in: the account name and picture are used, so only the code is needed. */
function SignedInAs() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
      <KidAvatar name={YOUR_ACCOUNT} photo />
      <p className="min-w-0 flex-1 text-sm">
        <span className="block truncate">Joining as <strong>{YOUR_ACCOUNT}</strong></span>
        <span className="block text-xs text-muted-foreground">Your name and profile picture come from your account.</span>
      </p>
    </div>
  );
}

export function JoinCodeCard({ room, onJoin, bare, className }: { room: JoinableRoom; onJoin: (name: string, signedIn: boolean) => void; bare?: boolean; className?: string }) {
  const id = useId();
  const [signedIn, setSignedIn] = useState(true);
  const [code, setCode] = useState("");
  const [checked, setChecked] = useState("");
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);

  // Pretend to ask the server, so the "looking" state is visible.
  useEffect(() => {
    if (code.length !== CODE_LENGTH) return;
    const timer = setTimeout(() => setChecked(code), LOOKUP_MS);
    return () => clearTimeout(timer);
  }, [code]);

  const lookup: Lookup = code.length < CODE_LENGTH ? "typing" : checked !== code ? "checking" : code === room.code && !room.ended ? "found" : "missing";
  const ready = lookup === "found" && (signedIn || name.trim().length > 0);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready || joining) return;
    setJoining(true);
    setTimeout(() => onJoin(signedIn ? YOUR_ACCOUNT : name.trim(), signedIn), 700);
  };

  return (
    <LabCard title="Join a room" description={signedIn ? "Got a code? Pop it in and type along with your class." : "Got a code? Pop it in, then tell us your name."} Icon={UsersThreeIcon} bare={bare} hideHeader={bare} className={className}>
      <div role="group" aria-label="Mockup controls" className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-border p-1.5 pl-3 text-xs text-muted-foreground">
        <span>Pretend you're</span>
        <Pills<"in" | "guest"> label="Signed in or guest" value={signedIn ? "in" : "guest"} onChange={(value) => setSignedIn(value === "in")} className="min-w-48 flex-1"
          options={[{ value: "in", label: "Signed in", Icon: UserCircleIcon }, { value: "guest", label: "Guest" }]} />
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <label htmlFor={`${id}-code`} className="sr-only">Room code</label>
          <CodeBoxes code={code} onChange={setCode} lookup={lookup} inputId={`${id}-code`} describedBy={`${id}-lookup`} />
          <LookupLine lookup={lookup} id={`${id}-lookup`} room={room} />
        </div>
        {signedIn && <SignedInAs />}
        <AnimatePresence initial={false}>
          {lookup === "found" && !signedIn && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={LAB_SPRING} className="overflow-hidden">
              <div className="flex flex-col gap-2 pb-1">
                <label htmlFor={`${id}-name`} className="text-sm font-semibold">What should we call you?</label>
                <div className="flex items-center gap-3">
                  <KidAvatar name={name.trim() || "?"} />
                  <input id={`${id}-name`} value={name} onChange={(event) => setName(event.target.value.slice(0, 32))} placeholder="Your first name" autoComplete="nickname"
                    className="h-12 min-w-0 flex-1 rounded-2xl border border-input bg-background px-4 text-base outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button layout type="submit" disabled={!ready || joining} transition={LAB_SPRING}
          className="flex h-13 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={joining ? "joining" : "join"} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={LAB_SPRING} className="flex items-center gap-2">
              {joining ? <SparkleIcon weight="fill" className="size-5" aria-hidden="true" /> : <SignInIcon className="size-5" aria-hidden="true" />}
              {joining ? "You're in!" : "Join room"}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </form>
    </LabCard>
  );
}
