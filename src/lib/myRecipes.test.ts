import { describe, expect, it } from 'vitest';
import { BUILTIN_RECIPES } from '../data/recipes';
import { buildGroceryList } from './grocery';
import { combineRecipes, draftProblems, draftToRecipe, recipeToDraft, suggestProtein, suggestTags, type RecipeDraft } from './myRecipes';
import { buildPool } from './pool';
import { productToFood } from './openFoodFacts';
import { recipeNutrition, scaleIngredients } from './recipes';
import { testDb } from './testDb';

const foods = testDb();
const draft = (over: Partial<RecipeDraft> = {}): RecipeDraft => ({
  name: 'Mom’s Lentil Soup', meal: 'lunch', alsoFor: ['dinner'], servings: 4, activeMin: 15, totalMin: 45, tags: ['batch-friendly'], steps: 'Chop.\n\nSimmer.\n',
  ingredients: [
    { food: 'key:lentils', qty: 1, unit: 'cup' }, { food: 'key:onion', qty: 1, unit: 'medium' }, { food: 'key:carrot', qty: 2, unit: 'each' },
    { food: 'key:diced_tomatoes', qty: 1, unit: 'can' }, { food: 'key:olive_oil', qty: 2, unit: 'tbsp' }, { food: 'key:spinach', qty: 3, unit: 'cup' },
  ],
  ...over,
});

describe('suggestions while she types a recipe', () => {
  it('main protein is the biggest protein food (meat and fish beat a little cheese)', () => {
    expect(suggestProtein(draft(), foods)).toBe('lentils');
    expect(suggestProtein({ servings: 2, ingredients: [{ food: 'key:salmon', qty: 6, unit: 'oz' }, { food: 'key:feta', qty: 0.5, unit: 'cup' }] }, foods)).toBe('salmon');
    expect(suggestProtein({ servings: 2, ingredients: [{ food: 'key:spinach', qty: 2, unit: 'cup' }] }, foods)).toBe('none');
  });
  it('diet tags come from the ingredients', () => {
    expect(suggestTags(draft(), foods)).toEqual(expect.arrayContaining(['legume', 'vegetarian', 'vegetables']));
  });
  it('lists what is missing', () => {
    expect(draftProblems(draft({ name: ' ', ingredients: [], totalMin: 0, activeMin: 0 }))).toHaveLength(3);
    expect(draftProblems(draft({ activeMin: 60 }))).toContain('Hands-on time cannot be longer than the total time.');
    expect(draftProblems(draft())).toEqual([]);
  });
});

describe('her recipe works like a built-in one', () => {
  const mine = draftToRecipe(draft(), foods, 'mine-1', 5);
  it('gets an effort tier from the total time, the suggested protein, and clean steps', () => {
    expect(mine).toMatchObject({ effort: 'medium', protein: 'lentils', steps: ['Chop.', 'Simmer.'], alsoFor: ['dinner'], source: 'mine' });
    expect(draftToRecipe(draft({ effort: 'easy' }), foods, 'x', 1).effort).toBe('easy'); // her own choice wins
    expect(recipeToDraft(mine).steps).toBe('Chop.\nSimmer.');
  });
  it('nutrition is computed from its ingredients and scales', () => {
    const n = recipeNutrition(mine, foods);
    expect(n.unresolved).toEqual([]);
    expect(n.perServing.kcal.amount).toBeGreaterThan(150);
    const double = { ...mine, ingredients: scaleIngredients(mine, 8), servings: 8 };
    expect(recipeNutrition(double, foods).perServing.kcal.amount).toBeCloseTo(n.perServing.kcal.amount, 6);
  });
  it('goes on the grocery list scaled to the people at the meal', () => {
    const list = buildGroceryList([{ date: '2026-11-23', effort: 'easy', snack: false, people: 2, kcalTarget: 1700, fiberTarget: 28, meals: [{ slot: 'lunch', recipeId: 'mine-1', portion: 1, people: 2 }] }], new Map([['mine-1', mine]]), foods);
    expect(list.find((i) => i.key === 'key:diced_tomatoes')).toMatchObject({ buy: '1 can' }); // ½ can needed
    expect(list.find((i) => i.key === 'key:lentils')).toMatchObject({ buy: '½ cup' });
  });
  it('can use a scanned product as an ingredient, with "not listed" nutrients staying not listed', () => {
    const broth = productToFood({ product_name: 'Bone broth', serving_quantity: 240, nutriments: { 'energy-kcal_100g': 20, proteins_100g: 4, sodium_100g: 0.2 } }, '0099', 'broth', 1);
    foods.setCustomFoods([broth]);
    const soup = draftToRecipe(draft({ ingredients: [...draft().ingredients, { food: 'custom:broth', qty: 2, unit: 'serving' }] }), foods, 'mine-2', 1);
    const n = recipeNutrition(soup, foods);
    expect(n.unresolved).toEqual([]);
    expect(n.total.sodium.amount).toBeGreaterThan(960); // 2 x 240 g x 200 mg/100 g from the broth alone
    expect(n.total.vitC.partial).toBe(true); // the broth does not list vitamin C
    foods.setCustomFoods([]);
  });
  it('joins the planner pool with the "her recipe" boost', () => {
    const p = buildPool([...BUILTIN_RECIPES, mine], foods, new Map(), new Set(['mine-1'])).find((x) => x.id === 'mine-1')!;
    expect(p.weight).toBe(1.5);
    expect(p.meals).toEqual(['lunch', 'dinner']);
    expect(p.issues).toEqual([]);
  });
});

