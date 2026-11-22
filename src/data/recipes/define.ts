// Helper the built-in recipe files use, so each recipe reads almost like a recipe card.
import { FOOD_KEYS } from '../foodKeys';
import { effortFor, parseIngredientLine } from '../../lib/recipes';
import type { MealSlot, ProteinKind, Recipe } from '../../types';

const isFoodKey = (k: string) => Object.prototype.hasOwnProperty.call(FOOD_KEYS, k);

const slug = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const PREFIX: Record<MealSlot, string> = { breakfast: 'b', lunch: 'l', dinner: 'd', snack: 's' };

export interface RecipeCard {
  name: string;
  serves: number;
  active: number; // minutes of hands-on work
  total: number; // minutes from start to eating
  protein: ProteinKind;
  ing: string[]; // "1 1/2 cup chickpeas, drained" (see parseIngredientLine)
  steps: string[];
  tags?: string[];
  also?: MealSlot[];
  about?: string;
}

export function cards(meal: MealSlot, list: RecipeCard[]): Recipe[] {
  return list.map((c) => ({
    id: `${PREFIX[meal]}-${slug(c.name)}`,
    name: c.name,
    meal,
    alsoFor: c.also,
    servings: c.serves,
    activeMin: c.active,
    totalMin: c.total,
    effort: effortFor(c.total),
    protein: c.protein,
    tags: c.tags ?? [],
    ingredients: c.ing.map((line) => parseIngredientLine(line, isFoodKey)),
    steps: c.steps,
    about: c.about,
  }));
}
