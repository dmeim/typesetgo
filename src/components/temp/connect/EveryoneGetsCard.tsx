import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PaletteIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KEYBOARD_STYLES } from "@/components/temp/keyboard/keyboard-mock";
import { LabSlider, LabSwitch, ModeSegmented, RowGroup, Segmented, SettingRow, SoundPanel, StylePicker, Swatches, TextPanel } from "@/components/temp/settings/LabControls";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { ThemeGallery } from "@/components/temp/settings/ThemeGallery";
import { findVariant, useThemeCatalog, type LabState } from "@/components/temp/settings/useLabSettings";
import { MAX_GHOST_SPEED } from "@/lib/practice-limits";
import { getTypingFontFamily, getTypingFontOption } from "@/lib/typing-fonts";
import { cn } from "@/lib/utils";
import { LabCard } from "./ConnectParts";
import { GROUPS, type GroupId } from "./everyone-gets";
import type { MockRoom } from "./use-mock-room";

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function ThemeBody({ lab }: { lab: LabState }) {
  const themes = useThemeCatalog();
  const [browsing, setBrowsing] = useState(false);
  const entry = themes?.find((theme) => theme.id === lab.theme.themeId);
  const variant = findVariant(entry, lab.theme.variantId);
  const colors = variant?.swatches ?? [];
  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => setBrowsing(true)}
        className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3 text-left hover:border-primary focus-visible:outline-2 focus-visible:outline-ring">
        <span className="flex h-10 w-16 shrink-0 overflow-hidden rounded-xl" aria-hidden="true">
          {colors.map((color, index) => <span key={index} className="flex-1" style={{ backgroundColor: color }} />)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{entry?.name ?? lab.theme.themeId}</span>
          <span className="block text-xs text-muted-foreground">{variant && entry && entry.variants.length > 1 ? `${variant.label} · ` : ""}Tap to browse every theme</span>
        </span>
        <PaletteIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
      <ModeSegmented mode={lab.theme.mode} lightAvailable={variant?.light ?? true} onChange={(mode) => lab.setTheme({ ...lab.theme, mode })} />
      <Dialog open={browsing} onOpenChange={setBrowsing}>
        <DialogContent className="grid-cols-1 sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Room theme</DialogTitle>
            <DialogDescription>Students see these colours while the theme setting is on. Their own saved theme stays as it is.</DialogDescription>
          </DialogHeader>
          {/* Grid items size to their content; min-w-0 lets the category chips scroll instead of widening the dialog. */}
          <div className="min-w-0"><ThemeGallery lab={lab} /></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GhostBody({ lab }: { lab: LabState }) {
  const { settings, update } = lab;
  return (
    <RowGroup>
      <SettingRow label="Show the ghost" hint="A second cursor typing at the target speed.">
        <LabSwitch label="Show the ghost" checked={settings.ghostWriterEnabled} onChange={(ghostWriterEnabled) => update({ ghostWriterEnabled })} />
      </SettingRow>
      <motion.div animate={{ opacity: settings.ghostWriterEnabled ? 1 : 0.45 }} className="px-4 py-3">
        <LabSlider label="Ghost speed" value={settings.ghostWriterSpeed} min={5} max={MAX_GHOST_SPEED} step={5} onChange={(ghostWriterSpeed) => update({ ghostWriterSpeed })} format={(value) => `${value} wpm`} />
      </motion.div>
    </RowGroup>
  );
}

function KeyboardBody({ lab }: { lab: LabState }) {
  const { settings, update } = lab;
  return (
    <RowGroup>
      <SettingRow label="Show the keyboard" hint="Lights up the next key to press.">
        <LabSwitch label="Show the keyboard" checked={settings.showOnScreenKeyboard} onChange={(showOnScreenKeyboard) => update({ showOnScreenKeyboard })} />
      </SettingRow>
      <motion.div animate={{ opacity: settings.showOnScreenKeyboard ? 1 : 0.45 }} className="divide-y divide-border">
        <SettingRow label="Style" stacked>
          <StylePicker value={settings.keyboardStyle} layoutId={settings.keyboardLayout} onChange={(keyboardStyle) => update({ keyboardStyle })} />
        </SettingRow>
        <SettingRow label="Layout" stacked>
          <Segmented label="Keyboard layout" value={settings.keyboardLayout} onChange={(keyboardLayout) => update({ keyboardLayout })}
            options={(["qwerty", "dvorak", "colemak"] as const).map((value) => ({ value, label: value.toUpperCase() }))} />
        </SettingRow>
      </motion.div>
    </RowGroup>
  );
}

function TextBody({ lab }: { lab: LabState }) {
  const { settings } = lab;
  return (
    <div className="flex flex-col gap-3">
      <p className="truncate rounded-2xl bg-background px-4 py-3 text-muted-foreground"
        style={{ fontFamily: getTypingFontFamily(settings.typingFontFamily), fontSize: `${Math.min(settings.typingFontSize, 2.5)}rem`, textAlign: settings.textAlign === "justify" ? "left" : settings.textAlign }}>
        <span className="text-foreground">the quick</span> brown fox
      </p>
      <TextPanel settings={settings} update={lab.update} />
    </div>
  );
}

/** One line per group: what it is, what students get, and the switch. */
function summaryOf(group: GroupId, lab: LabState, themeName: string | undefined) {
  const { settings, theme } = lab;
  if (group === "theme") return `${themeName ?? theme.themeId} · ${theme.mode}`;
  if (group === "text") return `${getTypingFontOption(settings.typingFontFamily).label} · ${settings.typingFontSize}rem · ${settings.textAlign}`;
  if (group === "ghost") return settings.ghostWriterEnabled ? `Ghost at ${settings.ghostWriterSpeed} wpm` : "Ghost hidden";
  if (group === "sound") return settings.soundEnabled ? `${capitalize(settings.typingSound)} keys · ${settings.warningSound} warning` : "Muted";
  return settings.showOnScreenKeyboard ? `${KEYBOARD_STYLES.find((style) => style.value === settings.keyboardStyle)?.name} · ${settings.keyboardLayout.toUpperCase()}` : "Keyboard hidden";
}

function Group({ id, label, on, Icon, enabled, summary, onToggle, children }: (typeof GROUPS)[number] & { enabled: boolean; summary: string; onToggle: (on: boolean) => void; children: ReactNode }) {
  return (
    <li className={cn("rounded-2xl transition-colors", enabled ? "bg-muted/40" : "")}>
      <div className="flex items-center gap-3 p-2.5">
        <span aria-hidden="true" className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors", enabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          <Icon weight={enabled ? "fill" : "bold"} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p id={`everyone-${id}`} className="text-sm font-semibold">{label}</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={enabled ? summary : "off"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
              className="truncate text-xs text-muted-foreground">
              {enabled ? summary : "Off · students keep their own"}
            </motion.p>
          </AnimatePresence>
        </div>
        <LabSwitch label={`Everyone gets the same ${label.toLowerCase()}`} checked={enabled} onChange={onToggle} />
      </div>
      <AnimatePresence initial={false}>
        {enabled && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={LAB_SPRING} className="overflow-hidden">
            <div role="group" aria-labelledby={`everyone-${id}`} className="flex flex-col gap-3 px-2.5 pb-3">
              <p className="text-xs text-muted-foreground">{on} Changes reach students right away.</p>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/** Settings the host picks for everyone; a group that's off leaves each student's own setting alone. */
export function EveryoneGetsCard({ room, className }: { room: MockRoom; className?: string }) {
  const themes = useThemeCatalog();
  const { everyone, actions } = room;
  const lab: LabState = { settings: everyone.settings, update: actions.updateEveryone, theme: everyone.theme, setTheme: actions.setEveryoneTheme };
  const themeName = themes?.find((theme) => theme.id === everyone.theme.themeId)?.name;
  const onCount = GROUPS.filter((group) => everyone.on[group.id]).length;
  const bodies: Record<GroupId, ReactNode> = {
    theme: <ThemeBody lab={lab} />,
    text: <TextBody lab={lab} />,
    ghost: <GhostBody lab={lab} />,
    sound: <SoundPanel settings={lab.settings} update={lab.update} />,
    keyboard: <KeyboardBody lab={lab} />,
  };
  return (
    <LabCard title="Everyone gets" description={`${onCount} of ${GROUPS.length} set for the room. Anything off uses each student's own settings.`} Icon={SlidersHorizontalIcon} tile="bg-(--accent-emphasis) text-background" className={className}>
      <ul className="flex flex-col gap-1">
        {GROUPS.map((group) => (
          <Group key={group.id} {...group} enabled={everyone.on[group.id]} summary={summaryOf(group.id, lab, themeName)} onToggle={(on) => actions.setGroup(group.id, on)}>
            {bodies[group.id]}
          </Group>
        ))}
      </ul>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Swatches colors={["var(--primary)", "var(--accent-emphasis)", "var(--warning)"]} size="size-3" />
        Switch to the Student tab to see these on a student's screen.
      </p>
    </LabCard>
  );
}
