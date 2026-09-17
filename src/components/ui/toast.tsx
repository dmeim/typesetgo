import type { CSSProperties } from "react";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { CircleCheckIcon, InfoIcon, Loader2Icon, CircleXIcon, TriangleAlertIcon, TrophyIcon, WrenchIcon, XIcon } from "lucide-react";
import AchievementIcon from "@/components/auth/AchievementIcon";
import { Button } from "@/components/ui/button";
import { overlaySurface } from "@/components/ui/overlay-styles";
import { getAchievementById, TIER_COLORS } from "@/lib/achievement-definitions";
import { toast, type ToastData } from "@/lib/toast-manager";
import { tv } from "@/lib/theme-vars";
import { cn } from "@/lib/utils";

// Adapted from shadcn's Base UI Toast. Position and stacking share a top origin.
// https://ui.shadcn.com/docs/components/base/toast
function ToastViewport({ className, style, ...props }: ToastPrimitive.Viewport.Props) {
  const { toasts } = ToastPrimitive.useToastManager<ToastData>();
  const visible = toasts.filter((item) => !item.limited);
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      aria-label="Notifications (F6)"
      className={cn("toast-viewport pointer-events-none fixed z-[100] mx-auto w-auto max-w-sm outline-none", className)}
      style={(state) => ({
        "--toast-stack-height": `${visible.reduce((height, item) => height + (item.height ?? 0), 0)}px`,
        "--toast-stack-gaps": Math.max(0, visible.length - 1),
        ...(typeof style === "function" ? style(state) : style),
      }) as CSSProperties}
      {...props}
    />
  );
}

function Toast({ className, onPointerDown, ...props }: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      swipeDirection={["up", "left", "right"]}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        const viewport = event.currentTarget.closest<HTMLElement>('[data-slot="toast-viewport"]');
        // In a tall expanded stack, touch gestures should scroll the history of
        // visible toasts instead of letting swipe dismissal capture the gesture.
        if (event.pointerType === "touch" && viewport?.hasAttribute("data-expanded") && viewport.scrollHeight > viewport.clientHeight) {
          event.preventBaseUIHandler();
        }
      }}
      className={cn(overlaySurface, "toast group/toast pointer-events-auto absolute inset-x-0 top-0 w-full origin-top font-mono outline-none select-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      {...props}
    />
  );
}

function ToastIcon({ item }: { item: ToastPrimitive.Root.ToastObject<ToastData> }) {
  const achievement = item.data?.notificationType === "achievement";
  const definition = achievement && item.data?.metadata?.achievementId
    ? getAchievementById(item.data.metadata.achievementId) : undefined;
  if (definition) {
    return <AchievementIcon icon={definition.icon} className="toast-achievement-icon size-7" />;
  }
  const type = item.type;
  const Icon = achievement ? TrophyIcon : item.data?.notificationType === "maintenance" ? WrenchIcon
    : type === "success" ? CircleCheckIcon : type === "warning" ? TriangleAlertIcon
      : type === "error" ? CircleXIcon : type === "loading" ? Loader2Icon : InfoIcon;
  const color = type === "success" ? tv.status.success.DEFAULT : type === "warning" ? tv.status.warning.DEFAULT
    : type === "error" ? tv.ui.destructive : tv.ui.primary;
  return <Icon aria-hidden="true" className={cn("size-4 shrink-0", type === "loading" && "motion-safe:animate-spin")} style={{ color }} />;
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager<ToastData>();
  return toasts.map((item) => {
    const achievement = item.data?.notificationType === "achievement";
    const tier = item.data?.metadata?.achievementTier;
    const tierColor = tier ? TIER_COLORS[tier as keyof typeof TIER_COLORS]?.bg : undefined;
    return (
      <Toast
        key={item.id}
        toast={item}
        data-achievement={achievement || undefined}
        style={achievement ? { "--toast-tier": tierColor ?? tv.ui.primary } as CSSProperties : undefined}
      >
        <ToastPrimitive.Content data-slot="toast-content" className="toast-content flex items-start gap-3 p-4">
          <span className="mt-0.5 shrink-0"><ToastIcon item={item} /></span>
          <div className="min-w-0 flex-1 space-y-1">
            <ToastPrimitive.Title data-slot="toast-title" className="text-sm leading-snug font-medium break-words" />
            {item.description && <ToastPrimitive.Description data-slot="toast-description" className="text-xs leading-relaxed break-words text-muted-foreground" />}
            {item.actionProps && <ToastPrimitive.Action data-slot="toast-action" render={<Button size="sm" className="mt-2" />} />}
          </div>
          <ToastPrimitive.Close data-slot="toast-close" aria-label="Close notification" render={<Button variant="ghost" size="icon-sm" className="-mr-1 -mt-1 shrink-0 text-muted-foreground" />}>
            <XIcon aria-hidden="true" className="size-4" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Content>
      </Toast>
    );
  });
}

function Toaster({ children, toastManager = toast, timeout = 4000, limit = 7, ...props }: ToastPrimitive.Provider.Props) {
  return (
    <ToastPrimitive.Provider toastManager={toastManager} timeout={timeout} limit={limit} {...props}>
      {children}
      <ToastPrimitive.Portal data-slot="toast-portal">
        <ToastViewport><ToastList /></ToastViewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  );
}

export { Toaster, Toast, ToastViewport };
