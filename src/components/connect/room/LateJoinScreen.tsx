import { HourglassMediumIcon } from "@phosphor-icons/react";
import type { ConnectTest } from "@/lib/connect-types";
import { connectTestLabels } from "@/lib/connect-settings";
import { TestList } from "./TestList";

/** Host pacing: shown to someone who joined partway through a test until the host starts the next one. */
export function LateJoinScreen({ tests, index, name }: { tests: ConnectTest[]; index: number; name: string }) {
  const current = connectTestLabels(tests)[index]?.title ?? "a test";
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
      <HourglassMediumIcon className="size-10 text-primary" weight="regular" aria-hidden="true" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">You'll start with the next test</h1>
        <p className="text-muted-foreground">
          Everyone is partway through <span className="font-medium text-foreground">{current}</span>. You're in
          as <span className="font-medium text-foreground">{name}</span> and join in when the host starts the next test.
        </p>
      </div>
      <TestList tests={tests} currentIndex={index} />
    </div>
  );
}
