// Nutrition for a planned day and the week (her own portions), for the review before she finalizes a plan.
import type { DayPlan } from '../types';
import { addTotals, scaleTotals, zeroTotals, type Totals } from './nutrition';
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
    }
    return { date: d.date, totals: t, kcalTarget: d.kcalTarget, fiberTarget: d.fiberTarget };
  });
  const sum = out.reduce((acc, d) => addTotals(acc, d.totals), zeroTotals());
  return { days: out, weeklyAverage: scaleTotals(sum, 1 / Math.max(1, days.length)) };
}
