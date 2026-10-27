import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { ArrowsInIcon, ArrowsOutIcon } from "@phosphor-icons/react";
import PracticeText from "@/components/typing/PracticeText";
import { themeCSSVariables } from "@/lib/theme-css";
import { getTypingFontFamily } from "@/lib/typing-fonts";
import type { ThemeColors } from "@/types/theme";
import { KeyboardPreview } from "./KeyboardPreview";
import type { ProfileSettings } from "./profile-settings";

// Matches TypingPractice: 1.6 line height, page padding px-4, typing area 95% / 80% from md.
const LINE_HEIGHT = 1.6;
const PAGE_PADDING = 32;
const SAMPLE = "the little robot found a bright green leaf near the garden gate and carried it home to show its friends who were waiting by the window with warm cocoa tonight while the stars came out one by one over the quiet town and the old clock in the square began to ring for supper as the lights in every house turned on";
const TYPED = "the little robto found a bri";

function subscribeResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/** The width the typing area has on Home at this window size. */
function useHomeTypingWidth() {
  return useSyncExternalStore(subscribeResize, () => {
    const page = window.innerWidth - PAGE_PADDING;
    return Math.round(page * (window.innerWidth >= 768 ? 0.8 : 0.95));
  }, () => 960);
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setSize({ width: element.offsetWidth, height: element.offsetHeight }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

/**
 * The real practice text (and keyboard) rendered at the exact width, rem size, line height and line count it
 * has on Home for this window, then scaled to fit. Line breaks and proportions match what the player will see.
 */
export function TextPreview({ colors, settings, label = "Text preview" }: { colors: ThemeColors | null; settings: ProfileSettings; label?: string }) {
  const homeWidth = useHomeTypingWidth();
  const [frameRef, frame] = useElementSize<HTMLDivElement>();
  const [stageRef, stage] = useElementSize<HTMLDivElement>();
  const caretRef = useRef<HTMLSpanElement>(null);
  const [actualSize, setActualSize] = useState(false);
  const stageWidth = homeWidth + PAGE_PADDING;
  const scale = actualSize || frame.width === 0 ? 1 : Math.min(1, frame.width / stageWidth);
  const themeStyle = useMemo(() => (colors ? themeCSSVariables(colors) : {}) as CSSProperties, [colors]);
  const ghostPosition = settings.ghostWriterEnabled ? TYPED.length + 16 : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{label} · {actualSize ? "actual size" : `${Math.round(scale * 100)}% of your screen`}</span>
        <button
          type="button"
          aria-pressed={actualSize}
          onClick={() => setActualSize((value) => !value)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-accent hover:text-foreground"
        >
          {actualSize ? <ArrowsInIcon className="size-3.5" aria-hidden="true" /> : <ArrowsOutIcon className="size-3.5" aria-hidden="true" />}
          {actualSize ? "Fit" : "Actual size"}
        </button>
      </div>
      <div
        ref={frameRef}
        role="img"
        aria-label={`${label}: practice text at your current settings`}
        className={`relative rounded-xl border border-border ${actualSize ? "overflow-x-auto" : "overflow-hidden"}`}
        style={{ height: stage.height ? stage.height * scale : undefined }}
      >
        <div
          ref={stageRef}
          aria-hidden="true"
          className="bg-background px-4 py-6 text-foreground transition-colors duration-500"
          style={{ ...themeStyle, width: stageWidth, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <div
            className="overflow-hidden"
            style={{
              fontSize: `${settings.typingFontSize}rem`,
              fontFamily: getTypingFontFamily(settings.typingFontFamily),
              lineHeight: LINE_HEIGHT,
              maxHeight: `${settings.linePreview * settings.typingFontSize * LINE_HEIGHT}rem`,
              textAlign: settings.textAlign,
              width: homeWidth,
            }}
          >
            <PracticeText
              targetText={SAMPLE}
              typedText={TYPED}
              caretRef={caretRef}
              maxWordsPerLine={settings.maxWordsPerLine}
              justifyLines={settings.textAlign === "justify"}
              ghostPosition={ghostPosition}
            />
          </div>
          {settings.showOnScreenKeyboard && (
            <div className="mt-8" style={{ width: homeWidth }}>
              <KeyboardPreview style={settings.keyboardStyle} layoutId={settings.keyboardLayout} nextChar={SAMPLE[TYPED.length]} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
