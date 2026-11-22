// Checks on the built-in recipe library: completeness, realistic numbers, and enough variety
// for the planner to follow the Mediterranean / Blue Zone rules.
import { describe, expect, it } from 'vitest';
import { BUILTIN_RECIPES } from '.';
import { dietProfile, dietTags, effortFor, recipeNutrition, resolveIngredients } from '../../lib/recipes';
import { testDb } from '../../lib/testDb';
import type { MealSlot, ProteinKind } from '../../types';

const db = testDb();
const of = (m: MealSlot) => BUILTIN_RECIPES.filter((r) => r.meal === m);
const kcal = (r: (typeof BUILTIN_RECIPES)[number]) => recipeNutrition(r, db).perServing.kcal.amount;

const FISH: ProteinKind[] = ['salmon', 'white-fish', 'shrimp', 'tuna', 'sardines', 'trout', 'shellfish'];
const POULTRY: ProteinKind[] = ['chicken', 'turkey'];
const RED: ProteinKind[] = ['beef', 'lamb', 'pork'];
const LEGUME: ProteinKind[] = ['chickpeas', 'lentils', 'white-beans', 'black-beans', 'kidney-beans', 'mixed-beans', 'edamame', 'tofu'];

describe('library size', () => {
  it('has at least 120 recipes in the requested mix', () => {
    expect(BUILTIN_RECIPES.length).toBeGreaterThanOrEqual(120);
    expect(of('breakfast').length).toBeGreaterThanOrEqual(25);
    expect(of('lunch').length).toBeGreaterThanOrEqual(35);
    expect(of('dinner').length).toBeGreaterThanOrEqual(50);
    expect(of('snack').length).toBeGreaterThanOrEqual(20);
  });
  it('has unique ids and names', () => {
    expect(new Set(BUILTIN_RECIPES.map((r) => r.id)).size).toBe(BUILTIN_RECIPES.length);
    expect(new Set(BUILTIN_RECIPES.map((r) => r.name.toLowerCase())).size).toBe(BUILTIN_RECIPES.length);
  });
});

describe.each(BUILTIN_RECIPES.map((r) => [r.name, r] as const))('%s', (_name, r) => {
  it('is complete', () => {
    expect(r.ingredients.length).toBeGreaterThan(0);
    expect(r.steps.length).toBeGreaterThan(0);
    expect(r.servings).toBeGreaterThan(0);
    expect(r.activeMin).toBeGreaterThan(0);
    expect(r.activeMin).toBeLessThanOrEqual(r.totalMin);
    expect(r.effort).toBe(effortFor(r.totalMin));
  });
  it('every ingredient links to a food and can be weighed', () => {
    for (const x of resolveIngredients(r, db)) {
      expect(x.food, x.ing.food).not.toBeNull();
      expect(x.grams, `${x.ing.qty} ${x.ing.unit} ${x.ing.food}`).not.toBeNull();
      expect(x.grams!).toBeGreaterThan(0);
    }
  });
  it('has realistic calories per serving for its meal', () => {
    const range: Record<MealSlot, [number, number]> = { breakfast: [200, 550], lunch: [250, 650], dinner: [300, 700], snack: [100, 300] };
    const [lo, hi] = range[r.meal];
    expect(kcal(r)).toBeGreaterThanOrEqual(lo);
    expect(kcal(r)).toBeLessThanOrEqual(hi);
  });
  it('its main protein matches its ingredients', () => {
    const tags = dietTags(dietProfile(r, db));
    if (FISH.includes(r.protein)) expect(tags).toContain('fish');
    if (POULTRY.includes(r.protein)) expect(tags).toContain('poultry');
    if (RED.includes(r.protein)) expect(tags).toContain('red-meat');
    if (LEGUME.includes(r.protein)) expect(tags).toContain('legume');
    if (r.protein === 'eggs') expect(tags).toContain('eggs');
    if (!FISH.includes(r.protein) && !POULTRY.includes(r.protein) && !RED.includes(r.protein)) expect(tags).toContain('vegetarian');
  });
  it('keeps red meat to a small portion (at most about 3.5 oz raw per serving)', () => {
    const p = dietProfile(r, db);
    expect(p['red-meat'] + p['processed-meat']).toBeLessThanOrEqual(100);
  });
  it('uses olive oil, not butter, as its main added fat', () => {
    const p = dietProfile(r, db);
    expect(p['other-fat']).toBeLessThanOrEqual(p['olive-oil']);
  });
  it('keeps added sugar minimal', () => {
    expect(dietProfile(r, db)['added-sugar']).toBeLessThanOrEqual(12); // grams per serving (about 1 tbsp of honey)
  });
});

describe('enough variety for the diet rules and effort levels', () => {
  const dinners = of('dinner');
  const count = (kinds: ProteinKind[]) => dinners.filter((r) => kinds.includes(r.protein)).length;
  it('has many fish, some poultry, few red-meat and many plant-based dinners', () => {
    expect(count(FISH)).toBeGreaterThanOrEqual(10);
    expect(count(POULTRY)).toBeGreaterThanOrEqual(8);
    expect(count(RED)).toBeGreaterThanOrEqual(3);
    expect(count(RED)).toBeLessThanOrEqual(6);
    expect(dinners.filter((r) => dietTags(dietProfile(r, db)).includes('vegetarian')).length).toBeGreaterThanOrEqual(18);
  });
  it('has dinners at every effort level, including plenty of easy ones', () => {
    expect(dinners.filter((r) => r.effort === 'easy').length).toBeGreaterThanOrEqual(12);
    expect(dinners.filter((r) => r.effort === 'medium').length).toBeGreaterThanOrEqual(12);
    expect(dinners.filter((r) => r.effort === 'long').length).toBeGreaterThanOrEqual(10);
  });
  it('breakfasts and lunches skew easy to medium', () => {
    for (const m of ['breakfast', 'lunch'] as const) {
      const list = of(m);
      expect(list.filter((r) => r.effort !== 'long').length / list.length).toBeGreaterThan(0.85);
      expect(list.filter((r) => r.effort === 'easy').length).toBeGreaterThanOrEqual(10);
    }
  });
  it('puts vegetables in nearly every lunch and dinner', () => {
    const main = [...of('lunch'), ...dinners];
    const withVeg = main.filter((r) => dietProfile(r, db).veg >= 40).length;
    expect(withVeg / main.length).toBeGreaterThan(0.95);
  });
  it('has beans or legumes in a large share of lunches and dinners', () => {
    const main = [...of('lunch'), ...dinners];
    const withLegume = main.filter((r) => dietTags(dietProfile(r, db)).includes('legume')).length;
    expect(withLegume / main.length).toBeGreaterThan(0.5);
  });
  it('offers batch-friendly recipes for every meal type except snacks-only', () => {
    for (const m of ['breakfast', 'lunch', 'dinner', 'snack'] as const) {
      expect(of(m).filter((r) => r.tags.includes('batch-friendly')).length, m).toBeGreaterThanOrEqual(2);
    }
  });
});
