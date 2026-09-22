import { v } from "convex/values";

export const activityCalendarValidator = v.object({
  localDate: v.string(), localHour: v.number(), dayOfWeek: v.number(),
  month: v.number(), day: v.number(),
});

export interface ActivityCalendar {
  localDate: string;
  localHour: number;
  dayOfWeek: number;
  month: number;
  day: number;
}

/** Validate the local date as one coherent fact; never use it as the daily UTC bucket. */
export function activityCalendar(fields: ActivityCalendar, timestamp: number): ActivityCalendar {
  const { localDate, localHour, dayOfWeek, month, day } = fields;
  const date = new Date(`${localDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate) || !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== localDate ||
    !Number.isInteger(localHour) || localHour < 0 || localHour > 23 ||
    date.getUTCDay() !== dayOfWeek || date.getUTCMonth() !== month || date.getUTCDate() !== day ||
    Math.abs(date.getTime() - timestamp) > 48 * 60 * 60 * 1000) {
    throw new Error("Invalid local calendar facts.");
  }
  return { localDate, localHour, dayOfWeek, month, day };
}

export function utcDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}
