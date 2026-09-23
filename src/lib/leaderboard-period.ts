/** Leaderboard windows use UTC calendar days, matching the backend. */
export function utcDayStart(now: number): number {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function msUntilNextUtcDay(now: number): number {
  return utcDayStart(now) + 86_400_000 - now;
}

const utcDay = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC", weekday: "long", month: "short", day: "numeric",
});
const utcShortDay = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC", month: "short", day: "numeric",
});

export function todayTitleUTC(periodStart: number): string {
  return utcDay.format(periodStart);
}

export function weekTitleUTC(periodStart: number): string {
  return `${utcShortDay.format(periodStart - 7 * 86_400_000)} – ${utcShortDay.format(periodStart)}`;
}
