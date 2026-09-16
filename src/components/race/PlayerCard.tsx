import { useState } from "react";
import { Crown, Check } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import { tv } from "@/lib/theme-vars";
import { RaceError } from "./RaceState";

interface PlayerCardProps {
  name: string;
  emoji: string;
  isReady: boolean;
  isHost: boolean;
  isCurrentUser: boolean;
  isCountingDown?: boolean;
  countdownValue?: number;
  pending?: boolean;
  onReadyToggle?: () => void;
  onEmojiChange?: (emoji: string) => void;
  onNameChange?: (name: string) => Promise<boolean>;
}

export default function PlayerCard({
  name,
  emoji,
  isReady,
  isHost,
  isCurrentUser,
  isCountingDown = false,
  countdownValue,
  pending = false,
  onReadyToggle,
  onEmojiChange,
  onNameChange,
}: PlayerCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [nameError, setNameError] = useState("");
  const locked = pending || isCountingDown;

  return (
    <article
      className="min-w-0 rounded-xl p-4 flex flex-col items-center gap-3"
      style={{
        backgroundColor: tv.ui.secondary,
        border: `1px solid ${isReady ? tv.status.success.DEFAULT : tv.ui.border}`,
        color: tv.ui.foreground,
      }}
    >
      <div
        className="flex items-center gap-1 text-xs min-h-4"
        style={{ color: tv.ui.mutedForeground }}
      >
        {isHost && (
          <>
            <Crown size={14} aria-hidden="true" /> Host
          </>
        )}
        {isCurrentUser && <span>{isHost ? " · " : ""}You</span>}
      </div>
      {isCurrentUser && onEmojiChange ? (
        <EmojiPicker
          selectedEmoji={emoji}
          onSelect={onEmojiChange}
          disabled={locked || isReady}
        />
      ) : (
        <div
          className="size-12 flex items-center justify-center text-2xl"
          aria-hidden="true"
        >
          {emoji}
        </div>
      )}
      {isCurrentUser && !isReady && !isCountingDown && onNameChange ? (
        isEditingName ? (
          <form
            className="w-full space-y-2"
            onSubmit={async (event) => {
              event.preventDefault();
              if (pending) return;
              if (!editedName.trim()) {
                setNameError("Enter a racer name.");
                return;
              }
              setNameError("");
              if (await onNameChange(editedName.trim()))
                setIsEditingName(false);
            }}
          >
            <label className="sr-only" htmlFor="racer-name">
              Racer name
            </label>
            <input
              id="racer-name"
              autoFocus
              value={editedName}
              disabled={pending}
              onChange={(event) => setEditedName(event.target.value)}
              maxLength={30}
              className="w-full rounded border px-2 py-1"
              style={{ backgroundColor: tv.ui.card, borderColor: tv.ui.border }}
            />
            <RaceError>{nameError}</RaceError>
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              <button disabled={pending} type="submit">
                {pending ? "Saving…" : "Save"}
              </button>
              <button
                disabled={pending}
                type="button"
                onClick={() => setIsEditingName(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            disabled={pending}
            aria-label={`Edit racer name: ${name}`}
            onClick={() => {
              setEditedName(name);
              setIsEditingName(true);
            }}
            className="max-w-full font-semibold break-words [overflow-wrap:anywhere] underline decoration-dotted underline-offset-4"
          >
            {name}
          </button>
        )
      ) : (
        <p className="max-w-full text-center font-semibold [overflow-wrap:anywhere]">
          {name}
        </p>
      )}
      {isCurrentUser && onReadyToggle ? (
        <button
          disabled={locked}
          onClick={onReadyToggle}
          aria-pressed={isReady}
          className="mt-auto w-full min-h-10 px-2 py-2 rounded-lg font-semibold disabled:opacity-50"
          style={{
            backgroundColor: isReady ? tv.ui.secondary : tv.ui.primary,
            color: isReady ? tv.ui.foreground : tv.ui.primaryForeground,
          }}
        >
          {pending
            ? "Saving…"
            : isCountingDown
              ? `Starting in ${countdownValue}…`
              : isReady
                ? "Ready · Undo"
                : "Ready Up"}
        </button>
      ) : (
        <p
          className="mt-auto text-sm flex items-center gap-1"
          style={{
            color: isReady ? tv.ui.foreground : tv.ui.mutedForeground,
          }}
        >
          {isReady && <Check size={14} />}
          {isReady ? "Ready" : "Waiting"}
        </p>
      )}
    </article>
  );
}
