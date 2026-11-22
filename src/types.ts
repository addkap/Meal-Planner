// The app's data model. Everything that syncs to OneDrive has an `id` and `updatedAt`
// (and `deletedAt` once deleted), exactly like Lift Log, so the same newest-wins merge works.

import type { GroceryCategory } from './lib/categories';
import type { NutrientValues } from './lib/nutrients';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** Easy: about 25 minutes or less in total. Medium: 25 to 50. Long ("Time-consuming"): over 50. */
export type Effort = 'easy' | 'medium' | 'long';

/** Synced records. */
export interface Rec {
  id: string;
  updatedAt: number;
  deletedAt?: number;
}

// ---------------------------------------------------------------- foods

/**
 * Which food an ingredient or log entry means:
 *   key:<name>     a food from src/data/foodKeys.ts (built-in recipes use these)
 *   usda:<fdcId>   any food in the bundled USDA database
 *   custom:<id>    a food she typed in or scanned (a CustomFood record)
 */
export type FoodRef = string;

export interface Portion {
  unit: string; // normalized unit, e.g. "cup", "tbsp", "medium", "slice", "can"
  label: string; // as shown, e.g. "cup, chopped"
  g: number; // grams in ONE of this unit
}

export interface Food {
  ref: FoodRef;
  name: string;
  group: string; // USDA food group, or "Custom" / "Packaged"
  cat: GroceryCategory;
  per100g: NutrientValues; // null = not listed
  portions: Portion[];
  source: 'usda' | 'custom' | 'scanned';
}

/** A food she typed in from a label or scanned. Synced. */
export interface CustomFood extends Rec {
  name: string;
  brand?: string;
  barcode?: string;
  cat: GroceryCategory;
  per100g: NutrientValues;
  /** Her label's serving size in grams (for "1 serving"). */
  servingG?: number;
  servingLabel?: string;
  portions: Portion[];
  source: 'custom' | 'scanned';
  /** Where scanned data came from, e.g. "Open Food Facts". */
  origin?: string;
}

// ---------------------------------------------------------------- recipes

export interface Ingredient {
  food: FoodRef;
  qty: number;
  unit: string;
  note?: string; // "diced", "drained", "divided"...
}

/** The main protein, used for "no same protein on back-to-back dinners". */
export type ProteinKind =
  | 'salmon' | 'white-fish' | 'shrimp' | 'tuna' | 'sardines' | 'trout' | 'shellfish'
  | 'chicken' | 'turkey'
  | 'beef' | 'lamb' | 'pork'
  | 'chickpeas' | 'lentils' | 'white-beans' | 'black-beans' | 'kidney-beans' | 'mixed-beans' | 'edamame'
  | 'tofu' | 'eggs' | 'yogurt' | 'cheese' | 'nuts' | 'none';

export interface Recipe {
  id: string;
  name: string;
  meal: MealSlot;
  /** Meal types it also suits (e.g. a frittata for lunch). */
  alsoFor?: MealSlot[];
  servings: number; // how many servings the ingredient amounts make
  activeMin: number;
  totalMin: number;
  effort: Effort;
  protein: ProteinKind;
  tags: string[]; // extra hand tags such as "no-cook", "batch-friendly"; diet tags are computed from ingredients
  ingredients: Ingredient[];
  steps: string[];
  about?: string;
}

/** A recipe she entered herself. Synced. */
export interface MyRecipe extends Rec, Recipe {
  source: 'mine';
}

export type Feedback = 'more' | 'less' | 'never';

/** "Use more / Use less / Don't use again" and favorites, per recipe. Synced. id = recipe id. */
export interface RecipePref extends Rec {
  feedback?: Feedback;
  favorite?: boolean;
}

// ---------------------------------------------------------------- weekly plan

export interface PlannedMeal {
  slot: MealSlot;
  recipeId?: string; // empty when the slot is off (snack off) or filled by a batch
  batchId?: string; // filled by a batch she cooked
  portion: number; // her own serving size, 0.75 to 1.5
  people: number; // how many people this meal is cooked for (scales ingredients and groceries)
  locked?: boolean;
}

export interface DayPlan {
  date: string; // YYYY-MM-DD
  effort: Effort;
  snack: boolean;
  people: number;
  kcalTarget: number;
  fiberTarget: number;
  meals: PlannedMeal[];
  /** Set by the planner when the day could not reach its targets, shown on screen. */
  warnings?: string[];
}

/** One week's plan. id = the Monday's date (YYYY-MM-DD). Synced. */
export interface WeekPlan extends Rec {
  weekStart: string;
  days: DayPlan[];
  finalized: boolean;
  seed: number;
  /** Rule problems caused by her locked meals or batches (shown on the plan). */
  warnings?: string[];
}

// ---------------------------------------------------------------- batches

export interface Batch extends Rec {
  recipeId: string;
  servingsMade: number;
  frozen: number; // set aside to freeze (not used by this week's plan)
  cookedOn: string; // YYYY-MM-DD (or the planned cooking day)
  cooked: boolean; // false = planned; its groceries go on the list
  /** Servings used so far (by eating a batch meal or logging it). */
  used: number;
}

// ---------------------------------------------------------------- daily log

/** Something she ate. Planned meals she checked off and off-plan foods both become entries. Synced. */
export interface LogEntry extends Rec {
  date: string;
  slot: MealSlot;
  kind: 'planned' | 'recipe' | 'food' | 'batch';
  recipeId?: string;
  batchId?: string;
  food?: FoodRef;
  /** For recipes and batches: servings. For foods: quantity in `unit`. */
  qty: number;
  unit?: string;
  grams?: number; // resolved grams for foods (kept so later database changes do not shift history)
  label: string;
}

/** Per-day overrides of the calorie and fiber targets. id = date. Synced. */
export interface DayTargets extends Rec {
  kcal?: number;
  fiber?: number;
}

// ---------------------------------------------------------------- groceries

export interface Store extends Rec {
  name: string;
  order: number;
}

/** Which store an item is bought at. id = grocery item key. storeId "any" = Buy at any store. Synced. */
export interface StoreAssignment extends Rec {
  storeId: string;
}

/** Per-week grocery state: checked items, "I already have this", one-week store overrides. id = `${weekStart}|${itemKey}`. Synced. */
export interface GroceryMark extends Rec {
  weekStart: string;
  itemKey: string;
  checked?: boolean;
  have?: boolean;
  storeOverride?: string;
}

// ---------------------------------------------------------------- weight

export interface WeighIn extends Rec {
  date: string;
  kg: number;
  note?: string;
}

// ---------------------------------------------------------------- settings

export type Sex = 'female' | 'male';
export type AgeRange = '19-30' | '31-50' | '51-70' | '71+';

export interface Settings extends Rec {
  id: 'settings';
  kcal: number;
  fiber: number;
  sex: Sex;
  age: AgeRange;
  people: number;
  weightUnit: 'lb' | 'kg';
  goalKg?: number;
  rules: DietRules;
}

export interface DietRules {
  fishMin: number;
  fishMax: number;
  poultryMin: number;
  poultryMax: number;
  redMeatMax: number;
  legumeDaysMin: number; // days per week with beans or legumes
  eggMealsMax: number;
}
