// The daily log: what she ate (planned meals she checked off, and anything else she logged) and its nutrition.
// Planned meals use the recipe's per-serving nutrition times the servings she ate; foods use their weight.
// Nutrients a food does not list stay "not listed", and the day is marked as having partial data.

import type { LogEntry, MealSlot, Recipe } from '../types';
import type { FoodDb } from './foodDb';
import { NUTRIENTS, type NutrientKey } from './nutrients';
import { addTotals, scaleTotals, totalsForGrams, zeroTotals, type Totals } from './nutrition';
import { customTotals } from './planNutrition';
import { recipeNutrition } from './recipes';

export interface LogCtx {
  foods: FoodDb;
  recipes: Map<string, Recipe>;
  /** batch id -> recipe id */
  batchRecipe?: Map<string, string>;
}

const perServingCache = new WeakMap<Recipe, Totals>();
function perServing(r: Recipe, foods: FoodDb): Totals {
  let t = perServingCache.get(r);
  if (!t) { t = recipeNutrition(r, foods).perServing; perServingCache.set(r, t); }
  return t;
}

export function entryTotals(e: LogEntry, ctx: LogCtx): Totals {
  if (e.kind === 'food') {
    const food = e.food ? ctx.foods.get(e.food) : null;
    if (!food || e.grams === undefined) return totalsForGrams({} as never, 0); // unknown food: everything "not listed"
    return totalsForGrams(food.per100g, e.grams);
  }
  if (e.custom) return scaleTotals(customTotals(e.custom), e.qty);
  const recipeId = e.recipeId ?? (e.batchId ? ctx.batchRecipe?.get(e.batchId) : undefined);
  const r = recipeId ? ctx.recipes.get(recipeId) : undefined;
  if (!r) return totalsForGrams({} as never, 0);
  return scaleTotals(perServing(r, ctx.foods), e.qty);
}

export interface SlotSummary { slot: MealSlot; entries: LogEntry[]; totals: Totals }

export interface DaySummary {
  slots: SlotSummary[];
  totals: Totals;
  /** Nutrients that are missing from at least one food eaten today (so their totals are "at least"). */
  partial: NutrientKey[];
}

export function summarizeDay(entries: LogEntry[], ctx: LogCtx): DaySummary {
  const live = entries.filter((e) => !e.deletedAt);
  const slots: SlotSummary[] = (['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((slot) => {
    const list = live.filter((e) => e.slot === slot);
    return { slot, entries: list, totals: list.reduce((t, e) => addTotals(t, entryTotals(e, ctx)), zeroTotals()) };
  });
  const totals = slots.reduce((t, s) => addTotals(t, s.totals), zeroTotals());
  return { slots, totals, partial: NUTRIENTS.map((n) => n.key).filter((k) => live.length > 0 && totals[k].partial) };
}

/** Calories and fiber targets for a day: her override for that day, else the plan's, else Settings. */
export function targetsFor(date: string, override: { kcal?: number; fiber?: number } | undefined, planDay: { kcalTarget: number; fiberTarget: number } | undefined, settings: { kcal: number; fiber: number }) {
  return {
    kcal: override?.kcal ?? planDay?.kcalTarget ?? settings.kcal,
    fiber: override?.fiber ?? planDay?.fiberTarget ?? settings.fiber,
    overridden: override?.kcal !== undefined || override?.fiber !== undefined,
    date,
  };
}
