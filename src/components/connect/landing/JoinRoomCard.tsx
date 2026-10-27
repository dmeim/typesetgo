import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircleIcon, CircleNotchIcon, SignInIcon, UsersThreeIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { api } from "../../../../convex/_generated/api";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";
import { useSessionId } from "@/hooks/useSessionId";
import { CONNECT_CODE_LENGTH, CONNECT_NAME_MAX } from "@/lib/connect-types";
import { loadParticipantName, saveMembership } from "@/lib/connect-membership";
import { useAccount } from "@/components/layout/useAccount";
import { useAppAuth } from "@/components/layout/useAppAuth";
import { ConnectAvatar } from "@/components/connect/ConnectAvatar";
import { ConnectCard } from "@/components/connect/ConnectParts";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";
import { CodeBoxes, type CodeLookup } from "./CodeBoxes";
import { FormError } from "./FormError";
import { joinErrorMessage, sanitizeCode } from "./landing-helpers";

type FoundRoom = { name: string; hostName: string };

function LookupLine({ lookup, id, room }: { lookup: CodeLookup; id: string; room: FoundRoom | null | undefined }) {
  const content = {
    typing: <p className="text-sm text-muted-foreground">Ask your teacher for the <span className="whitespace-nowrap">{CONNECT_CODE_LENGTH}-character</span> code.</p>,
    checking: <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><CircleNotchIcon className="size-4 animate-spin" aria-hidden="true" />Looking for that room…</p>,
    missing: <p className="flex items-center justify-center gap-2 text-sm font-medium text-destructive"><WarningCircleIcon weight="fill" className="size-5 shrink-0" aria-hidden="true" />Hmm, no room with that code. Check the letters?</p>,
    found: room ? (
      <div className="flex items-center gap-3 rounded-2xl bg-success/10 p-3 text-left">
        <ConnectAvatar name={room.hostName} className="size-10 text-base" />
        <p className="min-w-0 flex-1 text-sm">
          <span className="flex items-center gap-1.5 font-bold text-success"><CheckCircleIcon weight="fill" className="size-4" aria-hidden="true" />Found it!</span>
          <span className="block truncate"><strong>{room.name}</strong> <span className="text-muted-foreground">with {room.hostName}</span></span>
        </p>
      </div>
    ) : null,
  }[lookup];
  return (
    <div id={id} aria-live="polite" className="min-h-12 text-center">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={lookup} initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={CONNECT_SPRING}>
          {content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

type JoinAccount = { name: string; avatarUrl?: string };

/** Signed in: the account's name and picture are used, so only the code is needed. */
function JoiningAs({ account, onGuest }: { account: JoinAccount | undefined; onGuest: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3" aria-live="polite">
      {account
        ? <ConnectAvatar name={account.name} avatarUrl={account.avatarUrl} className="size-10 text-base" />
        : <CircleNotchIcon className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />}
      <p className="min-w-0 flex-1 text-sm">
        <span className="block truncate">{account ? <>Joining as <strong>{account.name}</strong></> : "Checking your account…"}</span>
        <span className="block text-xs text-muted-foreground">Your name and profile picture come from your account.</span>
      </p>
      <button type="button" onClick={onGuest}
        className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        Use a name
      </button>
    </div>
  );
}

const field = "h-12 min-w-0 flex-1 rounded-2xl border border-input bg-background px-4 text-base outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20";

export function JoinRoomCard({ initialCode = "", focusName = false }: {
  initialCode?: string;
  /** Focuses the name field once the room is found, used when the code arrives in the link. */
  focusName?: boolean;
}) {
  const id = useId();
  const navigate = useNavigate();
  const credential = useMultiplayerCredential();
  const sessionId = useSessionId();
  const join = useMutation(api.connect.join);
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(loadParticipantName);
  const [code, setCode] = useState(() => sanitizeCode(initialCode));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [asGuest, setAsGuest] = useState(false);
  const auth = useAppAuth();
  const accountState = useAccount();
  const signedIn = auth.isSignedIn && accountState.status !== "unavailable" && accountState.status !== "error";
  const account = useQuery(api.connect.joinAccount, signedIn && accountState.status === "ready" ? {} : "skip");
  // A signed-in player without a synced account row yet falls back to typing a name.
  const asAccount = signedIn && !asGuest && account !== null;
  const complete = code.length === CONNECT_CODE_LENGTH;
  const room = useQuery(api.connect.lookupCode, complete ? { code } : "skip");
  const lookup: CodeLookup = !complete ? "typing" : room === undefined ? "checking" : room === null ? "missing" : "found";
  // Guests are asked for a name once the room is found; a signed-in player who chose a name sees the field straight away.
  const showName = !asAccount && (lookup === "found" || (signedIn && asGuest));
  const ready = lookup === "found" && (asAccount ? Boolean(account) : name.trim().length > 0);

  useEffect(() => {
    if (focusName && showName) nameRef.current?.focus();
  }, [focusName, showName]);

  const switchToName = () => {
    setAsGuest(true);
    setError("");
    requestAnimationFrame(() => nameRef.current?.focus());
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || pending) return;
    const trimmed = name.trim();
    setPending(true);
    setError("");
    try {
      const result = asAccount
        ? await join({ code, sessionId, credential, asAccount: true })
        : await join({ code, name: trimmed, sessionId, credential });
      saveMembership(result.roomId, { participantId: result.participantId, name: asAccount ? result.name : trimmed }, { rememberName: !asAccount });
      navigate(`/connect/room/${result.roomId}`);
    } catch (caught) {
      setError(joinErrorMessage(caught));
      setPending(false);
    }
  };

  return (
    <ConnectCard title="Join a room" description={asAccount ? "Got a code? Pop it in and type along with your class." : "Got a code? Pop it in, then tell us your name."} Icon={UsersThreeIcon} bare hideHeader>
      <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <label htmlFor={`${id}-code`} className="sr-only">Room code</label>
          <CodeBoxes code={code} onChange={(next) => { setCode(next); setError(""); }} lookup={lookup} inputId={`${id}-code`} describedBy={`${id}-lookup`} />
          <LookupLine lookup={lookup} id={`${id}-lookup`} room={room} />
        </div>
        {asAccount && <JoiningAs account={account} onGuest={switchToName} />}
        <AnimatePresence initial={false}>
          {showName && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={CONNECT_SPRING} className="overflow-hidden">
              <div className="flex flex-col gap-2 p-1">
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor={`${id}-name`} className="text-sm font-semibold">What should we call you?</label>
                  {signedIn && account && (
                    <button type="button" className="text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring" onClick={() => setAsGuest(false)}>
                      Use my account
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <ConnectAvatar name={name.trim() || "?"} className="size-10 text-base" />
                  <input ref={nameRef} id={`${id}-name`} value={name} maxLength={CONNECT_NAME_MAX} autoComplete="nickname" placeholder="Your first name"
                    onChange={(event) => { setName(event.target.value); setError(""); }} className={field} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <FormError>{error}</FormError>
        <motion.button layout type="submit" disabled={!ready || pending} transition={CONNECT_SPRING}
          className="flex h-13 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40">
          {pending ? <CircleNotchIcon className="size-5 animate-spin" aria-hidden="true" /> : <SignInIcon className="size-5" aria-hidden="true" />}
          {pending ? "Joining…" : "Join room"}
        </motion.button>
      </form>
    </ConnectCard>
  );
}
