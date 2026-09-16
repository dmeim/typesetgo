import { useState } from "react";
import { tv } from "@/lib/theme-vars";

interface PracticePresetDialogProps {
  showPresetInput: boolean;
  setShowPresetInput: (show: boolean) => void;
  handlePresetSubmit: (text: string) => void;
}

export default function PracticePresetDialog({ showPresetInput, setShowPresetInput, handlePresetSubmit }: PracticePresetDialogProps) {
  const [tempPresetText, setTempPresetText] = useState("");
  return (
    <>
      {/* Preset Input Modal */}
      {showPresetInput && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowPresetInput(false)}
        >
          <div
            className="w-full max-w-xl rounded-lg p-6 shadow-xl mx-4"
            style={{ backgroundColor: tv.bg.surface }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4" style={{ color: tv.text.primary }}>Enter Custom Text</h2>
            <textarea
              value={tempPresetText}
              onChange={(e) => setTempPresetText(e.target.value)}
              className="w-full h-48 rounded px-3 py-2 focus:outline-none focus:ring-2"
              style={{ backgroundColor: tv.bg.base, color: tv.text.primary, "--tw-ring-color": tv.interactive.secondary.DEFAULT } as React.CSSProperties}
              placeholder="Paste or type your custom text here..."
            />
            <div className="flex justify-end gap-4 mt-4">
              <button onClick={() => setShowPresetInput(false)} className="px-4 py-2 hover:opacity-80 transition-opacity" style={{ color: tv.text.secondary }}>
                Cancel
              </button>
              <button
                onClick={() => handlePresetSubmit(tempPresetText)}
                className="px-4 py-2 rounded text-white"
                style={{ backgroundColor: tv.interactive.secondary.DEFAULT }}
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
