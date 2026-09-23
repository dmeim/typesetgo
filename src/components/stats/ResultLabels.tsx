import {
  CheckCircleIcon, InfinityIcon, KeyboardIcon, ListChecksIcon,
  QuestionIcon, QuotesIcon, TextAaIcon, TimerIcon, WarningCircleIcon,
} from "@phosphor-icons/react";
import { getTestTypeLabels, type ProfileTestResult, type ResultVerification } from "@/components/stats/profile-presentation";

const modeIcons = {
  time: TimerIcon,
  words: TextAaIcon,
  quote: QuotesIcon,
  zen: InfinityIcon,
  preset: ListChecksIcon,
};

export function ResultModeLabels({ result }: { result: ProfileTestResult }) {
  const [mode, ...settings] = getTestTypeLabels(result);
  const ModeIcon = modeIcons[result.mode as keyof typeof modeIcons] ?? KeyboardIcon;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
      <span data-result-mode={result.mode} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-primary/25 bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
        <ModeIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
        <span className="[overflow-wrap:anywhere]">{mode}</span>
      </span>
      {settings.map((label) => <span key={label} className="max-w-full rounded px-1 py-0.5 text-xs text-muted-foreground [overflow-wrap:anywhere]">{label}</span>)}
    </span>
  );
}

export function ResultValidity({ verification }: { verification: ResultVerification }) {
  const StatusIcon = verification === "invalid" ? WarningCircleIcon
    : verification === "unverified" ? QuestionIcon : CheckCircleIcon;
  const label = verification === "invalid" ? "Invalid" : verification === "unverified" ? "Unverified" : "Verified";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${verification === "invalid" ? "text-destructive" : verification === "unverified" ? "text-warning" : "text-muted-foreground"}`}>
      <StatusIcon aria-hidden="true" className={`size-3.5 shrink-0 ${verification === "verified" ? "text-primary" : ""}`} />
      {label}
    </span>
  );
}
