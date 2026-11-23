// Her own recipes: suggestions while she types one in (main protein, effort, tags), and turning the form into a
// recipe the planner, grocery list and nutrition all treat exactly like a built-in one.

import type { Ingredient, MealSlot, MyRecipe, ProteinKind, Recipe } from '../types';
import type { FoodDb } from './foodDb';
import { dietClass, dietProfile, dietTags, effortFor, resolveIngredients } from './recipes';

const BY_NAME: [RegExp, ProteinKind][] = [
  [/salmon/, 'salmon'], [/tuna/, 'tuna'], [/sardine/, 'sardines'], [/trout/, 'trout'], [/shrimp|prawn/, 'shrimp'],
  [/scallop|mussel|clam|oyster|crab|lobster|squid|calamari/, 'shellfish'], [/cod|tilapia|halibut|haddock|pollock|sole|flounder|bass|snapper|fish/, 'white-fish'],
  [/chicken/, 'chicken'], [/turkey/, 'turkey'], [/lamb/, 'lamb'], [/pork|ham\b|bacon|sausage/, 'pork'], [/beef|steak|veal/, 'beef'],
  [/chickpea|garbanzo|hummus/, 'chickpeas'], [/lentil/, 'lentils'], [/white bean|cannellini|great northern|navy/, 'white-beans'],
  [/black bean/, 'black-beans'], [/kidney/, 'kidney-beans'], [/pinto|bean/, 'mixed-beans'], [/edamame/, 'edamame'], [/tofu|tempeh/, 'tofu'],
  [/egg/, 'eggs'], [/yogurt|kefir/, 'yogurt'], [/cheese|ricotta|feta|parmesan|mozzarella/, 'cheese'],
];

/** The main protein: the protein food with the most weight in the recipe. */
export function suggestProtein(r: Pick<Recipe, 'ingredients' | 'servings'>, foods: FoodDb): ProteinKind {
  let best: { kind: ProteinKind; g: number } | null = null;
  for (const x of resolveIngredients(r, foods)) {
    if (!x.food || x.grams === null) continue;
    const cls = dietClass(x.food);
    if (!['fish', 'poultry', 'red-meat', 'processed-meat', 'legume', 'egg', 'dairy', 'nuts'].includes(cls)) continue;
    const name = x.food.name.toLowerCase();
    const kind = BY_NAME.find(([re]) => re.test(name))?.[1] ?? (cls === 'nuts' ? 'nuts' : cls === 'fish' ? 'white-fish' : cls === 'poultry' ? 'chicken' : cls === 'red-meat' ? 'beef' : cls === 'legume' ? 'mixed-beans' : cls === 'egg' ? 'eggs' : 'cheese');
    // meat and fish win over a sprinkle of cheese even when lighter
    const weight = x.grams * (['fish', 'poultry', 'red-meat', 'processed-meat'].includes(cls) ? 3 : cls === 'legume' || cls === 'egg' ? 2 : 1);
    if (!best || weight > best.g) best = { kind, g: weight };
  }
  return best?.kind ?? 'none';
}

/** Diet tags the app works out (fish, legume, vegetarian, whole grains...), shown as suggestions. */
export const suggestTags = (r: Pick<Recipe, 'ingredients' | 'servings'>, foods: FoodDb) => dietTags(dietProfile(r, foods));

export interface RecipeSet {
  /** Every recipe the app can show: built-ins (her changed version where she has one) plus all of hers. */
  everything: Recipe[];
  /** Her own recipes listed under "My recipes" (not batch-only, not deleted, not changed built-ins). */
  myIds: Set<string>;
  /** Her own recipes that are batch-only or deleted: kept for nutrition, never listed or planned. */
  hiddenIds: Set<string>;
  /** Built-in recipes she has changed. */
  changedIds: Set<string>;
}

/**
 * Puts the built-in recipes and hers together. A recipe of hers with a built-in recipe's id is her changed
 * version of it and replaces it; once that is deleted ("Undo my changes"), the original is used again.
 */
export function combineRecipes(builtins: Recipe[], mine: MyRecipe[]): RecipeSet {
  const builtinIds = new Set(builtins.map((r) => r.id));
  const changed = new Map(mine.filter((r) => builtinIds.has(r.id) && !r.deletedAt).map((r) => [r.id, r]));
  const own = mine.filter((r) => !builtinIds.has(r.id));
  return {
    everything: [...builtins.map((b) => changed.get(b.id) ?? b), ...own],
    myIds: new Set(own.filter((r) => !r.deletedAt && !r.hidden).map((r) => r.id)),
    hiddenIds: new Set(own.filter((r) => r.hidden || r.deletedAt).map((r) => r.id)),
    changedIds: new Set(changed.keys()),
  };
}

/** Hand tags she can add herself. */
export const HAND_TAGS = [
  { id: 'batch-friendly', label: 'Good for batch cooking' },
  { id: 'make-ahead', label: 'Make ahead' },
  { id: 'freezer', label: 'Freezes well' },
  { id: 'no-cook', label: 'No cooking' },
  { id: 'treat', label: 'Treat' },
] as const;

export interface RecipeDraft {
  id?: string;
  name: string;
  meal: MealSlot;
  alsoFor: MealSlot[];
  servings: number;
  activeMin: number;
  totalMin: number;
  effort?: Recipe['effort']; // her choice; otherwise from total time
  protein?: ProteinKind; // her choice; otherwise suggested
  tags: string[];
  ingredients: Ingredient[];
  steps: string;
  about?: string;
}

export function draftProblems(d: RecipeDraft): string[] {
  const p: string[] = [];
  if (!d.name.trim()) p.push('Give it a name.');
  if (!(d.servings > 0)) p.push('Say how many servings it makes.');
  if (!d.ingredients.length) p.push('Add at least one ingredient.');
  if (!(d.totalMin > 0)) p.push('Say about how long it takes in total.');
  if (d.activeMin > d.totalMin) p.push('Hands-on time cannot be longer than the total time.');
  return p;
}

export function draftToRecipe(d: RecipeDraft, foods: FoodDb, id: string, now: number, hidden = false): MyRecipe {
  const base = { ingredients: d.ingredients, servings: d.servings };
  return {
    id,
    updatedAt: now,
    source: 'mine',
    hidden: hidden || undefined,
    name: d.name.trim(),
    meal: d.meal,
    alsoFor: d.alsoFor.filter((m) => m !== d.meal),
    servings: d.servings,
    activeMin: Math.max(1, Math.round(d.activeMin || d.totalMin)),
    totalMin: Math.round(d.totalMin),
    effort: d.effort ?? effortFor(d.totalMin),
    protein: d.protein ?? suggestProtein(base, foods),
    tags: d.tags,
    ingredients: d.ingredients,
    steps: d.steps.split('\n').map((s) => s.trim()).filter(Boolean),
    about: d.about?.trim() || undefined,
  };
}

export function recipeToDraft(r: Recipe): RecipeDraft {
  return {
    id: r.id, name: r.name, meal: r.meal, alsoFor: r.alsoFor ?? [], servings: r.servings, activeMin: r.activeMin, totalMin: r.totalMin,
    effort: r.effort, protein: r.protein, tags: r.tags, ingredients: r.ingredients, steps: r.steps.join('\n'), about: r.about,
  };
}
