import { useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RACE_EMOJIS } from "@/lib/race-emojis";
import { tv } from "@/lib/theme-vars";

const EMOJI_NAMES = [
  "Racing car",
  "Rocket",
  "Airplane",
  "Small airplane",
  "Helicopter",
  "Motorcycle",
  "Bicycle",
  "Scooter",
  "Leopard",
  "Horse",
  "Eagle",
  "Rabbit",
  "Dog",
  "Fox",
  "Wolf",
  "Lion",
  "Lightning",
  "Fire",
  "Wind",
  "Tornado",
  "Comet",
  "Dizzy star",
  "Sparkles",
  "Star",
  "Runner",
  "Wizard",
  "Superhero",
  "Ninja",
  "Alien",
  "Robot",
  "Ghost",
  "Target",
];

export default function EmojiPicker({
  selectedEmoji,
  onSelect,
  disabled = false,
}: {
  selectedEmoji: string;
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(
    Math.max(0, RACE_EMOJIS.indexOf(selectedEmoji)),
  );
  const options = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <Popover open={isOpen && !disabled} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Change avatar"
          className="size-12 rounded-full flex items-center justify-center text-2xl disabled:opacity-50"
          style={{
            backgroundColor: tv.ui.secondary,
            border: `1px solid ${tv.ui.border}`,
          }}
        >
          <span aria-hidden="true">{selectedEmoji}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        aria-label="Choose a racing avatar"
        collisionPadding={12}
        className="w-[min(20rem,calc(100vw-1.5rem))] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto p-3"
        style={{
          backgroundColor: tv.ui.card,
          color: tv.ui.foreground,
          borderColor: tv.ui.border,
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const index = Math.max(0, RACE_EMOJIS.indexOf(selectedEmoji));
          setFocusedIndex(index);
          options.current[index]?.focus();
        }}
      >
        <p className="text-sm font-medium mb-2">Choose your avatar</p>
        <div
          className="grid grid-cols-4 gap-1"
          onKeyDown={(event) => {
            const moves: Record<string, number> = {
              ArrowRight: 1,
              ArrowLeft: -1,
              ArrowDown: 4,
              ArrowUp: -4,
            };
            let next = focusedIndex;
            if (event.key === "Home") next = 0;
            else if (event.key === "End") next = RACE_EMOJIS.length - 1;
            else if (event.key in moves)
              next =
                (focusedIndex + moves[event.key] + RACE_EMOJIS.length) %
                RACE_EMOJIS.length;
            else return;
            event.preventDefault();
            setFocusedIndex(next);
            options.current[next]?.focus();
          }}
        >
          {RACE_EMOJIS.map((emoji, index) => (
            <button
              key={emoji}
              ref={(element) => {
                options.current[index] = element;
              }}
              type="button"
              aria-label={EMOJI_NAMES[index]}
              aria-pressed={emoji === selectedEmoji}
              tabIndex={index === focusedIndex ? 0 : -1}
              onFocus={() => setFocusedIndex(index)}
              onClick={() => {
                onSelect(emoji);
                setIsOpen(false);
              }}
              className="h-10 rounded-md flex items-center justify-center text-xl"
              style={{
                backgroundColor:
                  emoji === selectedEmoji
                    ? tv.interactive.accent.muted
                    : tv.ui.secondary,
              }}
            >
              <span aria-hidden="true">{emoji}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
