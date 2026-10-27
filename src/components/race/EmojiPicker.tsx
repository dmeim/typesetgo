import { useRef, useState } from "react";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RACE_EMOJIS } from "@/lib/race-emojis";
import { cn } from "@/lib/utils";
import { RacerAvatar, type RacerAvatarSize } from "./RaceParts";

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

/** Your avatar as a button that opens the named emoji grid (arrow keys move, Escape closes). */
export default function EmojiPicker({
  selectedEmoji,
  onSelect,
  disabled = false,
  color = "var(--primary)",
  size = "sm",
}: {
  selectedEmoji: string;
  onSelect: (emoji: string) => void;
  disabled?: boolean;
  color?: string;
  size?: RacerAvatarSize;
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
          className="group relative shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed"
        >
          <RacerAvatar emoji={selectedEmoji} color={color} size={size} className="transition-transform group-enabled:group-hover:scale-105" />
          {!disabled && (
            <span aria-hidden="true" className="absolute -bottom-1 -right-1 flex size-4.5 items-center justify-center rounded-full border border-border bg-card">
              <PencilSimpleIcon className="size-2.5" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        aria-label="Choose a racing avatar"
        collisionPadding={12}
        className="w-[min(20rem,calc(100vw-1.5rem))] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto rounded-2xl p-3"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const index = Math.max(0, RACE_EMOJIS.indexOf(selectedEmoji));
          setFocusedIndex(index);
          options.current[index]?.focus();
        }}
      >
        <p className="mb-2 text-sm font-semibold">Choose your avatar</p>
        <div
          className="grid grid-cols-4 gap-1"
          onKeyDown={(event) => {
            const moves: Record<string, number> = {
              ArrowRight: 1,
              ArrowLeft: -1,
              ArrowDown: 4,
              ArrowUp: -4,
            };
            let next: number;
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
              className={cn(
                "flex h-10 items-center justify-center rounded-xl text-xl transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring",
                emoji === selectedEmoji && "bg-primary/15 ring-2 ring-primary",
              )}
            >
              <span aria-hidden="true">{emoji}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
