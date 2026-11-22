import { describe, expect, it } from 'vitest';
import { FOOD_KEYS } from '../data/foodKeys';
import { NUTRIENT_KEYS } from './nutrients';
import { customToFood } from './foodDb';
import { testDb } from './testDb';
import { toGrams } from './units';

describe('the bundled USDA food database', () => {
  const db = testDb();
  it('has between 1,500 and 2,500 commonly eaten foods', () => {
    expect(db.usda.size).toBeGreaterThanOrEqual(1500);
    expect(db.usda.size).toBeLessThanOrEqual(2500);
  });
  it('covers everyday foods she might log off-plan', () => {
    const names = [...db.usda.values()].map((f) => f.name.toLowerCase());
    for (const want of ['bananas, raw', 'bread, whole-wheat', 'cheese, cheddar', 'milk', 'yogurt', 'crackers', 'potato chips', 'cookies', 'pizza', 'coffee', 'orange juice', 'peanut butter', 'tortilla chips', 'ice cream', 'bagels', 'rice, white']) {
      expect(names.some((n) => n.includes(want)), want).toBe(true);
    }
  });
  it('every food has calories and the main macros', () => {
    for (const f of db.usda.values()) {
      expect(f.per100g.kcal, f.name).not.toBeNull();
      expect(f.per100g.protein, f.name).not.toBeNull();
      expect(Object.keys(f.per100g)).toEqual(NUTRIENT_KEYS);
    }
  });
  it('keeps "not listed" nutrients as null (not 0)', () => {
    const nulls = [...db.usda.values()].filter((f) => f.per100g.vitD === null).length;
    expect(nulls).toBeGreaterThan(100); // many USDA foods do not report vitamin D
  });
  it('has household portions for most foods', () => {
    const withPortions = [...db.usda.values()].filter((f) => f.portions.length > 0).length;
    expect(withPortions / db.usda.size).toBeGreaterThan(0.9);
  });
  it('contains every food the recipes use, under its friendly name', () => {
    for (const [key, k] of Object.entries(FOOD_KEYS)) {
      const f = db.get(`key:${key}`);
      expect(f, key).not.toBeNull();
      expect(f!.name).toBe(k.name);
      expect(f!.cat).toBe(k.cat);
    }
  });
  it('uses the right form of foods that change a lot when cooked', () => {
    expect(db.get('key:lentils')!.per100g.kcal).toBeGreaterThan(300); // dry lentils, not cooked (~116)
    expect(db.get('key:brown_rice')!.per100g.kcal).toBeGreaterThan(300); // dry rice
    expect(db.get('key:chickpeas')!.per100g.kcal).toBeLessThan(160); // canned and drained, not dry (~378)
    expect(db.get('key:chicken_breast')!.per100g.kcal).toBeLessThan(130); // raw (cooked is ~165)
  });
  it('unknown references find nothing', () => {
    expect(db.get('key:nope')).toBeNull();
    expect(db.get('usda:1')).toBeNull();
    expect(db.get('custom:x')).toBeNull();
  });
});

describe('custom and scanned foods', () => {
  it('become normal foods with a "serving" portion', () => {
    const f = customToFood({ id: 'c1', updatedAt: 1, name: 'Granola bar', brand: 'Acme', cat: 'snacks', per100g: { ...Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, null])), kcal: 450 } as never, servingG: 40, servingLabel: '1 bar', portions: [], source: 'scanned' });
    expect(f.name).toBe('Granola bar (Acme)');
    expect(toGrams(f, 1.5, 'serving')).toBe(60);
    const db = testDb();
    db.setCustomFoods([{ id: 'c1', updatedAt: 1, name: 'Bar', cat: 'snacks', per100g: f.per100g, portions: [], source: 'custom' }]);
    expect(db.get('custom:c1')!.per100g.kcal).toBe(450);
    db.setCustomFoods([]);
  });
});
