import type { ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion, useIsPresent } from "framer-motion";
import { X } from "lucide-react";
import type { ThemeDefinition, ThemeVariantDefinition, ThemeMode } from "@/types/theme";
import ThemeCard from "./ThemeCard";

interface VariantDrawerProps {
  themeData: ThemeDefinition;
  variants: ThemeVariantDefinition[];
  selectedThemeId: string | null;
  selectedVariantId: string | null;
  selectedMode?: ThemeMode;
  isOpen: boolean;
  onClose: () => void;
  onVariantSelect: (themeId: string, variantId?: string, mode?: ThemeMode) => void;
  onPreviewEnter: (theme: ThemeDefinition, mode?: ThemeMode, variantId?: string) => void;
  onPreviewLeave: () => void;
}

function DrawerBody({ children }: { children: ReactNode }) {
  const present = useIsPresent();
  return (
    <div inert={!present} aria-hidden={!present} className="rounded-md border border-border bg-muted p-3">
      {children}
    </div>
  );
}

export default function VariantDrawer({
  themeData,
  variants,
  selectedThemeId,
  selectedVariantId,
  selectedMode,
  isOpen,
  onClose,
  onVariantSelect,
  onPreviewEnter,
  onPreviewLeave,
}: VariantDrawerProps) {
  const reducedMotion = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key={themeData.id}
          id={`theme-variants-${themeData.id}`}
          role="region"
          aria-label={`${themeData.name} variants`}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeInOut" }}
          className="col-span-full min-w-0 overflow-hidden"
        >
          <DrawerBody>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">{themeData.name} variants</span>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${themeData.name} variants`}
                className="rounded p-2 text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
              }}
            >
              {variants.map((variant) => (
                <ThemeCard
                  key={variant.id}
                  themeData={themeData}
                  variant={variant}
                  label={variant.label}
                  isSelected={selectedThemeId === themeData.id && selectedVariantId === variant.id}
                  isMultiVariant={false}
                  selectedMode={selectedMode}
                  onCardClick={() => onVariantSelect(themeData.id, variant.id)}
                  onLightClick={() => variant.light && onVariantSelect(themeData.id, variant.id, "light")}
                  onDarkClick={() => onVariantSelect(themeData.id, variant.id, "dark")}
                  onMouseEnter={() => onPreviewEnter(themeData, undefined, variant.id)}
                  onMouseLeave={onPreviewLeave}
                  onLightMouseEnter={() => variant.light && onPreviewEnter(themeData, "light", variant.id)}
                  onDarkMouseEnter={() => onPreviewEnter(themeData, "dark", variant.id)}
                />
              ))}
            </div>
          </DrawerBody>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
