import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { HostCard, JoinCard } from "@/components/connect";
import { RoomPage } from "@/components/connect/RoomUI";
import { tv } from "@/lib/theme-vars";

export default function Connect() {
  return (
    <RoomPage>
      <div className="mx-auto max-w-4xl space-y-8 py-4 sm:py-12">
        <header className="space-y-3">
          <Link to="/" className="inline-flex items-center gap-2 rounded py-2 text-sm">
            <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
            Back to typing
          </Link>
          <h1 className="text-3xl font-semibold">Connect</h1>
          <p style={{ color: tv.ui.mutedForeground }}>
            Practice together with settings chosen by your host.
          </p>
        </header>
        <div className="grid items-start gap-5 md:grid-cols-2">
          <HostCard />
          <JoinCard />
        </div>
      </div>
    </RoomPage>
  );
}
