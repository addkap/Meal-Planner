import { describe, expect, it } from 'vitest';
import { BUILTIN_RECIPES } from '../data/recipes';
import { entryTotals, summarizeDay, targetsFor } from './log';
import { hasPartial } from './nutrition';
import { productToFood } from './openFoodFacts';
import { recipeNutrition } from './recipes';
import { makeIndex } from './search';
import { testDb } from './testDb';
import type { LogEntry } from '../types';

const foods = testDb();
const recipes = new Map(BUILTIN_RECIPES.map((r) => [r.id, r]));
const ctx = { foods, recipes, batchRecipe: new Map([['b1', 'b-spinach-and-feta-egg-bites']]) };
const D = '2026-11-23';
let n = 0;
const entry = (e: Partial<LogEntry>): LogEntry => ({ id: `e${n++}`, updatedAt: 1, date: D, slot: 'lunch', kind: 'food', qty: 1, label: 'x', ...e });

describe('what a logged entry adds', () => {
  it('a planned recipe counts the servings she ate', () => {
    const r = recipes.get('l-greek-lentil-salad')!;
    const per = recipeNutrition(r, foods).perServing;
    expect(entryTotals(entry({ kind: 'planned', recipeId: r.id, qty: 1.25 }), ctx).kcal.amount).toBeCloseTo(per.kcal.amount * 1.25, 6);
    expect(entryTotals(entry({ kind: 'planned', recipeId: r.id, qty: 0.5 }), ctx).fiber.amount).toBeCloseTo(per.fiber.amount * 0.5, 6);
  });
  it('a batch serving uses the recipe’s per-serving nutrition', () => {
    const per = recipeNutrition(recipes.get('b-spinach-and-feta-egg-bites')!, foods).perServing;
    expect(entryTotals(entry({ kind: 'batch', batchId: 'b1', qty: 1 }), ctx).kcal.amount).toBeCloseTo(per.kcal.amount, 6);
  });
  it('a food counts by its weight', () => {
    const apple = foods.get('key:apple')!;
    expect(entryTotals(entry({ food: 'key:apple', qty: 1, unit: 'medium', grams: 182 }), ctx).kcal.amount).toBeCloseTo(apple.per100g.kcal! * 1.82, 6);
  });
  it('a meal she typed in counts only what she entered', () => {
    const t = entryTotals(entry({ kind: 'planned', custom: { name: 'Dinner out', kcal: 800, fiber: 6 }, qty: 1 }), ctx);
    expect(t.kcal.amount).toBe(800);
    expect(t.fiber.amount).toBe(6);
    expect(t.iron.known).toBe(false);
  });
});

describe('a day with a scanned product that lists few nutrients', () => {
  const bar = productToFood({ product_name: 'Granola bar', serving_quantity: 40, nutriments: { 'energy-kcal_100g': 450, proteins_100g: 8, fiber_100g: 5 } }, '0012345678905', 'bar', 1);
  foods.setCustomFoods([bar]);
  const entries = [
    entry({ slot: 'breakfast', kind: 'planned', recipeId: 'b-greek-yogurt-bowl-with-berries-and-walnuts', qty: 1 }),
    entry({ slot: 'snack', food: 'custom:bar', qty: 1, unit: 'serving', grams: 40 }),
    entry({ slot: 'lunch', food: 'key:apple', qty: 1, unit: 'medium', grams: 182, deletedAt: 5 }), // removed: does not count
  ];
  const day = summarizeDay(entries, ctx);

  it('adds every meal and the snack', () => {
    const yogurt = recipeNutrition(recipes.get('b-greek-yogurt-bowl-with-berries-and-walnuts')!, foods).perServing.kcal.amount;
    expect(day.totals.kcal.amount).toBeCloseTo(yogurt + 180, 6);
    expect(day.slots.find((s) => s.slot === 'snack')!.totals.kcal.amount).toBeCloseTo(180, 6);
    expect(day.slots.find((s) => s.slot === 'lunch')!.entries).toHaveLength(0);
  });
  it('marks the day as partial for nutrients the bar does not list, without counting them as zero', () => {
    expect(hasPartial(day.totals)).toBe(true);
    expect(day.partial).toContain('vitC');
    expect(day.partial).not.toContain('kcal');
    expect(day.partial).not.toContain('fiber');
    expect(day.totals.vitC.amount).toBeGreaterThan(0); // the yogurt bowl's vitamin C still counts
    expect(day.totals.vitC.known).toBe(true);
  });
  it('an empty day is not "partial"', () => {
    expect(summarizeDay([], ctx).partial).toEqual([]);
  });
});

describe('targets for a day', () => {
  const settings = { kcal: 1700, fiber: 28 };
  it('her one-day override wins, then the plan, then Settings', () => {
    expect(targetsFor(D, { kcal: 2000 }, { kcalTarget: 1800, fiberTarget: 30 }, settings)).toMatchObject({ kcal: 2000, fiber: 30, overridden: true });
    expect(targetsFor(D, undefined, { kcalTarget: 1800, fiberTarget: 30 }, settings)).toMatchObject({ kcal: 1800, fiber: 30, overridden: false });
    expect(targetsFor(D, undefined, undefined, settings)).toMatchObject({ kcal: 1700, fiber: 28 });
  });
});

describe('searching foods by name', () => {
  const search = makeIndex([...foods.usda.values()].map((f) => ({ id: f.ref, name: f.name })));
  it('finds everyday foods with every word', () => {
    expect(search('banana')[0].name).toMatch(/^Bananas, raw/);
    expect(search('cheddar cheese').every((f) => /cheddar/i.test(f.name))).toBe(true);
    expect(search('eggs').some((f) => /^Egg, whole/.test(f.name))).toBe(true); // plural finds singular
  });
  it('offers the friendly everyday names first', () => {
    const s = makeIndex(foods.searchable().map(({ food, boost }) => ({ id: food.ref, name: food.name, boost })));
    expect(s('olive oil')[0].name).toBe('Extra-virgin olive oil');
    expect(s('onion')[0].name).toBe('Onion');
  });
  it('returns nothing for an empty search and caps the list', () => {
    expect(search('   ')).toEqual([]);
    expect(search('a').length).toBeLessThanOrEqual(40);
  });
});
