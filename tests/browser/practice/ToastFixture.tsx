import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import NotificationCenter from "@/components/layout/NotificationCenter";
import { useTheme } from "@/hooks/useTheme";
import { useNotify } from "@/hooks/useNotify";
import { toast } from "@/lib/toast-manager";
import { getAchievementsByCategory } from "@/lib/achievement-definitions";

export default function ToastFixture() {
  const notify = useNotify();
  const { setMode, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const achievements = getAchievementsByCategory("speed");
  const award = (count: number) => achievements.slice(0, count).forEach((achievement) => notify({
    type: "achievement", title: achievement.title, description: achievement.description,
    metadata: { achievementId: achievement.id, achievementTier: achievement.tier },
  }));
  const error = () => toast.add({ type: "error", title: "Set at least 1 second.",
    description: "Your settings are kept here. Choose a duration and try again.", timeout: 0 });

  return <main className="mx-auto mt-60 flex max-w-2xl flex-wrap gap-3 p-4">
    <NotificationCenter />
    <input aria-label="Typing input" className="w-full border border-input p-2" onKeyDown={(event) => {
      if (event.key === "Enter") toast.add({ type: "info", title: "Progress saved", timeout: 0 });
    }} />
    <Button onClick={() => award(1)}>Award achievement</Button>
    <Button onClick={() => award(10)}>Award burst</Button>
    <Button onClick={error}>Show error</Button>
    <Button onClick={() => toast.close()}>Dismiss toasts</Button>
    <Button onClick={() => setMode("light")}>Light theme</Button>
    <Button onClick={() => setMode("dark")}>Dark theme</Button>
    <Button onClick={() => void setTheme("palenight")}>Alternate theme</Button>
    <Button onClick={() => setOpen(true)}>Open dialog</Button>
    <Button onClick={() => toast.add({ title: "Temporary feedback", timeout: 800 })}>Timed toast</Button>
    <Button onClick={() => void toast.promise(new Promise<string>((resolve) => setTimeout(() => resolve("Saved successfully"), 150)), {
      loading: "Saving changes", success: (title) => ({ title, timeout: 0 }), error: "Save failed",
    })}>Promise toast</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle>Notification dialog fixture</DialogTitle>
        <DialogDescription>Exercise feedback while a modal is open.</DialogDescription>
        <Button onClick={error}>Invalid count</Button>
      </DialogContent>
    </Dialog>
  </main>;
}
