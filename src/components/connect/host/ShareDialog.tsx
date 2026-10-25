import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast-manager";

const COPIED_RESET_MS = 2000;

function inviteLink(code: string) {
  return `${window.location.origin}/connect/join?code=${encodeURIComponent(code)}`;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      toast.add({ type: "error", title: "Copy isn't available here", description: "Select the text and copy it manually." });
    }
  };
  return (
    <Button type="button" variant="outline" onClick={() => void copy()} aria-label={copied ? `${label} copied` : label}>
      {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function ShareDialog({ open, onOpenChange, code, roomName }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  roomName: string;
}) {
  const link = inviteLink(code);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite participants</DialogTitle>
          <DialogDescription>
            Participants open Connect, choose Join, and enter this code to join {roomName}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 rounded-lg bg-muted p-4 sm:p-6">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Room code</span>
          <span className="font-mono text-5xl font-bold tracking-[0.3em] sm:text-6xl" aria-label={`Room code ${code.split("").join(" ")}`}>
            {code}
          </span>
          <CopyButton text={code} label="Copy room code" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="connect-invite-link">Invite link</Label>
          <div className="flex gap-2">
            <Input id="connect-invite-link" readOnly value={link} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1" />
            <CopyButton text={link} label="Copy invite link" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
