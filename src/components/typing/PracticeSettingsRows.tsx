import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PencilSimpleIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Difficulty, QuoteLength } from "@/lib/typing-constants";
import type { PracticeConfigurationProps } from "./PracticeControls";
import { MODE_SELECTOR_OPTIONS, TIME_PRESETS, WORD_PRESETS } from "./practice-config";
import { MODE_META, MODIFIER_OPTIONS, SETTINGS_SPRING, selectedModeOption } from "./practice-settings-meta";

const itemClass = "relative h-auto px-3 py-1 font-normal hover:bg-transparent data-[state=on]:bg-transparent";
const selectedClass = "font-medium text-primary hover:text-primary data-[state=on]:text-primary";
const idleClass = "text-muted-foreground hover:text-foreground";

interface Choice {
  value: string;
  label: ReactNode;
  title?: string;
}

interface ChoiceGroupProps {
  id: string;
  label: string;
  value: string;
  choices: Choice[];
  onChoose: (value: string) => void;
  trailing?: ReactNode;
}

/** Single-choice row whose highlight slides to the selected item. */
function ChoiceGroup({ id, label, value, choices, onChoose, trailing }: ChoiceGroupProps) {
  return (
    <ToggleGroup type="single" value={value} aria-label={label} spacing={1} className="flex flex-wrap rounded-lg bg-background/60 p-1">
      {choices.map((choice) => {
        const selected = choice.value === value;
        return (
          <ToggleGroupItem
            key={choice.value}
            value={choice.value}
            type="button"
            title={choice.title}
            onClick={() => onChoose(choice.value)}
            className={`${itemClass} ${selected ? selectedClass : idleClass}`}
          >
            {selected && <SelectionHighlight id={id} />}
            <span className="relative z-10 inline-flex items-center gap-1.5">{choice.label}</span>
          </ToggleGroupItem>
        );
      })}
      {trailing}
    </ToggleGroup>
  );
}

function SelectionHighlight({ id }: { id: string }) {
  return <motion.span layoutId={`${id}-highlight`} className="absolute inset-0 rounded-md bg-accent" transition={SETTINGS_SPRING} aria-hidden="true" />;
}

export function ModeChoices({ settings, isKidMode, handleModeSelect }: PracticeConfigurationProps) {
  return (
    <ChoiceGroup
      id="practice-mode"
      label="Mode"
      value={selectedModeOption(settings, isKidMode)}
      onChoose={(mode) => handleModeSelect(mode as (typeof MODE_SELECTOR_OPTIONS)[number])}
      choices={MODE_SELECTOR_OPTIONS.map((mode) => {
        const { Icon, hint } = MODE_META[mode];
        return { value: mode, title: hint, label: <><Icon className="size-4" aria-hidden="true" />{mode}</> };
      })}
    />
  );
}

