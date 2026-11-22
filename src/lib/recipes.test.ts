import { describe, expect, it } from 'vitest';
import { dietClass, effortFor, parseIngredientLine, parseQty, recipeNutrition, scaleIngredients, servingNutrition } from './recipes';
import { testDb } from './testDb';
import type { Recipe } from '../types';

const isKey = (k: string) => ['chickpeas', 'olive_oil', 'egg', 'red_onion', 'greek_yogurt'].includes(k);

describe('ingredient lines', () => {
  it('reads quantities', () => {
    expect(parseQty('1 1/2')).toBe(1.5);
    expect(parseQty('3/4')).toBe(0.75);
    expect(parseQty('2.5')).toBe(2.5);
    expect(parseQty('a')).toBeNaN();
  });
  it('reads quantity, unit, food and note', () => {
    expect(parseIngredientLine('1 1/2 cup chickpeas, rinsed and drained', isKey)).toEqual({ food: 'key:chickpeas', qty: 1.5, unit: 'cup', note: 'rinsed and drained' });
    expect(parseIngredientLine('2 tbsp olive_oil', isKey)).toEqual({ food: 'key:olive_oil', qty: 2, unit: 'tbsp', note: undefined });
    expect(parseIngredientLine('3 egg', isKey)).toEqual({ food: 'key:egg', qty: 3, unit: 'each', note: undefined });
    expect(parseIngredientLine('1/4 red_onion, sliced', isKey).unit).toBe('each');
    expect(parseIngredientLine('2 cups greek_yogurt', isKey).unit).toBe('cup');
  });
  it('refuses unknown foods and missing amounts', () => {
    expect(() => parseIngredientLine('1 cup unicorn', isKey)).toThrow(/Unknown food/);
    expect(() => parseIngredientLine('cup chickpeas', isKey)).toThrow(/quantity/);
  });
});

describe('effort tiers', () => {
  it('Easy up to 25 minutes, Medium to 50, Time-consuming beyond', () => {
    expect(effortFor(5)).toBe('easy');
    expect(effortFor(25)).toBe('easy');
    expect(effortFor(26)).toBe('medium');
    expect(effortFor(50)).toBe('medium');
    expect(effortFor(51)).toBe('long');
  });
});

const soup: Recipe = {
  id: 't-soup', name: 'Test soup', meal: 'dinner', servings: 4, activeMin: 10, totalMin: 30, effort: 'medium', protein: 'chickpeas', tags: [], steps: ['Cook.'],
  ingredients: [
    { food: 'key:chickpeas', qty: 2, unit: 'can' },
    { food: 'key:olive_oil', qty: 2, unit: 'tbsp' },
    { food: 'key:onion', qty: 1, unit: 'medium' },
  ],
};

describe('scaling a recipe to the number of people', () => {
  it('multiplies every ingredient by people / servings', () => {
    const three = scaleIngredients(soup, 3);
    expect(three.map((i) => i.qty)).toEqual([1.5, 1.5, 0.75]);
    expect(three.map((i) => i.unit)).toEqual(['can', 'tbsp', 'medium']);
    expect(scaleIngredients(soup, 4).map((i) => i.qty)).toEqual([2, 2, 1]);
    expect(scaleIngredients(soup, 8).map((i) => i.qty)).toEqual([4, 4, 2]);
  });
  it('does not change the recipe itself', () => {
    scaleIngredients(soup, 10);
    expect(soup.ingredients[0].qty).toBe(2);
  });
});

describe('nutrition computed from ingredients', () => {
  const db = testDb();
  it('adds up the ingredients and divides by servings', () => {
    const n = recipeNutrition(soup, db);
    const chick = db.get('key:chickpeas')!.per100g.kcal! * 4.8; // 2 cans x 240 g
    const oil = db.get('key:olive_oil')!.per100g.kcal! * (2 * 13.5) / 100;
    const onion = db.get('key:onion')!.per100g.kcal! * 1.1; // medium onion 110 g
    expect(n.total.kcal.amount).toBeCloseTo(chick + oil + onion, 0);
    expect(n.perServing.kcal.amount).toBeCloseTo(n.total.kcal.amount / 4, 5);
    expect(n.unresolved).toEqual([]);
  });
  it('her portion scales linearly, so 1.5 servings is exactly 1.5x', () => {
    const n = recipeNutrition(soup, db);
    expect(servingNutrition(n, 1.5).fiber.amount).toBeCloseTo(n.perServing.fiber.amount * 1.5, 6);
  });
  it('cooking for more people does not change her per-serving numbers', () => {
    const doubled = { ...soup, ingredients: scaleIngredients(soup, 8), servings: 8 };
    expect(recipeNutrition(doubled, db).perServing.kcal.amount).toBeCloseTo(recipeNutrition(soup, db).perServing.kcal.amount, 6);
  });
  it('an ingredient that cannot be measured makes the totals partial, not wrong', () => {
    const odd = { ...soup, ingredients: [...soup.ingredients, { food: 'key:olive_oil', qty: 1, unit: 'handful' }] };
    const n = recipeNutrition(odd, db);
    expect(n.unresolved).toHaveLength(1);
    expect(n.total.kcal.partial).toBe(true);
    expect(n.total.kcal.amount).toBeCloseTo(recipeNutrition(soup, db).total.kcal.amount, 6);
  });
});

describe('diet classes', () => {
  const c = (name: string, group: string) => dietClass({ name, group });
  it('sorts foods for the diet rules', () => {
    expect(c('Extra-virgin olive oil', 'Fats and Oils')).toBe('olive-oil');
    expect(c('Sardines in olive oil, drained', 'Finfish and Shellfish Products')).toBe('fish');
    expect(c('Butter, unsalted', 'Dairy and Egg Products')).toBe('other-fat');
    expect(c('Eggs', 'Dairy and Egg Products')).toBe('egg');
    expect(c('Feta cheese', 'Dairy and Egg Products')).toBe('dairy');
    expect(c('Rolled oats', 'Breakfast Cereals')).toBe('whole-grain');
    expect(c('Couscous, dry', 'Cereal Grains and Pasta')).toBe('refined-grain');
    expect(c('Honey', 'Sweets')).toBe('added-sugar');
    expect(c('Unsweetened cocoa powder', 'Sweets')).toBe('other');
    expect(c('Natural peanut butter', 'Legumes and Legume Products')).toBe('nuts');
    expect(c('Soy sauce, low sodium', 'Legumes and Legume Products')).toBe('other');
    expect(c('Edamame, frozen, shelled', 'Vegetables and Vegetable Products')).toBe('legume');
    expect(c('Ground lamb', 'Lamb, Veal, and Game Products')).toBe('red-meat');
    expect(c('Bologna, beef', 'Sausages and Luncheon Meats')).toBe('processed-meat');
    expect(c('Lemon juice', 'Fruits and Fruit Juices')).toBe('other');
  });
});
