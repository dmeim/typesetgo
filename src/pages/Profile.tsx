import Header from "@/components/layout/Header";
import { ProfilePage } from "@/components/profile/ProfilePage";

/** /profile, /profile/:tab and /profile/:userId; see components/profile/profile-routes.ts. */
export default function Profile() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background font-mono text-foreground">
      <Header />
      <ProfilePage />
    </div>
  );
}
