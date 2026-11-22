// Recipe math: nutrition from ingredients, scaling to the number of people, effort tiers,
// and the diet profile (how much vegetable, legume, fish... is in one serving) the planner uses.
// Nutrition is never typed in by hand: it always comes from the ingredients, so scaling stays correct.

import type { Effort, Food, Ingredient, Recipe } from '../types';
import type { FoodDb } from './foodDb';
import { addTotals, scaleTotals, totalsForGrams, zeroTotals, type Totals } from './nutrition';
import { normalizeUnit, toGrams } from './units';

// ---------------------------------------------------------------- effort

/** Easy: 25 minutes or less in total. Medium: 26 to 50. Long: over 50. */
export function effortFor(totalMin: number): Effort {
  if (totalMin <= 25) return 'easy';
  if (totalMin <= 50) return 'medium';
  return 'long';
}

export const EFFORT_LABEL: Record<Effort, string> = { easy: 'Easy', medium: 'Medium', long: 'Time-consuming' };

// ---------------------------------------------------------------- ingredient text

/** "1 1/2", "3/4", "2.5" -> number. */
export function parseQty(s: string): number {
  const parts = s.trim().split(/\s+/);
  let total = 0;
  for (const p of parts) {
    const frac = p.match(/^(\d+)\/(\d+)$/);
    if (frac) total += Number(frac[1]) / Number(frac[2]);
    else if (/^\d*\.?\d+$/.test(p)) total += Number(p);
    else return NaN;
  }
  return total;
}

/**
 * The short ingredient format the built-in recipes are written in:
 *   "1 1/2 cup chickpeas, drained"  -> 1.5 cup of food key "chickpeas", note "drained"
 *   "2 large egg"                    -> 2 large eggs
 *   "3 egg"                          -> 3 eggs (no unit means "each")
 */
export function parseIngredientLine(line: string, isFoodKey: (k: string) => boolean): Ingredient {
  const [main, ...noteParts] = line.split(',');
  const note = noteParts.join(',').trim() || undefined;
  const tokens = main.trim().split(/\s+/);
  let i = 0;
  const qtyTokens: string[] = [];
  while (i < tokens.length && /^[\d./]+$/.test(tokens[i])) qtyTokens.push(tokens[i++]);
  const qty = parseQty(qtyTokens.join(' '));
  if (!qtyTokens.length || !Number.isFinite(qty)) throw new Error(`Bad quantity in "${line}"`);
  let unit = 'each';
  if (i < tokens.length - 1) unit = tokens[i++];
  else if (i < tokens.length && !isFoodKey(tokens[i])) throw new Error(`Missing food in "${line}"`);
  const key = tokens.slice(i).join('_');
  if (!isFoodKey(key)) throw new Error(`Unknown food "${key}" in "${line}"`);
  return { food: `key:${key}`, qty, unit: normalizeUnit(unit), note };
}

// ---------------------------------------------------------------- nutrition

export interface ResolvedIngredient {
  ing: Ingredient;
  food: Food | null;
  grams: number | null;
}

export function resolveIngredients(recipe: Pick<Recipe, 'ingredients'>, db: FoodDb): ResolvedIngredient[] {
  return recipe.ingredients.map((ing) => {
    const food = db.get(ing.food);
    return { ing, food, grams: food ? toGrams(food, ing.qty, ing.unit) : null };
  });
}

export interface RecipeNutrition {
  total: Totals; // the whole recipe as written
  perServing: Totals;
  /** Ingredients that could not be turned into grams. Their nutrients make every total "partial". */
  unresolved: Ingredient[];
}

export function recipeNutrition(recipe: Pick<Recipe, 'ingredients' | 'servings'>, db: FoodDb): RecipeNutrition {
  let total = zeroTotals();
  const unresolved: Ingredient[] = [];
  for (const r of resolveIngredients(recipe, db)) {
    if (!r.food || r.grams === null) {
      unresolved.push(r.ing);
      // An unknown amount: everything it contributes is "not listed".
      total = addTotals(total, totalsForGrams({} as Food['per100g'], 0));
      continue;
    }
    total = addTotals(total, totalsForGrams(r.food.per100g, r.grams));
  }
  return { total, perServing: scaleTotals(total, 1 / Math.max(1, recipe.servings)), unresolved };
}

/** Nutrition for `servings` of a recipe (her portion, e.g. 1.25). */
export const servingNutrition = (n: RecipeNutrition, servings: number) => scaleTotals(n.perServing, servings);

// ---------------------------------------------------------------- scaling

/** Ingredient amounts for cooking `people` servings (the recipe's own amounts make `recipe.servings`). */
export function scaleIngredients(recipe: Pick<Recipe, 'ingredients' | 'servings'>, people: number): Ingredient[] {
  const f = people / recipe.servings;
  return recipe.ingredients.map((i) => ({ ...i, qty: i.qty * f }));
}

