import { useSoundPreview } from "@/hooks/useSoundPreview";
import { useRef } from "react";
import { PlayIcon } from "@phosphor-icons/react";
import type { SettingsState } from "@/lib/typing-constants";
import { type SoundManifest } from "@/lib/sounds";
import { tv } from "@/lib/theme-vars";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SoundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Partial<SettingsState>;
  onUpdateSettings: (updates: Partial<SettingsState>) => void;
  soundManifest: SoundManifest | null;
  disabled?: boolean;
}

export default function SoundSettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  soundManifest,
  disabled = false,
}: SoundSettingsModalProps) {
  const opener = useRef<HTMLElement | null>(null);
  const { play: playPreview, stop, error: previewError } = useSoundPreview(soundManifest,
    isOpen && !disabled && !!settings.soundEnabled, `${settings.typingSound}:${settings.warningSound}`);
  const categories = [
    { category: "typing", key: "typingSound", label: "Typing sound" },
    { category: "warning", key: "warningSound", label: "Warning sound" },
  ] as const;
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
        style={{
          backgroundColor: tv.ui.card,
          borderColor: tv.ui.border,
          color: tv.ui.cardForeground,
        }}
        onOpenAutoFocus={() => {
          opener.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        }}
        onCloseAutoFocus={(event) => {
          if (opener.current?.isConnected) {
            event.preventDefault();
            opener.current.focus();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Sound settings</DialogTitle>
          <DialogDescription style={{ color: tv.ui.mutedForeground }}>
            Choose typing and timer sounds. Preview a pack before selecting it.
          </DialogDescription>
        </DialogHeader>
        <label className="flex items-center gap-3 py-2">
          <input
            type="checkbox"
            checked={settings.soundEnabled ?? false}
            disabled={disabled}
            onChange={(event) => {
              if (!event.target.checked) stop();
              onUpdateSettings({ soundEnabled: event.target.checked });
            }}
          />
          Enable sound
        </label>
        <fieldset
          disabled={disabled || !settings.soundEnabled}
          className="min-w-0 space-y-5 disabled:opacity-60"
        >
          <legend className="sr-only">Sound packs</legend>
          {categories.map(({ category, key, label }) => {
            const packs = Object.keys(soundManifest?.[category] ?? {}).filter(
              (pack) => soundManifest?.[category]?.[pack]?.length,
            );
            const selected = settings[key] ?? "";
            const available = packs.includes(selected);
            return (
              <div key={category} className="space-y-2">
                <label htmlFor={`sound-${category}`} className="block text-sm">
                  {label}
                </label>
                <div className="flex min-w-0 items-center gap-2">
                  <select
                    id={`sound-${category}`}
                    value={available ? selected : ""}
                    disabled={!packs.length}
                    onChange={(event) => {
                      stop();
                      onUpdateSettings({ [key]: event.target.value });
                    }}
                    className="min-h-10 min-w-0 flex-1 rounded border px-3 py-2 focus-visible:outline-2"
                    style={{
                      backgroundColor: tv.ui.background,
                      color: tv.ui.foreground,
                      borderColor: tv.ui.border,
                    }}
                  >
                    <option value="">
                      {!soundManifest
                        ? "Loading packs…"
                        : !packs.length
                          ? "No packs available"
                          : "None"}
                    </option>
                    {packs.map((pack) => (
                      <option key={pack} value={pack}>
                        {pack}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!available}
                    aria-label={`Preview ${label.toLowerCase()}`}
                    onClick={() => playPreview(category, selected)}
                    className="min-h-10 min-w-10 rounded border p-2 hover:opacity-80 focus-visible:outline-2 disabled:opacity-50"
                    style={{ borderColor: tv.ui.border }}
                  >
                    <PlayIcon className="mx-auto size-4" aria-hidden="true" />
                  </button>
                </div>
                {selected && !available && soundManifest && (
                  <p
                    className="text-sm"
                    style={{ color: tv.ui.mutedForeground }}
                  >
                    The selected pack is unavailable. Choose another pack.
                  </p>
                )}
              </div>
            );
          })}
        </fieldset>
        {previewError && (
          <p role="alert" style={{ color: tv.ui.destructive }}>
            {previewError}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
