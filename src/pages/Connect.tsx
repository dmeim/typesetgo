import { useLocation, useSearchParams } from "react-router-dom";
import { ConnectShell } from "@/components/connect/ConnectShell";
import { HostRoomCard } from "@/components/connect/landing/HostRoomCard";
import { JoinRoomCard } from "@/components/connect/landing/JoinRoomCard";
import { cn } from "@/lib/utils";

export default function Connect() {
  const location = useLocation();
  const [params] = useSearchParams();
  const joining = location.pathname.replace(/\/+$/, "") === "/connect/join";
  const code = params.get("code") ?? "";
  const focusJoin = joining || code.length > 0;

  return (
    <ConnectShell className="max-w-5xl">
      <div className="space-y-8 py-2 sm:py-8">
        <header className="max-w-2xl space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Connect</h1>
          <p className="text-muted-foreground">
            Type together in real time. A host sets up a list of tests and everyone in the room follows along,
            on a shared clock or at their own pace.
          </p>
        </header>
        <div className="grid items-start gap-5 md:grid-cols-2">
          <HostRoomCard className={cn(focusJoin && "order-2 md:order-1")} />
          <JoinRoomCard
            key={code}
            className={cn(focusJoin && "order-1 md:order-2")}
            initialCode={code}
            focusName={code.length > 0}
            highlighted={focusJoin}
          />
        </div>
      </div>
    </ConnectShell>
  );
}
