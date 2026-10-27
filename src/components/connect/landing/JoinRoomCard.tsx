import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { CheckCircleIcon, CircleNotchIcon, SignInIcon, UsersThreeIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";
import { useSessionId } from "@/hooks/useSessionId";
import { CONNECT_CODE_LENGTH, CONNECT_NAME_MAX } from "@/lib/connect-types";
import { loadParticipantName, saveMembership } from "@/lib/connect-membership";
import { cn } from "@/lib/utils";
import { useAccount } from "@/components/layout/useAccount";
import { useAppAuth } from "@/components/layout/useAppAuth";
import { ConnectAvatar } from "@/components/connect/ConnectAvatar";
import { FormError, LandingCard } from "@/components/connect/landing/LandingCard";
import { joinErrorMessage, sanitizeCode } from "@/components/connect/landing/landing-helpers";

function CodePreview({ code }: { code: string }) {
  const complete = code.length === CONNECT_CODE_LENGTH;
  const room = useQuery(api.connect.lookupCode, complete ? { code } : "skip");
  if (!complete) return <p className="min-h-5 text-sm text-muted-foreground">Enter the {CONNECT_CODE_LENGTH}-character code from your host.</p>;
  if (room === undefined) {
    return (
      <p className="flex min-h-5 items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
        <CircleNotchIcon className="size-4 animate-spin" aria-hidden="true" />
        Looking up room…
      </p>
    );
  }
  if (room === null) {
    return (
      <p className="flex min-h-5 items-center gap-2 text-sm text-destructive" aria-live="polite">
        <WarningCircleIcon className="size-4 shrink-0" aria-hidden="true" />
        No live room with this code
      </p>
    );
  }
  return (
    <p className="flex min-h-5 min-w-0 items-center gap-2 text-sm" aria-live="polite">
      <CheckCircleIcon weight="fill" className="size-4 shrink-0 text-success" aria-hidden="true" />
      <span className="min-w-0">
        Joining <strong className="font-semibold [overflow-wrap:anywhere]">{room.name}</strong>
        <span className="text-muted-foreground"> hosted by </span>
        <strong className="font-semibold [overflow-wrap:anywhere]">{room.hostName}</strong>
      </span>
    </p>
  );
}

type JoinAccount = { name: string; avatarUrl?: string };

/** Signed in: the account's name and picture are used, so only the code is needed. */
function JoiningAs({ account, onGuest }: { account: JoinAccount | undefined; onGuest: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3" aria-live="polite">
      {account ? <ConnectAvatar name={account.name} avatarUrl={account.avatarUrl} className="text-base" /> : <CircleNotchIcon className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />}
      <div className="min-w-0 flex-1 text-sm">
        <p className="truncate">{account ? <>Joining as <strong className="font-semibold">{account.name}</strong></> : "Checking your account…"}</p>
        <p className="text-xs text-muted-foreground">Your name and picture come from your account.</p>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onGuest}>Use a name</Button>
    </div>
  );
}

export function JoinRoomCard({ initialCode = "", focusName = false, highlighted = false, className }: {
  initialCode?: string;
  /** Focuses the name field, used when the code arrives in the link. */
  focusName?: boolean;
  highlighted?: boolean;
  className?: string;
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

  useEffect(() => {
    if (focusName && !asAccount) nameRef.current?.focus();
  }, [focusName, asAccount]);

  const switchToName = () => {
    setAsGuest(true);
    setError("");
    requestAnimationFrame(() => nameRef.current?.focus());
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (asAccount && !account) return;
    if (!asAccount && !trimmed) {
      setError("Enter your name so the host knows who you are.");
      return;
    }
    if (code.length !== CONNECT_CODE_LENGTH) {
      setError(`Enter the ${CONNECT_CODE_LENGTH}-character room code.`);
      return;
    }
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
    <LandingCard
      labelledBy={`${id}-title`}
      title="Join a room"
      description="Type along with your class using the settings your host picked."
      icon={<UsersThreeIcon className="size-5" />}
      highlighted={highlighted}
      className={className}
    >
      <form className="space-y-4" onSubmit={(event) => void submit(event)} noValidate>
        {asAccount ? <JoiningAs account={account} onGuest={switchToName} /> : (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor={`${id}-name`}>Your name</Label>
            {signedIn && account && (
              <button type="button" className="text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring" onClick={() => setAsGuest(false)}>
                Use my account
              </button>
            )}
          </div>
          <Input
            ref={nameRef}
            id={`${id}-name`}
            value={name}
            maxLength={CONNECT_NAME_MAX}
            autoComplete="nickname"
            placeholder="Alex"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        )}
        <div className="space-y-2">
          <Label htmlFor={`${id}-code`}>Room code</Label>
          <Input
            id={`${id}-code`}
            value={code}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={CONNECT_CODE_LENGTH}
            placeholder="ABCD"
            aria-describedby={`${id}-preview`}
            className={cn("h-14 text-center font-mono text-3xl font-semibold uppercase tracking-[0.5em] indent-[0.5em] md:text-3xl", "placeholder:text-muted-foreground")}
            onChange={(event) => setCode(sanitizeCode(event.target.value))}
          />
          <div id={`${id}-preview`}><CodePreview code={code} /></div>
        </div>
        <FormError>{error}</FormError>
        <Button type="submit" className="w-full" disabled={pending || (asAccount && !account)}>
          {pending ? <CircleNotchIcon className="animate-spin" aria-hidden="true" /> : <SignInIcon aria-hidden="true" />}
          {pending ? "Joining…" : "Join room"}
        </Button>
      </form>
    </LandingCard>
  );
}
