import { useMemo, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { deriveThemeTyping, deriveThemeUI } from "@/lib/colors";
import { KEYBOARD_LAYOUTS } from "@/lib/keyboard-layouts";
import { getTypingFontFamily } from "@/lib/typing-fonts";
import type { ThemeColors } from "@/types/theme";
import { LAB_SPRING, type LabSettings } from "./lab-settings";

const SAMPLE = "the little robot found a bright green leaf near the garden gate and carried it home to show its friends who were waiting by the window with warm cocoa tonight while the stars came out one by one";
const TYPED_WORDS = 5;

/** A miniature practice screen that reflects every lab setting, not just colours. */
export function SettingsLivePreview({ colors, settings, label }: { colors: ThemeColors | null; settings: LabSettings; label: string }) {
  const style = useMemo(() => {
    if (!colors) return { containerType: "inline-size" } as CSSProperties;
    const ui = deriveThemeUI(colors);
    return {
      ...Object.fromEntries(Object.entries(ui).map(([key, value]) => [`--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value])),
      containerType: "inline-size",
    } as CSSProperties;
  }, [colors]);
  const typing = useMemo(() => (colors ? deriveThemeTyping(colors) : null), [colors]);
  const words = SAMPLE.split(" ");
  const lines = Array.from({ length: settings.linePreview }, (_, line) => words.slice(line * settings.maxWordsPerLine, (line + 1) * settings.maxWordsPerLine));
  const rows = KEYBOARD_LAYOUTS[settings.keyboardLayout].rows.slice(1, 4).map((row) => row.filter((key) => key.type === "letter").map((key) => key.label));
  let index = 0;

  return (
    <div role="img" aria-label={`${label}: preview of the practice screen`} style={style} className="w-full overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-lg transition-colors duration-500">
      <div aria-hidden="true" className="flex aspect-[16/10] flex-col gap-[2.5cqw] p-[4cqw] [font-size:2.4cqw]">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="font-semibold text-primary [font-size:3.4cqw]">TypeSetGo</span>
          <span className="rounded-full border border-border bg-card px-[2cqw] py-[0.6cqw]">time · 30s · beginner</span>
        </div>
        <div className="flex items-baseline justify-center gap-[3cqw] text-muted-foreground">
          <span>96% acc</span><span className="font-bold text-primary [font-size:4.5cqw]">58</span><span>21s left</span>
        </div>
        <motion.div
          layout
          transition={LAB_SPRING}
          className="flex flex-1 flex-col justify-center gap-[0.8cqw] leading-snug"
          style={{ fontFamily: getTypingFontFamily(settings.typingFontFamily), fontSize: `${1.1 + settings.typingFontSize * 0.75}cqw`, textAlign: settings.textAlign }}
        >
          {lines.map((line, lineIndex) => (
            <motion.p layout transition={LAB_SPRING} key={lineIndex} className={settings.textAlign === "justify" ? "[text-align-last:justify]" : ""}>
              {line.map((word, wordIndex) => {
                const position = index++;
                const color = !typing ? undefined : position < TYPED_WORDS ? (position === 3 ? typing.incorrect : typing.correct) : typing.default;
                const caret = position === TYPED_WORDS;
                const ghost = settings.ghostWriterEnabled && position === TYPED_WORDS + 3;
                return (
                  <span key={wordIndex} style={{ color }}>
                    {caret && <span className="mr-[0.2em] inline-block h-[1em] w-[0.12em] translate-y-[0.15em] animate-pulse" style={{ backgroundColor: typing?.cursor }} />}
                    {ghost && <span className="mr-[0.2em] inline-block h-[1em] w-[0.12em] translate-y-[0.15em] opacity-70" style={{ backgroundColor: typing?.cursorGhost }} />}
                    {word}{wordIndex < line.length - 1 ? " " : ""}
                  </span>
                );
              })}
            </motion.p>
          ))}
        </motion.div>
        <motion.div
          initial={false}
          animate={{ opacity: settings.showOnScreenKeyboard ? 1 : 0, height: settings.showOnScreenKeyboard ? "auto" : 0 }}
          transition={LAB_SPRING}
          className="mx-auto flex w-4/5 flex-col gap-[0.6cqw] overflow-hidden font-mono"
        >
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-[0.6cqw]">
              {row.map((key) => (
                <span key={key} className={`flex h-[3.4cqw] w-[5cqw] items-center justify-center rounded-sm border border-border ${key.toLowerCase() === words[TYPED_WORDS][0] ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"}`}>{key}</span>
              ))}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
