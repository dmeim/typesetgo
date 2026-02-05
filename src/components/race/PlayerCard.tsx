// src/components/race/PlayerCard.tsx
// Player card component for the race lobby
import { useState } from "react";
import EmojiPicker from "./EmojiPicker";
import type { LegacyTheme } from "@/types/theme";
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
  theme: LegacyTheme;
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
  theme,
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
      className="relative rounded-xl p-6 flex flex-col items-center gap-4 transition-all duration-300"
      style={{
        backgroundColor: theme.surfaceColor,
        border: `2px solid ${isReady ? theme.statusSuccess : theme.borderDefault}`,
        boxShadow: isReady ? `0 0 20px ${theme.statusSuccessMuted}` : "none",
      }}
    >
      {/* Host crown */}
      {isHost && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2"
          style={{ color: theme.statusWarning }}
        >
          <Crown size={24} fill={theme.statusWarning} />
        </div>
      )}

      {/* Ready indicator */}
      {isReady && !isCountingDown && (
        <div
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: theme.statusSuccess }}
        >
          <Check size={14} color={theme.textInverse} strokeWidth={3} />
        </div>
      )}

      {/* Emoji avatar */}
      {isCurrentUser && onEmojiChange ? (
        <EmojiPicker
          selectedEmoji={emoji}
          onSelect={onEmojiChange}
          theme={theme}
          disabled={isReady || isCountingDown}
        />
      ) : (
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
          style={{ backgroundColor: theme.elevatedColor }}
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
            className="w-full text-center font-bold text-lg rounded px-2 py-1 focus:outline-none"
            style={{
              backgroundColor: theme.elevatedColor,
              color: theme.textPrimary,
              border: `1px solid ${theme.accentColor}`,
            }}
            maxLength={15}
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="font-bold text-lg hover:opacity-80 transition-opacity"
            style={{ color: theme.textPrimary }}
            title="Click to edit name"
          >
            {name}
          </button>
        )
      ) : (
        <p
          className="font-bold text-lg"
          style={{ color: theme.textPrimary }}
        >
          {name}
        </p>
      )}

      {/* Ready button or countdown with unready option */}
      {isCurrentUser && onReadyToggle && (
        isCountingDown && countdownValue !== undefined ? (
          <div className="w-full flex flex-col items-center gap-2">
            <div
              className="w-full py-3 rounded-lg text-center font-black text-4xl animate-pulse"
              style={{
                backgroundColor: theme.accentMuted,
                color: theme.accentColor,
              }}
            >
              {countdownValue}
            </div>
            <button
              onClick={onReadyToggle}
              className="w-full py-2 rounded-lg font-medium text-sm transition-all duration-200"
              style={{
                backgroundColor: theme.statusErrorMuted,
                color: theme.statusError,
                border: `1px solid ${theme.statusError}`,
              }}
            >
              Cancel Ready
            </button>
          </div>
        ) : (
          <button
            onClick={onReadyToggle}
            className="w-full py-3 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              backgroundColor: isReady ? theme.statusSuccessMuted : theme.accentColor,
              color: isReady ? theme.statusSuccess : theme.textInverse,
              border: `2px solid ${isReady ? theme.statusSuccess : "transparent"}`,
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
            backgroundColor: isReady ? theme.statusSuccessMuted : theme.elevatedColor,
            color: isReady ? theme.statusSuccess : theme.textSecondary,
          }}
        >
          {isCountingDown && countdownValue !== undefined ? (
            <span className="text-2xl font-black" style={{ color: theme.accentColor }}>
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
