import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowsOutIcon, CheckIcon, CopyIcon, LinkSimpleIcon, ShareNetworkIcon, XIcon, type Icon } from "@phosphor-icons/react";
import { toast } from "@/lib/toast-manager";
import { cn } from "@/lib/utils";
import { joinHost } from "@/components/connect/board/board-actions";
import { CodeTiles } from "@/components/connect/ConnectBadges";
import { ConnectCard } from "@/components/connect/ConnectParts";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";

const COPIED_RESET_MS = 1800;
const pill = "flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border px-3 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring";

/** Full-screen code for a projector; the tiles morph out of the card. */
function BigCode({ code, onClose }: { code: string; onClose: () => void }) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <motion.div role="dialog" aria-modal="true" aria-label="Room code, large" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 bg-background/95 p-6 text-center backdrop-blur" onClick={onClose}>
      <p className="text-xl text-muted-foreground [overflow-wrap:anywhere] sm:text-3xl">Go to <strong className="text-foreground">{joinHost()}</strong> and type</p>
      <motion.div layoutId="room-code-tiles" transition={CONNECT_SPRING}><CodeTiles code={code} big /></motion.div>
      <button type="button" autoFocus onClick={onClose} className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
        <XIcon className="size-4" aria-hidden="true" />Close
      </button>
    </motion.div>
  );
}

/** Copies text and flips to a tick for a moment. */
function CopyButton({ text, label, Icon }: { text: string; label: string; Icon: Icon }) {
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
    <button type="button" onClick={() => void copy()} className={pill} aria-label={copied ? `${label} copied` : label}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={copied ? "done" : "copy"} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={CONNECT_SPRING} className="flex items-center gap-2">
          {copied ? <CheckIcon className="size-4 text-success" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}
          {copied ? "Copied!" : label}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export function CodeCard({ code, className }: { code: string | undefined; className?: string }) {
  const [big, setBig] = useState(false);
  const link = code ? `${window.location.origin}/connect/join?code=${encodeURIComponent(code)}` : "";
  return (
    <ConnectCard title="Room code" description={`Students type this at ${joinHost()}`} Icon={ShareNetworkIcon}
      className={cn("bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--primary)_14%,transparent),transparent_70%)]", className)}>
      {code ? (
        <>
          <div className="flex h-16 justify-center">
            {!big && <motion.div key={code} layoutId="room-code-tiles" transition={CONNECT_SPRING}><CodeTiles code={code} /></motion.div>}
          </div>
          <p className="truncate text-center font-mono text-xs text-muted-foreground">{link.replace(/^https?:\/\//, "")}</p>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={code} label="Copy code" Icon={CopyIcon} />
            <CopyButton text={link} label="Copy link" Icon={LinkSimpleIcon} />
            <button type="button" onClick={() => setBig(true)} className={pill}>
              <ArrowsOutIcon className="size-4" aria-hidden="true" />Show big
            </button>
          </div>
          <AnimatePresence>{big && <BigCode code={code} onClose={() => setBig(false)} />}</AnimatePresence>
        </>
      ) : <p className="text-center text-sm text-muted-foreground">This room has no code right now.</p>}
    </ConnectCard>
  );
}
