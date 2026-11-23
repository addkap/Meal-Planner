// Weight tracker math. Weights are stored in kg and shown in her chosen unit (lb or kg).
import { addDays, fromISO } from './dates';
import type { WeighIn } from '../types';

export const KG_PER_LB = 0.45359237;
export const toKg = (v: number, unit: 'lb' | 'kg') => (unit === 'lb' ? v * KG_PER_LB : v);
export const fromKg = (kg: number, unit: 'lb' | 'kg') => (unit === 'lb' ? kg / KG_PER_LB : kg);
/** One decimal, as a scale shows it. */
export const showWeight = (kg: number, unit: 'lb' | 'kg') => `${(Math.round(fromKg(kg, unit) * 10) / 10).toFixed(1)} ${unit}`;

/** Live weigh-ins, oldest first. Two on the same day: the later-saved one counts for that day. */
export function cleanEntries(list: WeighIn[]): WeighIn[] {
  const byDate = new Map<string, WeighIn>();
  for (const w of list) {
    if (w.deletedAt || !(w.kg > 0)) continue;
    const cur = byDate.get(w.date);
    if (!cur || w.updatedAt >= cur.updatedAt) byDate.set(w.date, w);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export interface TrendPoint { date: string; kg: number | null; avg: number }

/**
 * The 7-day moving average at each weigh-in: the mean of every weigh-in in the 7 days ending that day.
 * Smooths out day-to-day water-weight swings so the real trend shows.
 */
export function movingAverage(entries: WeighIn[], days = 7): TrendPoint[] {
  const e = cleanEntries(entries);
  return e.map((w) => {
    const from = addDays(w.date, -(days - 1));
    const window = e.filter((x) => x.date >= from && x.date <= w.date);
    return { date: w.date, kg: w.kg, avg: window.reduce((s, x) => s + x.kg, 0) / window.length };
  });
}

/** Change in the 7-day average over the last `days` days (null if there is not enough history). */
export function changeOver(points: TrendPoint[], days: number | 'all'): number | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  if (days === 'all') return last.avg - points[0].avg;
  const since = addDays(last.date, -days);
  const base = [...points].reverse().find((p) => p.date <= since) ?? (points[0].date <= since ? points[0] : null);
  return base ? last.avg - base.avg : null;
}

/** Points within the chosen range, ending at the latest weigh-in. */
export function inRange(points: TrendPoint[], days: number | 'all'): TrendPoint[] {
  if (days === 'all' || !points.length) return points;
  const from = addDays(points[points.length - 1].date, -days);
  return points.filter((p) => p.date >= from);
}

/** "2.3 lb down", "0.5 kg up", "no change". */
export function changeText(kg: number | null, unit: 'lb' | 'kg'): string {
  if (kg === null) return 'not enough weigh-ins yet';
  const v = Math.round(fromKg(Math.abs(kg), unit) * 10) / 10;
  if (v === 0) return 'no change';
  return `${v.toFixed(1)} ${unit} ${kg < 0 ? 'down' : 'up'}`;
}

/** Days between two dates (for the chart's time axis). */
export const dayNumber = (d: string) => Math.round(fromISO(d).getTime() / 86_400_000);
