import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import type { PracticeConfigurationProps, PracticeEditorTrigger, PracticeSettingsPillProps } from "./PracticeControls";
import { PracticeCustomEditor } from "./PracticeCustomEditor";
import { DifficultyChoices, LengthChoices, ModeChoices, ModifierToggles } from "./PracticeSettingsRows";
import { MODE_META, MODIFIER_OPTIONS, SETTINGS_SPRING, describePracticeLength, selectedModeOption, usesWordOptions } from "./practice-settings-meta";

const panelContent = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { staggerChildren: 0.045, delayChildren: 0.08 } },
};
// Phones wrap the summary onto two lines rather than overflowing 320px.
const summaryClass = "flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2.5 text-sm sm:gap-x-3 sm:px-5";
const panelRow = {
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: SETTINGS_SPRING },
};

/**
 * Test settings as a one-line summary that morphs into the full panel. The panel floats over the prompt;
 * while a custom length or your own text is being edited it joins the page flow and pushes the test down.
 */
export function PracticeSettingsPill(props: PracticeSettingsPillProps) {
  const { settings, isKidMode, editor, setEditor, applyCustomLength, applyPresetText, estimateSpeed, ...configuration } = props;
  const rowProps: PracticeConfigurationProps = { settings, isKidMode, ...configuration };
  const [panelOpen, setPanelOpen] = useState(false);
  const open = panelOpen || editor !== null;
  const surfaceRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const editorTriggerRef = useRef<HTMLButtonElement>(null);
  const regionId = useId();
  const returnFocus = useRef(false);
  const close = useCallback((restoreFocus: boolean) => {
    returnFocus.current = restoreFocus;
    setEditor(null);
    setPanelOpen(false);
  }, [setEditor]);
  useDismissPanel(surfaceRef, open, close);

  useEffect(() => {
    if (open || !returnFocus.current) return;
    returnFocus.current = false;
    triggerRef.current?.focus();
  }, [open]);

  const foldEditor = () => {
    setPanelOpen(true);
    setEditor(null);
    // The chip stays mounted while the editor folds, so focus can return to it straight away.
    editorTriggerRef.current?.focus();
  };
  // Applying starts the new test, so the pill closes and the prompt takes focus.
  const finish = (apply: () => void) => {
    setEditor(null);
    setPanelOpen(false);
    apply();
  };
  const trigger: PracticeEditorTrigger = {
    regionId,
    open: editor,
    toggle: (next) => {
      if (editor === next) foldEditor();
      else setEditor(next);
    },
  };

  const mode = selectedModeOption(settings, isKidMode);
  const length = describePracticeLength(settings, mode);
  const wordOptions = usesWordOptions(mode);
  const summary = <Summary settings={settings} isKidMode={isKidMode} />;
  const summaryText = [mode, length, wordOptions ? settings.difficulty : null].filter(Boolean).join(", ");
  const inFlow = editor !== null;
  const lengthKind = settings.mode === "time" || settings.mode === "words" ? settings.mode : null;

  return (
    <div className="relative w-full">
      {/* Reserves the collapsed height so the open panel floats over the prompt instead of pushing it. */}
      {!inFlow && (
        <div className="invisible flex justify-center" aria-hidden="true">
          <span className={`${summaryClass} border border-transparent`}>{summary}</span>
        </div>
      )}
      <div className={inFlow ? "relative z-30 flex justify-center" : "pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center"}>
        <motion.div
          ref={surfaceRef}
          layout
          transition={SETTINGS_SPRING}
          style={{ borderRadius: open ? 16 : 999 }}
          className={`pointer-events-auto max-w-full overflow-hidden border border-border bg-card ${open ? "shadow-xl" : "shadow-sm"}`}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {!open ? (
              <motion.button
                key="summary"
                ref={triggerRef}
                type="button"
                aria-expanded={false}
                aria-label={`Test settings: ${summaryText}`}
                onClick={() => setPanelOpen(true)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={`${summaryClass} outline-none focus-visible:ring-2 focus-visible:ring-ring`}
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
                    <Labeled label="Difficulty"><DifficultyChoices {...rowProps} /></Labeled>
                    <Labeled label="Extras" align="end"><ModifierToggles {...rowProps} /></Labeled>
                  </motion.div>
                )}
                <Row label="Mode"><ModeChoices {...rowProps} /></Row>
                {(mode === "time" || mode === "words" || mode === "quote" || mode === "preset") && (
                  <Row label={mode === "preset" ? "Text" : "Length"}><LengthChoices {...rowProps} trigger={trigger} triggerRef={editorTriggerRef} /></Row>
                )}
                <PracticeCustomEditor
                  editor={editor}
                  regionId={regionId}
                  kind={lengthKind}
                  currentLength={settings.mode === "time" ? settings.duration : settings.wordTarget}
                  presetText={settings.presetText}
                  speed={estimateSpeed}
                  onApplyLength={(value) => finish(() => applyCustomLength(value))}
                  onApplyText={(text) => finish(() => applyPresetText(text))}
                  onCancel={foldEditor}
                />
                {!editor && (
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
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

function Summary({ settings, isKidMode }: Pick<PracticeConfigurationProps, "settings" | "isKidMode">) {
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
