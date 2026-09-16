import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { tv } from "@/lib/theme-vars";

interface PracticePresetDialogProps {
  showPresetInput: boolean;
  setShowPresetInput: (show: boolean) => void;
  handlePresetSubmit: (text: string) => void;
}

export default function PracticePresetDialog({
  showPresetInput,
  setShowPresetInput,
  handlePresetSubmit,
}: PracticePresetDialogProps) {
  const [tempPresetText, setTempPresetText] = useState("");
  return (
    <Dialog open={showPresetInput} onOpenChange={setShowPresetInput}>
      <DialogContent>
        <DialogTitle>Enter Custom Text</DialogTitle>
        <DialogDescription>Type or paste the text you want to practice.</DialogDescription>
        <textarea
          aria-label="Practice text"
          value={tempPresetText}
          onChange={(e) => setTempPresetText(e.target.value)}
          className="w-full h-48 rounded px-3 py-2 focus:outline-none focus:ring-2"
          style={
            {
              backgroundColor: tv.bg.base,
              color: tv.text.primary,
              "--tw-ring-color": tv.ui.primary,
            } as React.CSSProperties
          }
          placeholder="Paste or type your custom text here..."
        />
        <div className="flex justify-end gap-4 mt-4">
          <button
            onClick={() => setShowPresetInput(false)}
            className="px-4 py-2 hover:opacity-80 transition-opacity"
            style={{ color: tv.text.secondary }}
          >
            Cancel
          </button>
          <button
            disabled={!tempPresetText.trim()}
            onClick={() => handlePresetSubmit(tempPresetText)}
            className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          >
            Start
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
