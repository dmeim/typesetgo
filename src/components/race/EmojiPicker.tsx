// src/components/race/EmojiPicker.tsx
// Emoji picker for selecting race avatars from a curated list
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { RACE_EMOJIS } from "@/lib/race-emojis";
import type { LegacyTheme } from "@/types/theme";

interface EmojiPickerProps {
  selectedEmoji: string;
  onSelect: (emoji: string) => void;
  theme: LegacyTheme;
  disabled?: boolean;
}

export default function EmojiPicker({
  selectedEmoji,
  onSelect,
  theme,
  disabled = false,
}: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleSelect = (emoji: string) => {
    if (disabled) return;
    onSelect(emoji);
    setIsOpen(false);
  };

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 320; // approximate width of dropdown
      
      // Center dropdown below button, but keep it within viewport
      let left = rect.left + rect.width / 2 - dropdownWidth / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - dropdownWidth - 8));
      
      setDropdownPosition({
        top: rect.bottom + 8,
        left,
      });
    }
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Selected emoji button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: theme.elevatedColor,
          border: `2px solid ${isOpen ? theme.accentColor : theme.borderDefault}`,
        }}
        title="Change avatar"
      >
        {selectedEmoji}
      </button>

      {/* Dropdown picker - rendered in portal to escape container overflow */}
      {isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Picker dropdown */}
          <div
            className="fixed z-50 p-3 rounded-xl shadow-xl grid grid-cols-8 gap-1"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: 320,
              backgroundColor: theme.surfaceColor,
              border: `1px solid ${theme.borderDefault}`,
            }}
          >
            {RACE_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSelect(emoji)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all duration-150 hover:scale-125"
                style={{
                  backgroundColor: emoji === selectedEmoji 
                    ? theme.accentMuted 
                    : "transparent",
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
