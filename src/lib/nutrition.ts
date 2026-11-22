// Nutrient math. The one rule that matters most: a nutrient that is "not listed" for some food is
// never counted as zero. Totals remember that they are incomplete, so the screen can say
// "at least 12 mg (some foods not listed)" or "not listed" instead of a misleading number.

import { NUTRIENT_KEYS, type NutrientKey, type NutrientValues } from './nutrients';

export interface NutrientTotal {
  amount: number; // sum of the values that ARE known
  known: boolean; // at least one contributor reported it
  partial: boolean; // at least one contributor did NOT report it
}

export type Totals = Record<NutrientKey, NutrientTotal>;

export function zeroTotals(): Totals {
  return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, { amount: 0, known: false, partial: false }])) as Totals;
}

/** Totals for `grams` of a food whose values are per 100 g. */
export function totalsForGrams(per100g: NutrientValues, grams: number): Totals {
  const t = zeroTotals();
  const f = grams / 100;
  for (const k of NUTRIENT_KEYS) {
    const v = per100g[k];
    if (v === null || v === undefined || !Number.isFinite(v)) t[k].partial = true;
    else { t[k].amount = v * f; t[k].known = true; }
  }
  return t;
}

/** a + b*factor (a new object). An empty contributor (0 grams) still passes on "not listed". */
export function addTotals(a: Totals, b: Totals, factor = 1): Totals {
  const t = zeroTotals();
  for (const k of NUTRIENT_KEYS) {
    t[k] = {
      amount: a[k].amount + b[k].amount * factor,
      known: a[k].known || b[k].known,
      partial: a[k].partial || b[k].partial,
    };
  }
  return t;
}

export function scaleTotals(a: Totals, factor: number): Totals {
  return addTotals(zeroTotals(), a, factor);
}

export function sumTotals(list: Totals[]): Totals {
  return list.reduce((acc, t) => addTotals(acc, t), zeroTotals());
}

/** True if any of the given nutrients is incomplete (used to flag a day as "partial data"). */
export function hasPartial(t: Totals, keys: readonly NutrientKey[] = NUTRIENT_KEYS): boolean {
  return keys.some((k) => t[k].partial);
}

/** Which nutrients are incomplete. */
export const partialKeys = (t: Totals): NutrientKey[] => NUTRIENT_KEYS.filter((k) => t[k].partial);

/** Convenient plain numbers (unknown counts as 0 here, so only use for calories, protein etc. that are always listed). */
export const amount = (t: Totals, k: NutrientKey) => t[k].amount;

/** Share of calories from protein, carbs and fat (4/4/9 kcal per gram). */
export function macroSplit(t: Totals): { protein: number; carbs: number; fat: number } {
  const p = t.protein.amount * 4;
  const c = t.carbs.amount * 4;
  const f = t.fat.amount * 9;
  const sum = p + c + f;
  if (sum <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return { protein: p / sum, carbs: c / sum, fat: f / sum };
}

/** How to show one total: "not listed", or the number with an "at least" marker when incomplete. */
export function describeTotal(t: NutrientTotal): { text: 'not listed' | 'value'; amount: number; atLeast: boolean } {
  if (!t.known) return { text: 'not listed', amount: 0, atLeast: false };
  return { text: 'value', amount: t.amount, atLeast: t.partial };
}
