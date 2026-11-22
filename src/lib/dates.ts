// Dates as local "YYYY-MM-DD" strings (no time zones to trip over). Weeks start on Monday.

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12); // noon: safe from daylight-saving jumps
}

export const todayLocal = () => toISO(new Date());

export function addDays(s: string, n: number): string {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** The Monday on or before the given date. */
export function weekStartOf(s: string): string {
  const d = fromISO(s);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(s, -dow);
}

export const weekDates = (weekStart: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

export function dayName(s: string, style: 'long' | 'short' = 'long'): string {
  return fromISO(s).toLocaleDateString('en-US', { weekday: style });
}

export function shortDate(s: string): string {
  return fromISO(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
