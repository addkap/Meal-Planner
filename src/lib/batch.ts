// Batch cooking: servings left, where in the week the servings could go, and warnings when she is running low.
//
// Servings used are counted from the daily log (each "I ate this" on a batch meal, or a batch serving logged
// from the food logger), never stored separately, so un-checking a meal gives the serving back.

import type { Batch, DayPlan, LogEntry, MealSlot, WeekPlan } from '../types';
import type { PoolRecipe } from './pool';
import { isFixed } from './planner';
import { peopleFor } from './people';

export interface BatchStatus {
  made: number;
  frozen: number;
  eaten: number;
  /** In the fridge, ready to eat: made - frozen - eaten. */
  left: number;
  /** Batch meals in plans from today on that she has not checked off yet. */
  plannedAhead: number;
  /** More meals are planned than there are servings left. */
  short: number;
  low: boolean;
}

export function batchStatus(b: Batch, logs: LogEntry[], plans: WeekPlan[], today: string): BatchStatus {
  const eaten = logs.filter((l) => l.batchId === b.id && !l.deletedAt).reduce((s, l) => s + l.qty, 0);
  const left = Math.max(0, b.servingsMade - b.frozen - eaten);
  const loggedSlots = new Set(logs.filter((l) => l.batchId === b.id && !l.deletedAt).map((l) => `${l.date}|${l.slot}`));
  let plannedAhead = 0;
  for (const p of plans) {
    if (p.deletedAt) continue;
    for (const d of p.days) {
      if (d.date < today) continue;
      for (const m of d.meals) if (m.batchId === b.id && !loggedSlots.has(`${d.date}|${m.slot}`)) plannedAhead += m.portion;
    }
  }
  const short = Math.max(0, Math.ceil(plannedAhead - left - 1e-9));
  return { made: b.servingsMade, frozen: b.frozen, eaten, left, plannedAhead, short, low: left > 0 && left <= 1 };
}

/** A short line for the screen: "8 of 12 left · 2 in the freezer". */
export function statusText(s: BatchStatus): string {
  const parts = [`${fmt(s.left)} of ${s.made} left`];
  if (s.frozen > 0) parts.push(`${fmt(s.frozen)} in the freezer`);
  if (s.plannedAhead > 0) parts.push(`${fmt(s.plannedAhead)} planned`);
  return parts.join(' · ');
}
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));

/** A warning when she is about to run out, or null. */
export function batchWarning(name: string, s: BatchStatus): string | null {
  if (s.short > 0) return `${name}: ${fmt(s.plannedAhead)} meals are planned but only ${fmt(s.left)} ${s.left === 1 ? 'serving is' : 'servings are'} left${s.frozen > 0 ? ' (take some out of the freezer?)' : ''}.`;
  if (s.left === 0 && s.made > 0) return null;
  if (s.low) return `${name}: only ${fmt(s.left)} serving left.`;
  return null;
}

export interface SlotRef { date: string; slot: MealSlot }

const SLOT_ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/**
 * Meals this week the batch could fill: meal types the recipe suits (egg bites: breakfast or snack), from the day
 * she cooks it on, in open slots (not meals she is keeping, other batches or meals she typed in), and snacks only
 * on days with the snack on. The recipe's own meal type comes first, then one per day before doubling up.
 */
export function fittingSlots(p: PoolRecipe, days: DayPlan[], from: string): SlotRef[] {
  const out: (SlotRef & { rank: number })[] = [];
  for (const d of days) {
    if (d.date < from) continue;
    for (const m of d.meals) {
      if (!p.meals.includes(m.slot) || (isFixed(m) && !m.batchId) || (m.batchId && m.recipeId !== p.id)) continue;
      out.push({ date: d.date, slot: m.slot, rank: (m.slot === p.recipe.meal ? 0 : 10) + SLOT_ORDER.indexOf(m.slot) });
    }
  }
  return out.sort((a, b) => a.rank - b.rank || a.date.localeCompare(b.date)).map(({ date, slot }) => ({ date, slot }));
}

/** The slots to suggest: one per day of the recipe's own meal type first, up to the servings she has. */
export function suggestSlots(p: PoolRecipe, days: DayPlan[], from: string, servings: number, fillAll = false): SlotRef[] {
  const fit = fittingSlots(p, days, from);
  const n = Math.floor(servings + 1e-9);
  if (fillAll) {
    // spread over the days: take one slot per day in turn
    const byDay = new Map<string, SlotRef[]>();
    for (const s of fit) byDay.set(s.date, [...(byDay.get(s.date) ?? []), s]);
    const picked: SlotRef[] = [];
    for (let round = 0; picked.length < n && round < 4; round++) {
      for (const list of byDay.values()) if (list[round] && picked.length < n) picked.push(list[round]);
    }
    return picked.sort((a, b) => a.date.localeCompare(b.date) || SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
  }
  const own = fit.filter((s) => s.slot === p.recipe.meal);
  return own.slice(0, Math.min(n, 4)); // a sensible start: up to 4 of its own meal; she can add more
}

/** Put batch servings into the chosen slots (her own portion is 1 serving each). Other meals are untouched here; re-balance afterwards. */
export function placeBatch(days: DayPlan[], b: Batch, slots: SlotRef[]): DayPlan[] {
  const want = new Set(slots.map((s) => `${s.date}|${s.slot}`));
  return days.map((d) => ({
    ...d,
    meals: d.meals.map((m) => {
      const k = `${d.date}|${m.slot}`;
      if (want.has(k)) return { slot: m.slot, recipeId: b.recipeId, batchId: b.id, portion: 1, people: 1 };
      if (m.batchId === b.id) return { slot: m.slot, recipeId: undefined, portion: 1, people: peopleFor(d, m.slot) }; // taken out: free again
      return m;
    }),
  }));
}
