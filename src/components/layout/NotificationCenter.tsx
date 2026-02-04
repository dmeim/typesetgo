import { useState } from "react";
import {
  BellIcon,
  TrophyIcon,
  WrenchIcon,
  InfoIcon,
  AlertTriangleIcon,
  XCircleIcon,
  CheckIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useTheme } from "@/hooks/useTheme";
import {
  useNotifications,
  getRelativeTime,
  getNotificationColor,
  type Notification,
} from "@/lib/notification-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TIER_COLORS } from "@/lib/achievement-definitions";
import AchievementsModal from "@/components/auth/AchievementsModal";

function getNotificationIcon(notification: Notification) {
  const color =
    notification.type === "achievement" && notification.metadata?.achievementTier
      ? TIER_COLORS[notification.metadata.achievementTier as keyof typeof TIER_COLORS]?.bg ||
        getNotificationColor(notification.type)
      : getNotificationColor(notification.type);

  switch (notification.type) {
    case "achievement":
      return <TrophyIcon className="size-4 shrink-0" style={{ color }} />;
    case "maintenance":
      return <WrenchIcon className="size-4 shrink-0" style={{ color }} />;
    case "warning":
      return <AlertTriangleIcon className="size-4 shrink-0" style={{ color }} />;
    case "error":
      return <XCircleIcon className="size-4 shrink-0" style={{ color }} />;
    case "info":
    default:
      return <InfoIcon className="size-4 shrink-0" style={{ color }} />;
  }
}

export default function NotificationCenter() {
  const { user: clerkUser, isSignedIn } = useUser();
  const { legacyTheme } = useTheme();
  
  // Fallback theme for when context is loading
  const theme = legacyTheme ?? {
    buttonUnselected: "#3cb5ee",
    surfaceColor: "#2c2e31",
    defaultText: "#4b5563",
    correctText: "#d1d5db",
  };
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    getUnreadCount,
  } = useNotifications();

  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [selectedAchievementId, setSelectedAchievementId] = useState<string | null>(null);

  // Fetch achievements for the modal (only when signed in)
  // getUserAchievements returns Record<string, number> directly (achievementId -> timestamp)
  const earnedAchievements = useQuery(
    api.achievements.getUserAchievements,
    isSignedIn && clerkUser ? { clerkId: clerkUser.id } : "skip"
  ) ?? {};

  const unreadCount = getUnreadCount();

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    if (notification.type === "achievement" && notification.metadata?.achievementId) {
      setSelectedAchievementId(notification.metadata.achievementId);
      setShowAchievementsModal(true);
    } else if (notification.metadata?.actionUrl) {
      window.open(notification.metadata.actionUrl, "_blank");
    }
  };

  const handleCloseModal = () => {
    setShowAchievementsModal(false);
    setSelectedAchievementId(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="relative flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-gray-800/50"
            style={{ color: theme.buttonUnselected }}
            title="Notifications"
          >
            <BellIcon className="size-5" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold"
                style={{
                  backgroundColor: "#EF4444",
                  color: "#FFFFFF",
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-80 max-h-96 overflow-y-auto"
          style={{
            backgroundColor: theme.surfaceColor,
            borderColor: `${theme.defaultText}20`,
          }}
        >
          <DropdownMenuLabel
            className="flex items-center justify-between"
            style={{ color: theme.correctText }}
          >
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${theme.correctText}20`,
                  color: theme.correctText,
                }}
              >
                {unreadCount} new
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator style={{ backgroundColor: `${theme.defaultText}20` }} />

          {notifications.length === 0 ? (
            <div
              className="py-8 text-center text-sm"
              style={{ color: theme.defaultText }}
            >
              No notifications yet
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 p-2">
                {unreadCount > 0 && (
                  <button
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs transition hover:bg-gray-800/50"
                    style={{ color: theme.defaultText }}
                    onClick={(e) => {
                      e.preventDefault();
                      markAllAsRead();
                    }}
                  >
                    <CheckIcon className="size-3" />
                    Mark all read
                  </button>
                )}
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs transition hover:bg-gray-800/50"
                  style={{ color: theme.defaultText }}
                  onClick={(e) => {
                    e.preventDefault();
                    clearAll();
                  }}
                >
                  <Trash2Icon className="size-3" />
                  Clear all
                </button>
              </div>

              <DropdownMenuSeparator style={{ backgroundColor: `${theme.defaultText}20` }} />

              {notifications.slice(0, 20).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="group flex items-start gap-3 p-3 cursor-pointer"
                  style={{
                    backgroundColor: notification.read
                      ? "transparent"
                      : `${theme.correctText}08`,
                  }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="mt-0.5">{getNotificationIcon(notification)}</div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium truncate"
                      style={{ color: theme.correctText }}
                    >
                      {notification.title}
                    </div>
                    <div
                      className="text-xs mt-0.5 line-clamp-2"
                      style={{ color: theme.defaultText }}
                    >
                      {notification.description}
                    </div>
                    <div
                      className="text-xs mt-1"
                      style={{ color: `${theme.defaultText}80` }}
                    >
                      {getRelativeTime(notification.timestamp)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity hover:bg-gray-800/50"
                      style={{ color: theme.defaultText }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(notification.id);
                      }}
                      title="Remove notification"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                    {!notification.read && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: "#3B82F6" }}
                      />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Achievements Modal */}
      {showAchievementsModal && (
        <AchievementsModal
          earnedAchievements={earnedAchievements}
          onClose={handleCloseModal}
          initialAchievementId={selectedAchievementId}
        />
      )}
    </>
  );
}
