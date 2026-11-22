import { describe, expect, it } from 'vitest';
import { BUILTIN_RECIPES } from '../data/recipes';
import { ANY_STORE, buildGroceryList, collectNeeds, itemLine, listForStore, massText, mergeNeeds, resolveItems, shoppingRound, storeListText, UNASSIGNED, volumeText, type GroceryItem } from './grocery';
import { testDb } from './testDb';
import { makePortion, toGrams } from './units';
import type { Batch, DayPlan, GroceryMark, Recipe, Store, StoreAssignment } from '../types';

const foods = testDb();
const recipes = new Map<string, Recipe>(BUILTIN_RECIPES.map((r) => [r.id, r]));
const need = (food: string, qty: number, unit: string) => ({ qty, unit, grams: toGrams(foods.get(food)!, qty, unit) });

describe('adding up amounts of the same food', () => {
  it('adds cups and tablespoons as volume', () => {
    const oil = foods.get('key:olive_oil')!;
    expect(mergeNeeds(oil, [need('key:olive_oil', 0.25, 'cup'), need('key:olive_oil', 2, 'tbsp')]).buy).toBe('6 tbsp'); // 4 + 2
    expect(mergeNeeds(oil, [need('key:olive_oil', 0.5, 'cup'), need('key:olive_oil', 4, 'tbsp')]).buy).toBe('¾ cup');
    expect(mergeNeeds(oil, [need('key:olive_oil', 1, 'tsp'), need('key:olive_oil', 2, 'tsp')]).buy).toBe('1 tbsp');
  });
  it('adds weights as weights and shows pounds from 1 lb', () => {
    const salmon = foods.get('key:salmon')!;
    expect(mergeNeeds(salmon, [need('key:salmon', 12, 'oz'), need('key:salmon', 8, 'oz')]).buy).toBe('1.3 lb'); // 20 oz -> 1.25 lb
    expect(mergeNeeds(salmon, [need('key:salmon', 5, 'oz'), need('key:salmon', 2.5, 'oz')]).buy).toBe('8 oz');
  });
  it('adds counted and measured onion by weight and buys whole onions', () => {
    const onion = foods.get('key:onion')!;
    const m = mergeNeeds(onion, [need('key:onion', 1, 'medium'), need('key:onion', 0.5, 'cup')]);
    expect(m.buy).toBe('2 medium'); // 110 g + 80 g = 190 g ≈ 1.7 onions -> buy 2
    expect(m.needed).toBe('1 medium + ½ cup');
  });
  it('rounds packaged foods up to whole cans, bunches and bags, showing what the recipes need', () => {
    const chick = mergeNeeds(foods.get('key:chickpeas')!, [need('key:chickpeas', 1, 'can'), need('key:chickpeas', 0.5, 'can')]);
    expect(chick).toMatchObject({ buy: '2 cans', needed: '1½ cans' });
    const parsley = mergeNeeds(foods.get('key:parsley')!, [need('key:parsley', 0.25, 'cup'), need('key:parsley', 2, 'tbsp')]);
    expect(parsley.buy).toBe('1 bunch');
    const spinach = mergeNeeds(foods.get('key:spinach')!, [need('key:spinach', 6, 'cup'), need('key:spinach', 4, 'cup')]);
    expect(spinach.buy).toBe('3 bags'); // 10 cups ≈ 300 g, 5-oz bags
    expect(spinach.needed).toBe('10 cups');
  });
  it('does not buy a whole extra can for a rounding hair', () => {
    expect(mergeNeeds(foods.get('key:chickpeas')!, [need('key:chickpeas', 2.02, 'can')]).buy).toBe('2 cans');
  });
  it('buys eggs by the dozen', () => {
    const eggs = mergeNeeds(foods.get('key:egg')!, [need('key:egg', 8, 'large'), need('key:egg', 2, 'large')]);
    expect(eggs.buy).toBe('1 dozen');
    expect(eggs.needed).toBe('10 large');
  });
  it('lists the parts when a unit cannot be weighed', () => {
    const odd = { name: 'Thing', portions: [makePortion('cup', 100)] };
    expect(mergeNeeds(odd, [{ qty: 1, unit: 'cup', grams: 100 }, { qty: 2, unit: 'handful', grams: null }]).buy).toBe('1 cup + 2 handful');
  });
  it('rounds to amounts you can buy', () => {
    expect(shoppingRound(0.3, 'cup')).toBe(0.5);
    expect(shoppingRound(1.1, 'lb')).toBe(1.25);
    expect(shoppingRound(5.2, 'oz')).toBe(6);
    expect(shoppingRound(2.1, 'medium')).toBe(3);
    expect(volumeText(118.3)[0]).toBeCloseTo(0.5, 3);
    expect(volumeText(118.3)[1]).toBe('cup');
    expect(volumeText(59)[1]).toBe('tbsp');
    expect(massText(453.6)[1]).toBe('lb');
  });
});

