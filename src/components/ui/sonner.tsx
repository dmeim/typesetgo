import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  TrophyIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

interface CustomToasterProps extends Omit<ToasterProps, "theme"> {
  theme?: "light" | "dark" | "system";
}

const Toaster = ({ theme = "dark", ...props }: CustomToasterProps) => {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      visibleToasts={7}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-gray-900 group-[.toaster]:text-gray-100 group-[.toaster]:border-gray-700 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-gray-400",
          actionButton:
            "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-900",
          cancelButton:
            "group-[.toast]:bg-gray-800 group-[.toast]:text-gray-400",
        },
      }}
      {...props}
    />
  );
};

// Custom icon for achievement toasts
const AchievementIcon = ({ color }: { color?: string }) => (
  <TrophyIcon className="size-4" style={{ color: color || "#FFD700" }} />
);

export { Toaster, AchievementIcon };
