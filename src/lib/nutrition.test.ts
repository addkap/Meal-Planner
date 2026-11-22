import { describe, expect, it } from 'vitest';
import { emptyValues, NUTRIENT_KEYS, type NutrientValues } from './nutrients';
import { addTotals, describeTotal, hasPartial, macroSplit, partialKeys, scaleTotals, sumTotals, totalsForGrams, zeroTotals } from './nutrition';

const values = (v: Partial<NutrientValues>): NutrientValues => ({ ...emptyValues(0), ...v });

describe('totals from a food', () => {
  it('scales per-100 g values by weight', () => {
    const t = totalsForGrams(values({ kcal: 200, protein: 10 }), 150);
    expect(t.kcal.amount).toBeCloseTo(300);
    expect(t.protein.amount).toBeCloseTo(15);
    expect(t.kcal.known).toBe(true);
    expect(t.kcal.partial).toBe(false);
  });
  it('treats a missing value as "not listed", never as zero', () => {
    const t = totalsForGrams(values({ kcal: 100, vitK: null }), 100);
    expect(t.vitK.known).toBe(false);
    expect(t.vitK.partial).toBe(true);
    expect(describeTotal(t.vitK).text).toBe('not listed');
    expect(describeTotal(t.kcal)).toEqual({ text: 'value', amount: 100, atLeast: false });
  });
  it('a real zero is a known zero', () => {
    const t = totalsForGrams(values({ cholesterol: 0 }), 100);
    expect(t.cholesterol).toEqual({ amount: 0, known: true, partial: false });
  });
});

describe('adding foods together (a scanned product with missing micronutrients)', () => {
  const salad = totalsForGrams(values({ kcal: 20, vitC: 30, vitK: 100 }), 200); // USDA spinach-like: full data
  const bar = totalsForGrams(values({ kcal: 400, vitC: null, vitK: null }), 50); // label lists no vitamins

  it('sums what is known and marks the rest incomplete', () => {
    const day = sumTotals([salad, bar]);
    expect(day.kcal.amount).toBeCloseTo(40 + 200);
    expect(day.kcal.partial).toBe(false);
    expect(day.vitC.amount).toBeCloseTo(60); // only the salad's
    expect(day.vitC.partial).toBe(true); // ...and we say so
    expect(describeTotal(day.vitC)).toEqual({ text: 'value', amount: 60, atLeast: true });
  });
  it('flags the day as partial data', () => {
    expect(hasPartial(sumTotals([salad, bar]))).toBe(true);
    expect(hasPartial(salad)).toBe(false);
    expect(partialKeys(sumTotals([salad, bar]))).toEqual(['vitC', 'vitK']);
  });
  it('stays "not listed" when no food reports it', () => {
    const t = sumTotals([bar, bar]);
    expect(t.vitK.known).toBe(false);
    expect(describeTotal(t.vitK).text).toBe('not listed');
  });
  it('even a tiny amount of an incomplete food keeps the flag', () => {
    expect(addTotals(salad, bar, 0.01).vitC.partial).toBe(true);
  });
  it('an empty total claims nothing', () => {
    const z = zeroTotals();
    for (const k of NUTRIENT_KEYS) expect(z[k]).toEqual({ amount: 0, known: false, partial: false });
  });
});

describe('scaling', () => {
  it('multiplies every amount and keeps the flags', () => {
    const t = totalsForGrams(values({ kcal: 100, iron: 2, vitD: null }), 100);
    const s = scaleTotals(t, 1.5);
    expect(s.kcal.amount).toBeCloseTo(150);
    expect(s.iron.amount).toBeCloseTo(3);
    expect(s.vitD.partial).toBe(true);
  });
});

describe('macro split', () => {
  it('uses 4/4/9 calories per gram', () => {
    const t = totalsForGrams(values({ protein: 25, carbs: 50, fat: 10 }), 100);
    const m = macroSplit(t);
    expect(m.protein).toBeCloseTo(100 / 390);
    expect(m.carbs).toBeCloseTo(200 / 390);
    expect(m.fat).toBeCloseTo(90 / 390);
  });
  it('is all zeros for an empty day', () => {
    expect(macroSplit(zeroTotals())).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });
});