const r = (id: string) => recipes.get(id)!;
const day = (date: string, meals: DayPlan['meals']): DayPlan => ({ date, effort: 'medium', snack: true, people: 3, kcalTarget: 1700, fiberTarget: 28, meals });

describe('the week’s list', () => {
  const days = [
    day('2026-11-23', [
      { slot: 'lunch', recipeId: 'l-greek-salad-with-chickpeas-and-pita', portion: 1, people: 2 },
      { slot: 'dinner', recipeId: 'd-chickpea-and-spinach-stew-with-tomatoes', portion: 1.25, people: 4 },
    ]),
    day('2026-11-24', [
      { slot: 'dinner', batchId: 'b-done', recipeId: 'd-turkey-and-bean-chili', portion: 1, people: 1 },
      { slot: 'lunch', custom: { name: 'Lunch out', kcal: 600 }, portion: 1, people: 1 },
    ]),
  ];

  it('scales each recipe to the people at that meal, not to her portion', () => {
    const needs = collectNeeds(days, recipes, foods);
    // Greek salad serves 2 with 1 can chickpeas; the stew serves 4 with 2 cans: 1 + 2 = 3 cans
    const chick = needs.get('key:chickpeas')!;
    expect(chick.needs.reduce((s, n) => s + n.qty, 0)).toBeCloseTo(1 * (2 / r('l-greek-salad-with-chickpeas-and-pita').servings) + 2 * (4 / r('d-chickpea-and-spinach-stew-with-tomatoes').servings));
    expect(chick.uses.map((u) => u.label)).toEqual(['Mon lunch', 'Mon dinner']);
  });
  it('leaves out batch servings, meals she typed in, and tap water', () => {
    const list = buildGroceryList(days, recipes, foods);
    expect(list.find((i) => i.key === 'key:ground_turkey')).toBeUndefined(); // the chili is a cooked batch
    expect(list.find((i) => i.key === 'key:water')).toBeUndefined();
  });
  it('adds a batch she has not cooked yet, scaled to the batch size; a cooked batch adds nothing', () => {
    const planned: Batch = { id: 'b1', updatedAt: 1, recipeId: 'd-turkey-and-bean-chili', servingsMade: 12, frozen: 0, cookedOn: '2026-11-25', cooked: false, used: 0 };
    const withBatch = buildGroceryList(days, recipes, foods, [planned]);
    const turkey = withBatch.find((i) => i.key === 'key:ground_turkey')!;
    expect(turkey.grams).toBeCloseTo(453.592 * (12 / r('d-turkey-and-bean-chili').servings), 0); // 1 lb for 6 -> 2 lb for 12
    expect(turkey.buy).toBe('2 lb');
    expect(turkey.uses[0].label).toBe('batch of 12');
    expect(buildGroceryList(days, recipes, foods, [{ ...planned, cooked: true }]).find((i) => i.key === 'key:ground_turkey')).toBeUndefined();
    expect(buildGroceryList(days, recipes, foods, [{ ...planned, cookedOn: '2026-12-25' }]).find((i) => i.key === 'key:ground_turkey')).toBeUndefined(); // not this week
  });
  it('groups items by aisle in store order', () => {
    const list = buildGroceryList(days, recipes, foods);
    const cats = list.map((i) => i.cat);
    expect(cats.indexOf('produce')).toBe(0);
    expect(cats.lastIndexOf('produce')).toBeLessThan(cats.indexOf('canned-jarred'));
  });
  it('reads naturally', () => {
    const item = (buy: string, name: string): GroceryItem => ({ key: 'x', name, cat: 'produce', buy, grams: 0, uses: [] });
    expect(itemLine(item('2 medium', 'Onion'))).toBe('2 medium onions');
    expect(itemLine(item('3', 'Lemon'))).toBe('3 lemons');
    expect(itemLine(item('1', 'Avocado'))).toBe('1 avocado');
    expect(itemLine(item('2 cans', 'Chickpeas, canned, drained'))).toBe('2 cans chickpeas, canned, drained');
  });
});

