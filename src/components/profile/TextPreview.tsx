import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { MonitorPlayIcon } from "@phosphor-icons/react";
import PracticeText from "@/components/typing/PracticeText";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { themeCSSVariables } from "@/lib/theme-css";
import { PRACTICE_LINE_HEIGHT, PRACTICE_TEXT_SHARE_CLASS, practiceFontSize } from "@/lib/practice-text-size";
import { getTypingFontFamily } from "@/lib/typing-fonts";
import type { ThemeColors } from "@/types/theme";
import { KeyboardPreview } from "./KeyboardPreview";
import type { ProfileSettings } from "./profile-settings";

// Matches TypingPractice: page padding px-4, typing area 95% / 80% from md, and the same short-screen text size.
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

/** Phones show the preview above the settings, so it may use at most 30% of the screen height there. */
function usePhonePreviewHeight() {
  return useSyncExternalStore(subscribeResize, () => (window.innerWidth < 768 ? Math.round(window.innerHeight * 0.3) : Infinity), () => Infinity);
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

function useThemeStyle(colors: ThemeColors | null) {
  return useMemo(() => (colors ? themeCSSVariables(colors) : {}) as CSSProperties, [colors]);
}

/** The practice text (and keyboard) exactly as Home lays it out at this window's typing width. */
function PracticeSample({ settings, width }: { settings: ProfileSettings; width: number }) {
  const caretRef = useRef<HTMLSpanElement>(null);
  const ghostPosition = settings.ghostWriterEnabled ? TYPED.length + 16 : undefined;
  return (
    <>
      <div
        data-practice-sample
        className={`overflow-hidden ${PRACTICE_TEXT_SHARE_CLASS}`}
        style={{
          fontSize: practiceFontSize(settings.typingFontSize, settings.linePreview, settings.showOnScreenKeyboard),
          fontFamily: getTypingFontFamily(settings.typingFontFamily),
          lineHeight: PRACTICE_LINE_HEIGHT,
          maxHeight: `${settings.linePreview * PRACTICE_LINE_HEIGHT}em`,
          textAlign: settings.textAlign,
          width,
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
        <div className="mt-8" style={{ width }}>
          <KeyboardPreview style={settings.keyboardStyle} layoutId={settings.keyboardLayout} nextChar={SAMPLE[TYPED.length]} />
        </div>
      )}
    </>
  );
}

/**
 * Opens a near full-screen window over the page with the practice text at the exact size it has on Home,
 * in the picked theme. It follows the settings and the window size while open.
 */
export function LivePreviewButton({ colors, settings, themeName }: { colors: ThemeColors | null; settings: ProfileSettings; themeName?: string }) {
  const homeWidth = useHomeTypingWidth();
  const themeStyle = useThemeStyle(colors);
  return (
    <Dialog>
      <DialogTrigger className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        <MonitorPlayIcon className="size-3.5" aria-hidden="true" />Live Preview
      </DialogTrigger>
      <DialogContent
        style={themeStyle}
        className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none max-h-none flex-col gap-0 overflow-hidden rounded-2xl bg-background p-0 text-foreground sm:h-[calc(100dvh-3rem)] sm:w-[calc(100vw-3rem)] sm:max-w-none"
      >
        <div className="flex shrink-0 flex-col gap-0.5 border-b border-border px-4 py-3 pr-12 sm:px-6">
          <DialogTitle className="pr-0 text-base">Live Preview</DialogTitle>
          <DialogDescription className="text-xs">
            Your practice text at actual size{themeName ? ` in ${themeName}` : ""}, as Home shows it on this screen.
          </DialogDescription>
        </div>
        <div className="flex min-h-0 flex-1 overflow-auto overscroll-contain" data-live-preview-stage>
          <div className="m-auto flex flex-col items-center py-10 transition-colors duration-500">
            <PracticeSample settings={settings} width={homeWidth} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The real practice text (and keyboard) rendered at the exact width, rem size, line height and line count it
 * has on Home for this window, then scaled to fit. Line breaks and proportions match what the player will see.
 * `livePreview` adds the Live Preview button beside the caption; leave it off when a parent header has one.
 */
export function TextPreview({ colors, settings, label = "Text preview", livePreview = true, themeName }: {
  colors: ThemeColors | null;
  settings: ProfileSettings;
  label?: string;
  livePreview?: boolean;
  themeName?: string;
}) {
  const homeWidth = useHomeTypingWidth();
  const [frameRef, frame] = useElementSize<HTMLDivElement>();
  const [stageRef, stage] = useElementSize<HTMLDivElement>();
  const stageWidth = homeWidth + PAGE_PADDING;
  const maxHeight = usePhonePreviewHeight();
  const widthScale = frame.width === 0 ? 1 : Math.min(1, frame.width / stageWidth);
  const scale = stage.height ? Math.min(widthScale, maxHeight / stage.height) : widthScale;
  // When the height limit wins, the scaled stage is narrower than the frame: centre it.
  const inset = frame.width ? Math.max(0, (frame.width - stageWidth * scale) / 2) : 0;
  const themeStyle = useThemeStyle(colors);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-7 items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <span>{label} · {Math.round(scale * 100)}% of your screen</span>
        {livePreview && <LivePreviewButton colors={colors} settings={settings} themeName={themeName} />}
      </div>
      <div
        ref={frameRef}
        role="img"
        aria-label={`${label}: practice text at your current settings`}
        className="relative overflow-hidden rounded-xl border border-border bg-background transition-colors duration-500"
        style={{ ...themeStyle, height: stage.height ? stage.height * scale : undefined }}
      >
        <div
          ref={stageRef}
          aria-hidden="true"
          className="bg-background px-4 py-6 text-foreground transition-colors duration-500"
          style={{ ...themeStyle, width: stageWidth, transform: `translateX(${inset}px) scale(${scale})`, transformOrigin: "top left" }}
        >
          <PracticeSample settings={settings} width={homeWidth} />
        </div>
      </div>
    </div>
  );
}