describe('changing a built-in recipe', () => {
  const original = BUILTIN_RECIPES.find((r) => r.ingredients.length >= 4)!;
  /** Her version: drop the first ingredient and add spinach, saved under the built-in id. */
  const changed = () => {
    const d = recipeToDraft(original);
    d.ingredients = [...d.ingredients.slice(1), { food: 'key:spinach', qty: 2, unit: 'cup' }];
    return { ...draftToRecipe(d, foods, original.id, 1), basedOn: original.id };
  };

  it('her version replaces the original everywhere, under the same id', () => {
    const set = combineRecipes(BUILTIN_RECIPES, [changed()]);
    const byId = set.everything.filter((r) => r.id === original.id);
    expect(byId).toHaveLength(1);
    expect(byId[0].ingredients.map((i) => i.food)).toEqual([...original.ingredients.slice(1).map((i) => i.food), 'key:spinach']);
    expect(set.everything).toHaveLength(BUILTIN_RECIPES.length);
    expect(set.changedIds).toEqual(new Set([original.id]));
  });

  it('keeps the name, steps, protein, effort and about text', () => {
    const r = changed();
    expect(r).toMatchObject({ name: original.name, steps: original.steps, protein: original.protein, effort: original.effort, servings: original.servings, about: original.about });
  });

  it('is not listed under My recipes, not hidden, and not boosted like her own recipes', () => {
    const set = combineRecipes(BUILTIN_RECIPES, [changed()]);
    expect(set.myIds.has(original.id)).toBe(false);
    expect(set.hiddenIds.has(original.id)).toBe(false);
    const pool = buildPool(set.everything, foods, new Map(), set.myIds);
    const before = buildPool(BUILTIN_RECIPES, foods).find((p) => p.id === original.id)!;
    expect(pool.find((p) => p.id === original.id)!.weight).toBe(before.weight);
  });

  it('its nutrition and grocery list follow the new ingredients', () => {
    const r = changed();
    const spinach = scaleIngredients(r, r.servings).find((i) => i.food === 'key:spinach');
    expect(spinach).toBeTruthy();
    expect(recipeNutrition(r, foods).perServing.kcal.amount).not.toBe(recipeNutrition(original, foods).perServing.kcal.amount);
  });

  it('"Undo my changes" (deleting her version) brings the original back', () => {
    const set = combineRecipes(BUILTIN_RECIPES, [{ ...changed(), deletedAt: 2 }]);
    expect(set.everything.find((r) => r.id === original.id)).toBe(original);
    expect(set.changedIds.size).toBe(0);
    expect(set.hiddenIds.has(original.id)).toBe(false);
  });

  it('her own recipes still work as before', () => {
    const mine = draftToRecipe(draft(), foods, 'mine-1', 1);
    const gone = { ...draftToRecipe(draft(), foods, 'mine-2', 1), deletedAt: 5 };
    const batchOnly = draftToRecipe(draft(), foods, 'mine-3', 1, true);
    const set = combineRecipes(BUILTIN_RECIPES, [mine, gone, batchOnly]);
    expect(set.everything).toHaveLength(BUILTIN_RECIPES.length + 3);
    expect(set.myIds).toEqual(new Set(['mine-1']));
    expect(set.hiddenIds).toEqual(new Set(['mine-2', 'mine-3']));
    expect(set.changedIds.size).toBe(0);
  });
});
