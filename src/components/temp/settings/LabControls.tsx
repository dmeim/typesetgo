// Controls and panels come from the real Profile page; only the mockups' Kids mode keyboard pick lives here.
import { KEYBOARD_STYLES, type KeyboardStyle } from "@/lib/keyboard-model";
import { RowGroup, Segmented, SettingRow, SettingSwitch } from "@/components/profile/settings-controls";
import { KeyboardLayoutPicker, StylePicker } from "@/components/profile/settings-panels";
import type { LabSettings } from "./lab-settings";

export {
  ModeSegmented, RowGroup, Segmented, SettingRow, SettingSlider as LabSlider, SettingSwitch as LabSwitch, Swatches,
} from "@/components/profile/settings-controls";
export { SoundPanel, StylePicker, TextPanel, TypingPanel } from "@/components/profile/settings-panels";

type Update = (changes: Partial<LabSettings>) => void;

const STYLE_BADGES: Partial<Record<KeyboardStyle, string>> = { spotlight: "Default", finger: "Kids mode default" };

export function KeyboardPanel({ settings, update }: { settings: LabSettings; update: Update }) {
  return (
    <RowGroup>
      <SettingRow label="On-screen keyboard" hint="Lights up the next key to press.">
        <SettingSwitch label="On-screen keyboard" checked={settings.showOnScreenKeyboard} onChange={(showOnScreenKeyboard) => update({ showOnScreenKeyboard })} />
      </SettingRow>
      <div style={{ opacity: settings.showOnScreenKeyboard ? 1 : 0.45 }} className="divide-y divide-border transition-opacity">
        <SettingRow label="Style" hint="How the keyboard looks while you practise." stacked>
          <StylePicker value={settings.keyboardStyle} layoutId={settings.keyboardLayout} badges={STYLE_BADGES} onChange={(keyboardStyle) => update({ keyboardStyle })} />
        </SettingRow>
        <SettingRow label="In Kids mode" hint="Kids mode always shows the keyboard, in this style." stacked>
          <Segmented label="Kids mode keyboard style" value={settings.kidsKeyboardStyle} onChange={(kidsKeyboardStyle) => update({ kidsKeyboardStyle })}
            options={KEYBOARD_STYLES.map((style) => ({ value: style.value, label: style.name }))} />
        </SettingRow>
        <SettingRow label="Layout" stacked>
          <KeyboardLayoutPicker value={settings.keyboardLayout} onChange={(keyboardLayout) => update({ keyboardLayout })} />
        </SettingRow>
      </div>
    </RowGroup>
  );
}