/** Duration, word count, quote length, or the custom-text action for the current mode. */
export function LengthChoices(props: PracticeConfigurationProps) {
  const { settings, updateSettings, generateTest, quotesManifest, openCustomCountModal, openPresetInput } = props;
  const pick = (current: boolean, updates: Parameters<typeof updateSettings>[0]) => (current ? generateTest() : updateSettings(updates));

  if (settings.mode === "preset") {
    if (!openPresetInput) return null;
    return (
      <Button type="button" variant="ghost" onClick={openPresetInput} className="h-auto px-3 py-1.5 font-normal text-muted-foreground hover:text-foreground">
        <PencilSimpleIcon className="size-4" aria-hidden="true" />
        Edit custom text
      </Button>
    );
  }
  if (settings.mode === "time" || settings.mode === "words") {
    const isTime = settings.mode === "time";
    const presets = isTime ? TIME_PRESETS : WORD_PRESETS;
    const current = isTime ? settings.duration : settings.wordTarget;
    const custom = isTime ? props.isCustomDurationSelected : props.isCustomWordTargetSelected;
    return (
      <ChoiceGroup
        id="practice-length"
        label={isTime ? "Duration" : "Word Count"}
        value={custom ? "" : String(current)}
        onChoose={(value) => pick(Number(value) === current, isTime ? { duration: Number(value) } : { wordTarget: Number(value) })}
        choices={presets.map((preset) => ({ value: String(preset), label: isTime ? `${preset}s` : String(preset) }))}
        trailing={
          <Button
            type="button"
            variant="ghost"
            onClick={openCustomCountModal}
            className={`${itemClass} hover:bg-transparent ${custom ? selectedClass : idleClass}`}
          >
            {custom && <SelectionHighlight id="practice-length" />}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
              {custom ? (isTime ? `${current}s` : current) : "custom"}
            </span>
          </Button>
        }
      />
    );
  }
  if (settings.mode === "quote" && quotesManifest) {
    return (
      <ChoiceGroup
        id="practice-length"
        label="Quote Length"
        value={settings.quoteLength}
        onChoose={(value) => pick(value === settings.quoteLength, { quoteLength: value as QuoteLength })}
        choices={["all", ...quotesManifest.lengths].map((length) => ({ value: length, label: length }))}
      />
    );
  }
  return null;
}

/** Five rising bars; hovering or focusing a bar previews its level name. */
export function DifficultyChoices({ settings, updateSettings, generateTest, wordsManifest }: PracticeConfigurationProps) {
  const [preview, setPreview] = useState<string | null>(null);
  if (!wordsManifest) return null;
  const levels = wordsManifest.difficulties;
  const shown = preview ?? settings.difficulty;
  const shownIndex = levels.indexOf(shown);
  return (
    <div className="flex items-center gap-2" onMouseLeave={() => setPreview(null)}>
      <ToggleGroup type="single" value={settings.difficulty} aria-label="Difficulty" spacing={0} className="flex h-9 items-end">
        {levels.map((level, index) => (
          <ToggleGroupItem
            key={level}
            value={level}
            type="button"
            aria-label={level}
            title={level}
            onClick={() => (level === settings.difficulty ? generateTest() : updateSettings({ difficulty: level as Difficulty }))}
            onMouseEnter={() => setPreview(level)}
            onFocus={() => setPreview(level)}
            onBlur={() => setPreview(null)}
            className="h-full min-w-0 items-end rounded-sm px-[3px] pb-1.5 hover:bg-transparent data-[state=on]:bg-transparent"
          >
            <motion.span
              className="block w-1.5 rounded-full bg-primary"
              style={{ height: 10 + index * 4 }}
              animate={{ opacity: index <= shownIndex ? 1 : 0.22, scaleY: index === shownIndex ? 1.12 : 1 }}
              transition={SETTINGS_SPRING}
            />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <span className="relative inline-flex h-5 w-[4.75rem] overflow-hidden text-sm" aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={shown}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={SETTINGS_SPRING}
            className={shown === settings.difficulty ? "text-primary" : "text-muted-foreground"}
          >
            {shown}
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  );
}

export function ModifierToggles({ settings, updateSettings }: PracticeConfigurationProps) {
  return (
    <div role="group" aria-label="Extras" className="flex flex-wrap items-center gap-1">
      {MODIFIER_OPTIONS.map(({ key, label, Icon }) => {
        const on = settings[key];
        return (
          <Toggle
            key={key}
            type="button"
            pressed={on}
            onPressedChange={(pressed) => updateSettings({ [key]: pressed })}
            className={`h-auto px-2.5 py-1 font-normal hover:bg-accent/60 ${on ? "text-primary data-[state=on]:text-primary" : idleClass}`}
          >
            <motion.span
              key={String(on)}
              initial={on ? { scale: 0.5, rotate: -20 } : false}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 600, damping: 14 }}
              className="inline-flex"
            >
              <Icon className="size-4" aria-hidden="true" />
            </motion.span>
            {label}
          </Toggle>
        );
      })}
    </div>
  );
}
