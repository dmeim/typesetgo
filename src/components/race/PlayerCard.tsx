// src/components/race/PlayerCard.tsx
// Player card component for the race lobby
import { useState } from "react";
import EmojiPicker from "./EmojiPicker";
import { tv } from "@/lib/theme-vars";
import { Crown, Check, Loader2 } from "lucide-react";

interface PlayerCardProps {
  name: string;
  emoji: string;
  isReady: boolean;
  isHost: boolean;
  isCurrentUser: boolean;
  isCountingDown?: boolean;
  countdownValue?: number;
  onReadyToggle?: () => void;
  onEmojiChange?: (emoji: string) => void;
  onNameChange?: (name: string) => void;
}

export default function PlayerCard({
  name,
  emoji,
  isReady,
  isHost,
  isCurrentUser,
  isCountingDown = false,
  countdownValue,
  onReadyToggle,
  onEmojiChange,
  onNameChange,
}: PlayerCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(name);

  const handleNameSubmit = () => {
    if (editedName.trim() && onNameChange) {
      onNameChange(editedName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <div
      className="relative rounded-xl p-4 flex flex-col items-center gap-3 transition-all duration-300"
      style={{
        backgroundColor: tv.bg.surface,
        border: `2px solid ${isReady ? tv.status.success.DEFAULT : tv.border.default}`,
        boxShadow: isReady ? `0 0 20px ${tv.status.success.muted}` : "none",
      }}
    >
      {/* Host crown */}
      {isHost && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2"
          style={{ color: tv.status.warning.DEFAULT }}
        >
          <Crown size={24} fill={tv.status.warning.DEFAULT} />
        </div>
      )}

      {/* Ready indicator */}
      {isReady && !isCountingDown && (
        <div
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: tv.status.success.DEFAULT }}
        >
          <Check size={14} color={tv.text.inverse} strokeWidth={3} />
        </div>
      )}

      {/* Emoji avatar */}
      {isCurrentUser && onEmojiChange ? (
        <EmojiPicker
          selectedEmoji={emoji}
          onSelect={onEmojiChange}
          disabled={isReady || isCountingDown}
        />
      ) : (
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
          style={{ backgroundColor: tv.bg.elevated }}
        >
          {emoji}
        </div>
      )}

      {/* Player name */}
      {isCurrentUser && !isReady && !isCountingDown && onNameChange ? (
        isEditingName ? (
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
            className="w-full text-center font-bold text-base rounded px-2 py-1 focus:outline-none"
            style={{
              backgroundColor: tv.bg.elevated,
              color: tv.text.primary,
              border: `1px solid ${tv.interactive.accent.DEFAULT}`,
            }}
            maxLength={15}
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="font-bold text-base hover:opacity-80 transition-opacity"
            style={{ color: tv.text.primary }}
            title="Click to edit name"
          >
            {name}
          </button>
        )
      ) : (
        <p
          className="font-bold text-base"
          style={{ color: tv.text.primary }}
        >
          {name}
        </p>
      )}

      {/* Ready button or countdown with unready option */}
      {isCurrentUser && onReadyToggle && (
        isCountingDown && countdownValue !== undefined ? (
          <div className="w-full flex flex-col items-center gap-2">
            <div
              className="w-full py-2.5 rounded-lg text-center font-black text-3xl animate-pulse"
              style={{
                backgroundColor: tv.interactive.accent.muted,
                color: tv.interactive.accent.DEFAULT,
              }}
            >
              {countdownValue}
            </div>
            <button
              onClick={onReadyToggle}
              className="w-full py-2 rounded-lg font-medium text-sm transition-all duration-200"
              style={{
                backgroundColor: tv.status.error.muted,
                color: tv.status.error.DEFAULT,
                border: `1px solid ${tv.status.error.DEFAULT}`,
              }}
            >
              Cancel Ready
            </button>
          </div>
        ) : (
          <button
            onClick={onReadyToggle}
            className="w-full py-2.5 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              backgroundColor: isReady ? tv.status.success.muted : tv.interactive.accent.DEFAULT,
              color: isReady ? tv.status.success.DEFAULT : tv.text.inverse,
              border: `2px solid ${isReady ? tv.status.success.DEFAULT : "transparent"}`,
            }}
          >
            {isReady ? (
              <>
                <Check size={18} />
                Ready!
              </>
            ) : (
              "Ready Up"
            )}
          </button>
        )
      )}

      {/* Non-current user ready/waiting status */}
      {!isCurrentUser && (
        <div
          className="w-full py-2 rounded-lg text-center font-medium text-sm"
          style={{
            backgroundColor: isReady ? tv.status.success.muted : tv.bg.elevated,
            color: isReady ? tv.status.success.DEFAULT : tv.text.secondary,
          }}
        >
          {isCountingDown && countdownValue !== undefined ? (
            <span className="text-2xl font-black" style={{ color: tv.interactive.accent.DEFAULT }}>
              {countdownValue}
            </span>
          ) : isReady ? (
            "Ready"
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Waiting...
            </span>
          )}
        </div>
      )}
    </div>
  );
}
