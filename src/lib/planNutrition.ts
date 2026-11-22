// Nutrition for a planned day and the week (her own portions), for the review before she finalizes a plan.
import type { DayPlan } from '../types';
import { addTotals, scaleTotals, totalsForGrams, zeroTotals, type Totals } from './nutrition';
import { emptyValues } from './nutrients';
import type { CustomMeal } from '../types';
import type { BatchInfo } from './planner';
import type { PoolRecipe } from './pool';

export interface PlanNutrition {
  days: { date: string; totals: Totals; kcalTarget: number; fiberTarget: number }[];
  weeklyAverage: Totals;
}

export function planNutrition(days: DayPlan[], pool: PoolRecipe[], batches: BatchInfo[] = []): PlanNutrition {
  const byId = new Map(pool.map((p) => [p.id, p]));
  const batchRecipe = new Map(batches.map((b) => [b.id, b.recipeId]));
  const out = days.map((d) => {
    let t = zeroTotals();
    for (const m of d.meals) {
      const p = byId.get(m.recipeId ?? batchRecipe.get(m.batchId ?? '') ?? '');
      if (p) t = addTotals(t, p.perServing, m.portion);
      else if (m.custom) t = addTotals(t, customTotals(m.custom), m.portion);
    }
    return { date: d.date, totals: t, kcalTarget: d.kcalTarget, fiberTarget: d.fiberTarget };
  });
  const sum = out.reduce((acc, d) => addTotals(acc, d.totals), zeroTotals());
  return { days: out, weeklyAverage: scaleTotals(sum, 1 / Math.max(1, days.length)) };
}

/** A meal she typed in: only what she entered is known; everything else is "not listed". */
export function customTotals(c: CustomMeal): Totals {
  const v = emptyValues(null);
  if (c.kcal !== undefined) v.kcal = c.kcal;
  if (c.fiber !== undefined) v.fiber = c.fiber;
  if (c.protein !== undefined) v.protein = c.protein;
  return totalsForGrams(v, 100); // values given "per 100 g" with 100 g = the whole meal
}
