import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import type { PracticeConfigurationProps } from "./PracticeControls";
import { DifficultyChoices, LengthChoices, ModeChoices, ModifierToggles } from "./PracticeSettingsRows";
import { MODE_META, MODIFIER_OPTIONS, SETTINGS_SPRING, describePracticeLength, selectedModeOption, usesWordOptions } from "./practice-settings-meta";

const panelContent = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { staggerChildren: 0.045, delayChildren: 0.08 } },
};
const panelRow = {
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: SETTINGS_SPRING },
};

/** Test settings as a one-line summary that morphs into the full panel. */
export function PracticeSettingsPill(props: PracticeConfigurationProps) {
  const { settings, isKidMode } = props;
  const [open, setOpen] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const close = useCallback((restoreFocus: boolean) => {
    returnFocus.current = restoreFocus;
    setOpen(false);
  }, []);
  useDismissPanel(surfaceRef, open, close);

  useEffect(() => {
    if (open || !returnFocus.current) return;
    returnFocus.current = false;
    triggerRef.current?.focus();
  }, [open]);

  const mode = selectedModeOption(settings, isKidMode);
  const length = describePracticeLength(settings, mode);
  const wordOptions = usesWordOptions(mode);
  const summary = <Summary {...props} />;
  const summaryText = [mode, length, wordOptions ? settings.difficulty : null].filter(Boolean).join(", ");

  return (
    <div className="relative w-full">
      {/* Reserves the collapsed height so the open panel floats over the prompt instead of pushing it. */}
      <div className="invisible flex justify-center" aria-hidden="true">
        <span className="flex items-center gap-3 border border-transparent px-5 py-2.5 text-sm">{summary}</span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center">
        <motion.div
          ref={surfaceRef}
          layout
          transition={SETTINGS_SPRING}
          style={{ borderRadius: open ? 16 : 999 }}
          className={`pointer-events-auto overflow-hidden border border-border bg-card ${open ? "shadow-xl" : "shadow-sm"}`}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {!open ? (
              <motion.button
                key="summary"
                ref={triggerRef}
                type="button"
                aria-expanded={false}
                aria-label={`Test settings: ${summaryText}`}
                onClick={() => setOpen(true)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 px-5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {summary}
              </motion.button>
            ) : (
              <motion.div
                key="panel"
                role="group"
                aria-label="Test settings"
                variants={panelContent}
                initial="hidden"
                animate="shown"
                exit="hidden"
                className="flex w-[min(46rem,calc(100vw-2rem))] flex-col gap-4 p-4 sm:p-5"
              >
                {wordOptions && (
                  <motion.div variants={panelRow} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                    <Labeled label="Difficulty"><DifficultyChoices {...props} /></Labeled>
                    <Labeled label="Extras" align="end"><ModifierToggles {...props} /></Labeled>
                  </motion.div>
                )}
                <Row label="Mode"><ModeChoices {...props} /></Row>
                {(mode === "time" || mode === "words" || mode === "quote" || mode === "preset") && (
                  <Row label={mode === "preset" ? "Text" : "Length"}><LengthChoices {...props} /></Row>
                )}
                <motion.div variants={panelRow} className="flex justify-end">
                  <motion.button
                    type="button"
                    onClick={() => close(true)}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <CheckIcon className="size-4" aria-hidden="true" />
                    Done
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

function Summary({ settings, isKidMode }: PracticeConfigurationProps) {
  const mode = selectedModeOption(settings, isKidMode);
  const { Icon } = MODE_META[mode];
  const length = describePracticeLength(settings, mode);
  const wordOptions = usesWordOptions(mode);
  return (
    <>
      <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="font-medium text-primary">{mode}</span>
      {length && <><Dot /><span className="text-foreground">{length}</span></>}
      {wordOptions && <><Dot /><span className="text-foreground">{settings.difficulty}</span></>}
      {wordOptions && MODIFIER_OPTIONS.filter(({ key }) => settings[key]).map(({ key, Icon: ModifierIcon }) => (
        <ModifierIcon key={key} className="size-4 shrink-0 text-primary" aria-hidden="true" />
      ))}
      <CaretDownIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <motion.div variants={panelRow}>
      <Labeled label={label}>{children}</Labeled>
    </motion.div>
  );
}

function Labeled({ label, align = "start", children }: { label: string; align?: "start" | "end"; children: ReactNode }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${align === "end" ? "sm:justify-end" : ""}`}>
      <span className={`shrink-0 text-xs uppercase tracking-wider text-muted-foreground ${align === "start" ? "w-20" : ""}`}>{label}</span>
      {children}
    </div>
  );
}

function Dot() {
  return <span className="size-1 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden="true" />;
}

/** Outside pointer down closes quietly; Escape closes and returns focus to the summary. */
function useDismissPanel(ref: RefObject<HTMLElement | null>, active: boolean, close: (restoreFocus: boolean) => void) {
  useEffect(() => {
    if (!active) return;
    const handlePointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(ref.current?.contains(document.activeElement) ?? false);
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [ref, active, close]);
}
