import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { ArrowLeftIcon, CircleNotchIcon, FlagCheckeredIcon, SignInIcon } from "@phosphor-icons/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import Header from "@/components/layout/Header";
import { useAppAuth } from "@/components/layout/useAppAuth";
import { RaceError } from "@/components/race/RaceState";
import { useSessionId } from "@/hooks/useSessionId";
import { tv } from "@/lib/theme-vars";

function RaceEntryCard({ host }: { host: boolean }) {
  const { user, isLoaded } = useAppAuth();
  const [searchParams] = useSearchParams();
  const [draftName, setDraftName] = useState<string | null>(
    host ? null : searchParams.get("name"),
  );
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const pendingRef = useRef(false);
  const [createdRoom, setCreatedRoom] = useState<{
    roomId: Id<"rooms">;
    code: string;
  } | null>(null);
  const navigate = useNavigate();
  const sessionId = useSessionId();
  const createRoom = useMutation(api.rooms.create);
  const joinRoom = useMutation(api.participants.join);
  const name =
    draftName ??
    (user?.username?.trim() || user?.firstName?.trim() || "").slice(0, 30);
  const valid =
    isLoaded && name.trim().length > 0 && (host || code.trim().length > 0);
  const prefix = host ? "host" : "join";
  const Icon = host ? FlagCheckeredIcon : SignInIcon;

  return (
    <section
      className="min-w-0 rounded-xl border p-5 sm:p-8"
      aria-labelledby={`${prefix}-title`}
      style={{ backgroundColor: tv.ui.card, borderColor: tv.ui.border }}
    >
      <Icon
        aria-hidden="true"
        size={28}
        className="mb-4"
        style={{ color: tv.ui.primary }}
      />
      <h2 id={`${prefix}-title`} className="text-2xl font-bold mb-2">
        {host ? "Host a race" : "Join a race"}
      </h2>
      <p className="text-sm mb-6" style={{ color: tv.ui.mutedForeground }}>
        {host
          ? "Create a room and invite your friends."
          : "Enter the code shared by your host."}
      </p>
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!valid || pendingRef.current) return;
          pendingRef.current = true;
          setPending(true);
          setError("");
          let roomToJoin = createdRoom;
          try {
            if (host && !roomToJoin) {
              roomToJoin = await createRoom({
                hostName: name.trim(),
                hostSessionId: sessionId,
                gameMode: "race",
              });
              setCreatedRoom(roomToJoin);
            }
            const joined = await joinRoom({
              roomCode: host ? roomToJoin!.code : code.trim().toUpperCase(),
              sessionId,
              name: name.trim(),
              gameMode: "race",
            });
            if (!joined?.room) throw new Error("No room returned");
            navigate(`/race/lobby/${joined.room._id}`);
          } catch {
            setError(
              host
                ? roomToJoin
                  ? `Room ${roomToJoin.code} was created, but you could not join. Retry to enter the same room.`
                  : "Could not create the race. Try again."
                : "Could not join this race. Check the code and try again.",
            );
          } finally {
            pendingRef.current = false;
            setPending(false);
          }
        }}
      >
        <div>
          <label
            htmlFor={`${prefix}-name`}
            className="block text-sm font-medium mb-2"
          >
            Racer name
          </label>
          <input
            id={`${prefix}-name`}
            value={name}
            onChange={(event) => setDraftName(event.target.value)}
            required
            maxLength={30}
            disabled={pending || !isLoaded}
            autoComplete="nickname"
            className="w-full min-w-0 rounded-lg border px-3 py-3 disabled:opacity-50"
            style={{
              backgroundColor: tv.ui.secondary,
              color: tv.ui.foreground,
              borderColor: tv.ui.border,
            }}
          />
          <p className="text-xs mt-2" style={{ color: tv.ui.mutedForeground }}>
            This is how other racers will see you.
          </p>
        </div>
        {!host && (
          <div>
            <label
              htmlFor="race-code"
              className="block text-sm font-medium mb-2"
            >
              Room code
            </label>
            <input
              id="race-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              required
              disabled={pending}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={6}
              className="w-full rounded-lg border px-3 py-3 font-mono uppercase tracking-widest"
              style={{
                backgroundColor: tv.ui.secondary,
                color: tv.ui.foreground,
                borderColor: tv.ui.border,
              }}
            />
          </div>
        )}
        <RaceError>{error}</RaceError>
        <button
          type="submit"
          disabled={!valid || pending}
          className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg font-semibold disabled:opacity-50"
          style={{
            backgroundColor: host ? tv.ui.primary : tv.ui.secondary,
            color: host ? tv.ui.primaryForeground : tv.ui.foreground,
          }}
        >
          {pending ? <CircleNotchIcon className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
            : host && !createdRoom ? <FlagCheckeredIcon className="size-4 shrink-0" aria-hidden="true" />
              : <SignInIcon className="size-4 shrink-0" aria-hidden="true" />}
          {pending
            ? host
              ? "Creating…"
              : "Joining…"
            : host
              ? createdRoom
                ? "Retry joining your room"
                : "Create Race"
              : "Join Race"}
        </button>
      </form>
    </section>
  );
}

export default function Race() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: tv.ui.background, color: tv.ui.foreground }}
    >
      <Header />
      <main className="flex-1 px-4 pt-24 pb-8">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Race Mode</h1>
            <p style={{ color: tv.ui.mutedForeground }}>
              Challenge your friends to a typing race.
            </p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RaceEntryCard host />
            <RaceEntryCard host={false} />
          </div>
          <p className="text-center mt-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 underline underline-offset-4 text-sm"
              style={{ color: tv.ui.mutedForeground }}
            >
              <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
              Back to Typing
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
