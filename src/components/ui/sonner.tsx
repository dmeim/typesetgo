import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  TrophyIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { tv } from "@/lib/theme-vars";
import { cn } from "@/lib/utils";

const Toaster = ({ className, toastOptions, ...props }: Omit<ToasterProps, "theme">) => {
  const { mode } = useTheme();
  return (
    <Sonner
      {...props}
      theme={mode}
      className={cn("toaster group", className)}
      visibleToasts={props.visibleToasts ?? 7}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
        ...props.icons,
      }}
      toastOptions={{
        ...toastOptions,
        style: {
          background: tv.ui.popover,
          color: tv.ui.popoverForeground,
          borderColor: tv.ui.border,
          boxShadow: "none",
          ...toastOptions?.style,
        },
        actionButtonStyle: {
          background: tv.ui.primary,
          color: tv.ui.primaryForeground,
          ...toastOptions?.actionButtonStyle,
        },
        cancelButtonStyle: {
          background: tv.ui.secondary,
          color: tv.ui.secondaryForeground,
          ...toastOptions?.cancelButtonStyle,
        },
      }}
    />
  );
};

// Custom icon for achievement toasts
const AchievementIcon = ({ color }: { color?: string }) => (
  <TrophyIcon className="size-4" style={{ color: color || tv.ui.primary }} />
);

export { Toaster, AchievementIcon };
