/** Local facts for time-of-day badges. Daily activity and leaderboards use UTC. */
export function getLocalCalendarFields(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const month = date.getMonth();
  const day = date.getDate();
  const dayOfWeek = date.getDay();
  return {
    localDate: `${date.getFullYear()}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    localHour: date.getHours(),
    dayOfWeek,
    month,
    day,
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
  };
}