// ---------------------------------------------------------------- diet profile

export type DietClass =
  | 'veg' | 'fruit' | 'legume' | 'whole-grain' | 'refined-grain' | 'nuts' | 'olive-oil' | 'other-fat'
  | 'fish' | 'poultry' | 'red-meat' | 'processed-meat' | 'egg' | 'dairy' | 'added-sugar' | 'other';

const WHOLE_GRAIN = /whole|oats|quinoa|brown|barley|bulgur|wild rice|\brye\b|multi-grain|popcorn|granola|bran|buckwheat|millet|spelt|farro|amaranth/i;

/** What kind of food this is, for the diet rules. Based on the USDA food group plus a few name checks. */
export function dietClass(food: Pick<Food, 'name' | 'group'>): DietClass {
  const n = food.name.toLowerCase();
  const g = food.group;
  if (/^(extra-virgin )?olive oil|^oil, olive/.test(n)) return 'olive-oil';
  if (/^olives|black olives|green olives/.test(n)) return 'veg';
  if (/cocoa|lemon juice|lime juice|lemon zest|lemon peel/.test(n)) return 'other';
  if (/sugar|honey|syrup|maple|chocolate|candies|jam|jelly|marmalade/.test(n) && !/no sugar|unsweetened cocoa/.test(n)) return 'added-sugar';
  if (/peanut butter|^peanuts|natural peanut/.test(n)) return 'nuts';
  if (/edamame/.test(n)) return 'legume';
  if (/tahini|sesame butter/.test(n)) return 'nuts';
  switch (g) {
    case 'Vegetables and Vegetable Products': return 'veg';
    case 'Fruits and Fruit Juices': return 'fruit';
    case 'Legumes and Legume Products': return /soy sauce|soymilk|soy milk/.test(n) ? 'other' : 'legume';
    case 'Nut and Seed Products': return 'nuts';
    case 'Finfish and Shellfish Products': return 'fish';
    case 'Poultry Products': return 'poultry';
    case 'Beef Products': case 'Pork Products': case 'Lamb, Veal, and Game Products': return 'red-meat';
    case 'Sausages and Luncheon Meats': return 'processed-meat';
    case 'Dairy and Egg Products': return /^eggs?\b|egg white/.test(n) ? 'egg' : /^butter/.test(n) ? 'other-fat' : 'dairy';
    case 'Cereal Grains and Pasta': case 'Baked Products': case 'Breakfast Cereals': case 'Snacks':
      if (g === 'Snacks' && !/popcorn/.test(n)) return 'other';
      return WHOLE_GRAIN.test(n) ? 'whole-grain' : 'refined-grain';
    case 'Fats and Oils': return 'other-fat';
    case 'Sweets': return 'added-sugar';
    default: return 'other';
  }
}

/** Grams per serving of each class. For 'added-sugar' it is grams of sugar, not grams of the sweet food. */
export type DietProfile = Record<DietClass, number>;

export function dietProfile(recipe: Pick<Recipe, 'ingredients' | 'servings'>, db: FoodDb): DietProfile {
  const p = Object.fromEntries(
    (['veg', 'fruit', 'legume', 'whole-grain', 'refined-grain', 'nuts', 'olive-oil', 'other-fat', 'fish', 'poultry', 'red-meat', 'processed-meat', 'egg', 'dairy', 'added-sugar', 'other'] as DietClass[]).map((c) => [c, 0]),
  ) as DietProfile;
  for (const r of resolveIngredients(recipe, db)) {
    if (!r.food || r.grams === null) continue;
    const cls = dietClass(r.food);
    // For sweet foods count the sugar in them (honey is ~80% sugar, dark chocolate ~25%), not their whole weight.
    const sugarShare = cls === 'added-sugar' ? (r.food.per100g.sugars ?? 100) / 100 : 1;
    p[cls] += (r.grams * sugarShare) / recipe.servings;
  }
  return p;
}

/** Diet tags worked out from the ingredients (hand tags are added on top). */
export function dietTags(profile: DietProfile): string[] {
  const tags: string[] = [];
  if (profile.fish >= 30) tags.push('fish');
  if (profile.poultry >= 30) tags.push('poultry');
  if (profile['red-meat'] + profile['processed-meat'] >= 20) tags.push('red-meat');
  if (profile.legume >= 30) tags.push('legume');
  if (profile.fish + profile.poultry + profile['red-meat'] + profile['processed-meat'] === 0) tags.push('vegetarian');
  if (profile['whole-grain'] >= 20) tags.push('whole-grain');
  if (profile.veg >= 40) tags.push('vegetables');
  if (profile.fruit >= 40) tags.push('fruit');
  if (profile.nuts >= 8) tags.push('nuts-seeds');
  if (profile.egg >= 25) tags.push('eggs');
  if (profile.dairy >= 30) tags.push('dairy');
  return tags;
}