describe('stores', () => {
  const W = '2026-11-23';
  const items: GroceryItem[] = ['key:egg', 'key:salmon', 'key:kale', 'key:feta'].map((key) => ({ key, name: key.slice(4), cat: 'produce', buy: '1', grams: 1, uses: [] }));
  const stores: Store[] = [
    { id: 'tj', updatedAt: 1, name: "Trader Joe's", order: 0 },
    { id: 'wf', updatedAt: 1, name: 'Whole Foods', order: 1 },
    { id: 'gone', updatedAt: 1, name: 'Old store', order: 2, deletedAt: 5 },
  ];
  const assignments: StoreAssignment[] = [
    { id: 'key:egg', updatedAt: 1, storeId: ANY_STORE },
    { id: 'key:salmon', updatedAt: 1, storeId: 'wf' },
    { id: 'key:feta', updatedAt: 1, storeId: 'gone' },
  ];

  it('remembers each item’s store; new items and items of removed stores are unassigned', () => {
    const s = resolveItems(items, W, stores, assignments, []);
    expect(Object.fromEntries(s.map((x) => [x.item.key, x.storeId]))).toEqual({ 'key:egg': ANY_STORE, 'key:salmon': 'wf', 'key:kale': UNASSIGNED, 'key:feta': UNASSIGNED });
  });
  it('a store change for one week only applies to that week', () => {
    const marks: GroceryMark[] = [{ id: `${W}|key:salmon`, updatedAt: 1, weekStart: W, itemKey: 'key:salmon', storeOverride: 'tj' }];
    expect(resolveItems(items, W, stores, assignments, marks).find((x) => x.item.key === 'key:salmon')).toMatchObject({ storeId: 'tj', thisWeekOnly: true });
    expect(resolveItems(items, '2026-11-30', stores, assignments, marks).find((x) => x.item.key === 'key:salmon')!.storeId).toBe('wf');
  });
  it('"Buy at any store" items appear on every store’s list', () => {
    const s = resolveItems(items, W, stores, assignments, []);
    for (const store of ['tj', 'wf']) expect(listForStore(s, store).any.map((x) => x.item.key)).toEqual(['key:egg']);
    expect(listForStore(s, 'wf').own.map((x) => x.item.key)).toEqual(['key:salmon']);
    expect(listForStore(s, 'tj').own).toEqual([]);
  });
  it('checking an item off is one record for the week, so it shows checked on every list', () => {
    const marks: GroceryMark[] = [{ id: `${W}|key:egg`, updatedAt: 1, weekStart: W, itemKey: 'key:egg', checked: true }];
    const s = resolveItems(items, W, stores, assignments, marks);
    expect(listForStore(s, 'tj').any[0].checked).toBe(true);
    expect(listForStore(s, 'wf').any[0].checked).toBe(true);
  });
  it('"I already have this" takes it off this week’s lists only', () => {
    const marks: GroceryMark[] = [{ id: `${W}|key:salmon`, updatedAt: 1, weekStart: W, itemKey: 'key:salmon', have: true }];
    expect(listForStore(resolveItems(items, W, stores, assignments, marks), 'wf').own).toEqual([]);
    expect(listForStore(resolveItems(items, '2026-11-30', stores, assignments, marks), 'wf').own).toHaveLength(1);
  });
  it('copies a store’s list as plain text, with the any-store items and without what is already checked', () => {
    const real: GroceryItem[] = [
      { key: 'key:salmon', name: 'Salmon fillet', cat: 'meat-seafood', buy: '1.3 lb', grams: 560, uses: [] },
      { key: 'key:kale', name: 'Kale, fresh', cat: 'produce', buy: '1 bunch', grams: 200, uses: [] },
      { key: 'key:egg', name: 'Eggs', cat: 'dairy-eggs', buy: '1 dozen', grams: 600, uses: [] },
      { key: 'key:feta', name: 'Feta cheese', cat: 'dairy-eggs', buy: '4 oz', grams: 113, uses: [] },
    ];
    const asg: StoreAssignment[] = [...assignments, { id: 'key:kale', updatedAt: 1, storeId: 'wf' }, { id: 'key:feta', updatedAt: 2, storeId: 'wf' }];
    const marks: GroceryMark[] = [{ id: `${W}|key:feta`, updatedAt: 1, weekStart: W, itemKey: 'key:feta', checked: true }];
    const text = storeListText('Whole Foods', W, resolveItems(real, W, stores, asg, marks), 'wf');
    expect(text).toBe([
      'Whole Foods (week of Nov 23)',
      '',
      'Produce:',
      '- 1 bunch kale, fresh',
      'Meat and seafood:',
      '- 1.3 lb salmon fillet',
      '',
      'BUY AT ANY STORE',
      'Dairy, eggs and refrigerated:',
      '- 1 dozen eggs',
    ].join('\n'));
  });
});
