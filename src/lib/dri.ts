// Daily targets for every nutrient, from the Dietary Reference Intakes (National Academies), by sex and age.
// Vitamins and minerals use the RDA, or the AI where there is no RDA. Sodium uses the Chronic Disease Risk
// Reduction intake (a "stay under" limit). Fat, carbs and saturated fat scale with her calorie target.
// Calories and fiber come from her own targets in Settings.

import type { AgeRange, Sex } from '../types';
import type { NutrientKey } from './nutrients';

export interface Target {
  amount: number;
  /** 'min' = aim to reach it; 'max' = stay under it; 'info' = shown for reference, not flagged. */
  kind: 'min' | 'max' | 'info';
}

type ByAge = [number, number, number, number]; // 19-30, 31-50, 51-70, 71+
const AGE_INDEX: Record<AgeRange, number> = { '19-30': 0, '31-40': 1, '41-50': 1, '51-60': 2, '61-70': 2, '71-80': 3, '81+': 3 };
export const AGE_RANGES = Object.keys(AGE_INDEX) as AgeRange[];

/** Earlier versions saved 20-year ranges; map them (and anything unknown) onto the 10-year ones with the same targets. */
const OLD_AGES: Record<string, AgeRange> = { '31-50': '41-50', '51-70': '51-60', '71+': '71-80' };
export function normalizeAge(age: string | undefined): AgeRange {
  if (age && age in AGE_INDEX) return age as AgeRange;
  return (age && OLD_AGES[age]) || '51-60';
}

const RDA: Record<Sex, Partial<Record<NutrientKey, number | ByAge>>> = {
  female: {
    protein: 46, vitA: 700, vitC: 75, vitD: [15, 15, 15, 20], vitE: 15, vitK: 90, thiamin: 1.1, riboflavin: 1.1, niacin: 14,
    pantothenic: 5, vitB6: [1.3, 1.3, 1.5, 1.5], folate: 400, vitB12: 2.4, calcium: [1000, 1000, 1200, 1200], iron: [18, 18, 8, 8],
    magnesium: [310, 320, 320, 320], phosphorus: 700, potassium: 2600, zinc: 8, copper: 0.9, manganese: 1.8, selenium: 55,
  },
  male: {
    protein: 56, vitA: 900, vitC: 90, vitD: [15, 15, 15, 20], vitE: 15, vitK: 120, thiamin: 1.2, riboflavin: 1.3, niacin: 16,
    pantothenic: 5, vitB6: [1.3, 1.3, 1.7, 1.7], folate: 400, vitB12: 2.4, calcium: [1000, 1000, 1000, 1200], iron: 8,
    magnesium: [400, 420, 420, 420], phosphorus: 700, potassium: 3400, zinc: 11, copper: 0.9, manganese: 2.3, selenium: 55,
  },
};

/** Tolerable Upper Intake Levels worth flagging from food (adults). */
export const UPPER_LIMITS: Partial<Record<NutrientKey, number>> = { iron: 45, zinc: 40, selenium: 400, copper: 10, manganese: 11, calcium: 2000 };

export function dailyTargets(sex: Sex, age: AgeRange, kcal: number, fiber: number): Record<NutrientKey, Target> {
  const pick = (v: number | ByAge | undefined) => (Array.isArray(v) ? v[AGE_INDEX[normalizeAge(age)]] : (v ?? 0));
  const t = {} as Record<NutrientKey, Target>;
  for (const [k, v] of Object.entries(RDA[sex])) t[k as NutrientKey] = { amount: pick(v), kind: 'min' };
  t.kcal = { amount: kcal, kind: 'info' };
  t.fiber = { amount: fiber, kind: 'min' };
  t.fat = { amount: (kcal * 0.35) / 9, kind: 'info' }; // Mediterranean eating is often 30-40% fat, mostly olive oil
  t.satFat = { amount: (kcal * 0.1) / 9, kind: 'max' };
  t.monoFat = { amount: 0, kind: 'info' };
  t.polyFat = { amount: 0, kind: 'info' };
  t.carbs = { amount: (kcal * 0.5) / 4, kind: 'info' };
  t.sugars = { amount: 0, kind: 'info' }; // includes natural fruit and milk sugars, so no target
  t.cholesterol = { amount: 0, kind: 'info' }; // the 2015-2020 Dietary Guidelines dropped the 300 mg limit
  t.sodium = { amount: 2300, kind: 'max' };
  return t;
}

/** Percent of target (0 when there is no target). */
export const pctOf = (amount: number, t: Target) => (t.amount > 0 ? (amount / t.amount) * 100 : 0);

export type Flag = { key: NutrientKey; kind: 'low' | 'high'; avgPct: number; days: number };

/**
 * Nutrients that are consistently low or high across a set of days: the average is off AND most days are off.
 * Nutrients with "not listed" data are not called low (they may just be missing from a label).
 */
export function consistentFlags(
  days: { amount: Record<NutrientKey, number>; partial: Record<NutrientKey, boolean> }[],
  targets: Record<NutrientKey, Target>,
): Flag[] {
  const out: Flag[] = [];
  if (!days.length) return out;
  for (const key of Object.keys(targets) as NutrientKey[]) {
    const t = targets[key];
    if (t.kind === 'info' || t.amount <= 0) continue;
    const pcts = days.map((d) => pctOf(d.amount[key], t));
    const avg = pcts.reduce((s, p) => s + p, 0) / pcts.length;
    const mostDays = Math.ceil(days.length * 0.6);
    if (t.kind === 'min') {
      const lowDays = pcts.filter((p) => p < 70).length;
      if (avg < 70 && lowDays >= mostDays && !days.some((d) => d.partial[key])) out.push({ key, kind: 'low', avgPct: avg, days: lowDays });
      const ul = UPPER_LIMITS[key];
      if (ul) {
        const highDays = days.filter((d) => d.amount[key] > ul).length;
        if (highDays >= mostDays) out.push({ key, kind: 'high', avgPct: avg, days: highDays });
      }
    } else {
      const highDays = pcts.filter((p) => p > 100).length;
      if (avg > 100 && highDays >= mostDays) out.push({ key, kind: 'high', avgPct: avg, days: highDays });
    }
  }
  return out;
}
