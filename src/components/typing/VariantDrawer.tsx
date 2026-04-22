import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { ThemeDefinition, ThemeVariantDefinition, ThemeMode } from "@/types/theme";
import ThemeCard from "./ThemeCard";

interface VariantDrawerProps {
  themeData: ThemeDefinition;
  variants: ThemeVariantDefinition[];
  selectedThemeId: string | null;
  selectedVariantId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onVariantSelect: (themeId: string, variantId?: string, mode?: ThemeMode) => void;
  onPreviewEnter: (theme: ThemeDefinition, mode?: ThemeMode, variantId?: string) => void;
  onPreviewLeave: () => void;
}

export default function VariantDrawer({
  themeData,
  variants,
  selectedThemeId,
  selectedVariantId,
  isOpen,
  onClose,
  onVariantSelect,
  onPreviewEnter,
  onPreviewLeave,
}: VariantDrawerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);

  useEffect(() => {
    if (isOpen && contentRef.current) {
      setMeasuredHeight(contentRef.current.scrollHeight);
    }
  }, [isOpen, variants.length]);

  const defaultVariant = themeData.variants.find(v => v.id === themeData.defaultVariantId) || themeData.variants[0];

  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: measuredHeight || "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              ref={contentRef}
              className="rounded-lg border p-3"
              style={{
                backgroundColor: `${defaultVariant.dark.bg.base}80`,
                borderColor: defaultVariant.dark.border.subtle,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-sm font-medium"
                  style={{ color: defaultVariant.dark.text.secondary }}
                >
                  {themeData.name} — Variants
                </span>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" style={{ color: defaultVariant.dark.text.muted }} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {variants.map((variant) => {
                  const isVariantSelected = selectedThemeId === themeData.id && selectedVariantId === variant.id;
                  return (
                    <ThemeCard
                      key={variant.id}
                      themeData={themeData}
                      variant={variant}
                      label={variant.label}
                      isSelected={isVariantSelected}
                      isMultiVariant={false}
                      onCardClick={() => onVariantSelect(themeData.id, variant.id)}
                      onLightClick={() => {
                        if (variant.light) onVariantSelect(themeData.id, variant.id, "light");
                      }}
                      onDarkClick={() => onVariantSelect(themeData.id, variant.id, "dark")}
                      onMouseEnter={() => onPreviewEnter(themeData, undefined, variant.id)}
                      onMouseLeave={onPreviewLeave}
                      onLightMouseEnter={() => {
                        if (variant.light) onPreviewEnter(themeData, "light", variant.id);
                      }}
                      onDarkMouseEnter={() => onPreviewEnter(themeData, "dark", variant.id)}
                    />
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
