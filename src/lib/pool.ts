// The planner's view of every recipe: per-serving calories and fiber, its diet class, whether it
// passes the diet rules, and how often she wants it (Use more / Use less / Don't use again, favorites).

import type { DietRules, Effort, MealSlot, ProteinKind, Recipe, RecipePref } from '../types';
import type { FoodDb } from './foodDb';
import { dietProfile, dietTags, recipeNutrition, type DietProfile } from './recipes';
import type { Totals } from './nutrition';

/** Which of the weekly protein quotas a meal uses. "plant" = no fish, poultry or red meat. */
export type ProteinClass = 'fish' | 'poultry' | 'red' | 'plant';

export interface PoolRecipe {
  recipe: Recipe;
  id: string;
  meals: MealSlot[]; // meal types it can fill
  effort: Effort;
  activeMin: number;
  kcal: number; // per serving
  fiber: number;
  perServing: Totals;
  profile: DietProfile;
  tags: Set<string>;
  cls: ProteinClass;
  protein: ProteinKind;
  legume: boolean;
  veg: boolean;
  eggs: boolean;
  treat: boolean; // fine now and then as a snack, not as a regular meal
  /** Reasons it breaks the diet rules (empty = fine anywhere it fits). */
  issues: string[];
  /** How often to pick it relative to others (0 = never). */
  weight: number;
  mine: boolean;
  favorite: boolean;
}

export const DEFAULT_RULES: DietRules = {
  fishMin: 2,
  fishMax: 3,
  poultryMin: 1,
  poultryMax: 2,
  redMeatMax: 1,
  legumeDaysMin: 5,
  eggMealsMax: 4,
};

/** Multipliers for her feedback. "never" removes the recipe from the planner. */
export const FEEDBACK_WEIGHT = { more: 2, less: 0.5, never: 0 } as const;
/** Her own recipes get a small boost so they come up fairly often; favorites a bigger one. */
export const MINE_BOOST = 1.5;
export const FAVORITE_BOOST = 2.5;

/** Limits every planned meal should respect (the built-in library passes all of them; see library.test.ts). */
export const LIMITS = { addedSugarG: 12, redMeatG: 100, vegG: 40 };

export function classOf(tags: Set<string>): ProteinClass {
  if (tags.has('fish')) return 'fish';
  if (tags.has('poultry')) return 'poultry';
  if (tags.has('red-meat')) return 'red';
  return 'plant';
}

/** Why a recipe would break the diet rules, in plain words. */
export function ruleIssues(r: Recipe, profile: DietProfile): string[] {
  const out: string[] = [];
  if (profile['added-sugar'] > LIMITS.addedSugarG) out.push(`it has about ${Math.round(profile['added-sugar'])} g of added sugar per serving (the plan keeps meals under ${LIMITS.addedSugarG} g)`);
  if (profile['processed-meat'] > 0) out.push('it uses processed meat (sausage, deli meat or bacon)');
  if (profile['red-meat'] > LIMITS.redMeatG) out.push(`it has about ${Math.round(profile['red-meat'] / 28.35)} oz of red meat per serving (the plan keeps it to about 3.5 oz)`);
  if (profile['other-fat'] > Math.max(profile['olive-oil'], 5)) out.push('its main fat is butter or another fat instead of olive oil');
  const mainMeal = r.meal === 'lunch' || r.meal === 'dinner';
  if (mainMeal && profile.veg < LIMITS.vegG) out.push('it has almost no vegetables, and the plan puts vegetables in every lunch and dinner');
  return out;
}

export function buildPool(recipes: Recipe[], db: FoodDb, prefs: Map<string, RecipePref> = new Map(), mineIds: Set<string> = new Set()): PoolRecipe[] {
  return recipes.map((recipe) => {
    const n = recipeNutrition(recipe, db).perServing;
    const profile = dietProfile(recipe, db);
    const tags = new Set([...dietTags(profile), ...recipe.tags]);
    const pref = prefs.get(recipe.id);
    const mine = mineIds.has(recipe.id);
    const favorite = !!pref?.favorite && !pref.deletedAt;
    let weight = 1;
    if (pref && !pref.deletedAt && pref.feedback) weight *= FEEDBACK_WEIGHT[pref.feedback];
    if (mine) weight *= MINE_BOOST;
    if (favorite) weight *= FAVORITE_BOOST;
    const issues = ruleIssues(recipe, profile);
    // A dessert (too much sugar, or butter instead of olive oil) can still appear now and then as a snack.
    const dessertOnly = issues.length > 0 && issues.every((i) => i.includes('added sugar') || i.includes('butter'));
    const treat = tags.has('treat') || (dessertOnly && issues.some((i) => i.includes('added sugar')) && n.kcal.amount <= 350);
    const meals = [...new Set<MealSlot>([recipe.meal, ...(recipe.alsoFor ?? [])])];
    if (treat && !meals.includes('snack')) meals.push('snack');
    return {
      recipe,
      id: recipe.id,
      meals,
      effort: recipe.effort,
      activeMin: recipe.activeMin,
      kcal: n.kcal.amount,
      fiber: n.fiber.amount,
      perServing: n,
      profile,
      tags,
      cls: classOf(tags),
      protein: recipe.protein,
      legume: tags.has('legume'),
      veg: profile.veg >= LIMITS.vegG,
      eggs: tags.has('eggs'),
      treat,
      issues,
      weight,
      mine,
      favorite,
    };
  });
}

/**
 * Why the planner will not (or only rarely) use one of her recipes, for showing on its page.
 * Returns an empty list when it can be planned normally.
 */
export function explainPlacement(p: PoolRecipe): string[] {
  if (p.weight === 0) return ['You chose "Don\'t use again" for this recipe.'];
  if (p.issues.length === 0) return [];
  const why = `It is not planned as a regular ${p.recipe.meal} because ${p.issues.join('; and ')}.`;
  return p.treat ? [why, 'It can still appear as a snack about once a week.'] : [why];
}
