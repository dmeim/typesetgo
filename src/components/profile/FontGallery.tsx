import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon } from "@phosphor-icons/react";
import { TEXT_SIZE_MAX, TEXT_SIZE_MIN } from "@/lib/practice-limits";
import { TYPING_FONT_OPTIONS, type TypingFontOption } from "@/lib/typing-fonts";
import { SettingSlider, Segmented } from "./settings-controls";
import { FONT_GROUPS, PROFILE_SPRING } from "./profile-sections";
import type { ProfileSettings, ProfileSettingsUpdate } from "./profile-settings";

const fontsByValue = new Map(TYPING_FONT_OPTIONS.map((font) => [font.value, font]));

/** Size and alignment up top, then every typing font laid out as cards written in that font. */
export function FontGallery({ settings, update }: { settings: ProfileSettings; update: ProfileSettingsUpdate }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-x-8 gap-y-5 rounded-3xl border border-border bg-card p-5">
        <div className="min-w-56 flex-1"><SettingSlider label="Text size" value={settings.typingFontSize} min={TEXT_SIZE_MIN} max={TEXT_SIZE_MAX} step={0.25} onChange={(typingFontSize) => update({ typingFontSize })} format={(value) => `${value}rem`} /></div>
        <div className="flex min-w-72 flex-1 flex-col gap-2">
          <span className="text-sm">Alignment</span>
          <Segmented
            label="Alignment"
            value={settings.textAlign}
            onChange={(textAlign) => update({ textAlign })}
            options={(["left", "center", "right", "justify"] as const).map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))}
          />
        </div>
      </div>

      {FONT_GROUPS.map((group) => (
        <section key={group.title} aria-label={`${group.title} fonts`} className="flex flex-col gap-3">
          <h3 className="px-1 text-xs uppercase tracking-wider text-muted-foreground">{group.title}</h3>
          <div role="radiogroup" aria-label={`${group.title} fonts`} className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3">
            {group.values.map((value) => fontsByValue.get(value)).filter((font): font is TypingFontOption => Boolean(font)).map((font) => (
              <FontCard key={font.value} font={font} selected={settings.typingFontFamily === font.value} onSelect={() => update({ typingFontFamily: font.value })} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function FontCard({ font, selected, onSelect }: { font: TypingFontOption; selected: boolean; onSelect: () => void }) {
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={font.label}
      onClick={onSelect}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={PROFILE_SPRING}
      className={`relative flex flex-col gap-2 overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selected ? "border-primary ring-2 ring-primary" : "border-border"}`}
    >
      <span className="flex flex-col gap-1 pr-6" style={{ fontFamily: font.fontFamily }}>
        <span className={`text-4xl leading-none ${selected ? "text-primary" : ""}`}>Aa</span>
        <span className="text-lg leading-tight">{font.label}</span>
      </span>
      <span className="truncate text-sm text-muted-foreground" style={{ fontFamily: font.fontFamily }}>the quick brown fox jumps</span>
      <span className="line-clamp-2 text-xs text-muted-foreground">{font.description}</span>
      <AnimatePresence>
        {selected && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
          >
            <CheckIcon className="size-3.5" weight="bold" aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
