// Using up what she opens. Recipes scaled to one or two people often need part of a can, bag or bunch
// (½ can of chickpeas, ⅓ bag of spinach). Whatever is left in an opened package should be eaten while it is
// still good, so the planner keeps a running tally of what is open and prefers recipes that use it.
//
// Only packages that spoil within days once opened count: opened cans and cartons of broth, fresh herbs and
// greens, berries and cherry tomatoes, tubs of yogurt or ricotta, and the like. Dry goods, spices, oils, frozen
// food, jars, bread (it freezes), milk (a daily staple) and things that keep for weeks (garlic, grated Parmesan,
// olives, tortillas) are not tracked, and meat and fish are bought by weight at the counter.
//
// The tally runs day by day, meal by meal (breakfast, lunch, dinner, snack), in the same order the planner
// fills the week. A meal takes what it needs from an open package first; if that is not enough it opens new
// ones, and whatever it does not use stays open from that day. An open package is good for a few days
// (KEEPS_DAYS); after that it no longer counts. What is still open at the end of a week carries into the
// first days of the next week, and that week's grocery list buys less of it.

import type { GroceryCategory } from './categories';
import { daysBetween } from './dates';
import type { FoodDb } from './foodDb';
import { formatQty, normalizeUnit, toGrams } from './units';
import type { DayPlan, Food, PlannedMeal, Recipe } from '../types';

/** Package units that get opened and not always finished. */
const TRACKED_UNITS = new Set(['can', 'bunch', 'head', 'bag', 'box', 'package', 'block', 'carton', 'container', 'pint', 'tub']);
/** Sold in packages but keep for weeks once opened. */
const KEEPS_LONG = /garlic|parmesan|olive|tortilla|cheddar|lemon|lime|ginger/i;

/** How many days an opened package stays good, by grocery section. Sections not listed keep (or are not tracked). */
export const KEEPS_DAYS: Partial<Record<GroceryCategory, number>> = { 'canned-jarred': 4, produce: 5, 'dairy-eggs': 7 };

/** Less than this much of a package left counts as finished (a spoonful in the can). */
export const FINISHED = 0.08;
/** A hair more than whole packages does not open another one (the grocery list rounds the same way). */
const HAIR = 0.05;

export interface PackageInfo {
  key: string; // food reference
  name: string;
  unit: string; // can, bag, bunch...
  g: number; // grams in one package
  days: number; // how long it keeps once opened
}

/** The package a food is sold in, if it is one that spoils once opened. */
export function packageOf(food: Pick<Food, 'ref' | 'name' | 'cat' | 'portions'>): PackageInfo | null {
  const days = KEEPS_DAYS[food.cat];
  if (!days || KEEPS_LONG.test(food.name)) return null;
  const p = food.portions.find((x) => TRACKED_UNITS.has(normalizeUnit(x.unit)) && x.g >= 25);
  return p ? { key: food.ref, name: food.name, unit: normalizeUnit(p.unit), g: p.g, days } : null;
}

/** One packaged ingredient of a recipe: grams per serving. */
export interface PackagedUse { pkg: PackageInfo; gPerServing: number }

/** The packaged ingredients of a recipe (same food used twice is added together). */
export function packagedUses(recipe: Pick<Recipe, 'ingredients' | 'servings'>, foods: FoodDb): PackagedUse[] {
  const out = new Map<string, PackagedUse>();
  for (const ing of recipe.ingredients) {
    const food = foods.get(ing.food);
    const pkg = food && packageOf(food);
    const g = food && toGrams(food, ing.qty, ing.unit);
    if (!pkg || !g) continue;
    const cur = out.get(pkg.key);
    out.set(pkg.key, { pkg, gPerServing: (cur?.gPerServing ?? 0) + g / recipe.servings });
  }
  return [...out.values()];
}

// ---------------------------------------------------------------- the tally

export interface OpenPack {
  pkg: PackageInfo;
  left: number; // grams still in the open package
  openedOn: string;
}

export type OpenState = Map<string, OpenPack>;

/** Whether an opened package is still good on a date. */
export const goodOn = (o: OpenPack, date: string) => daysBetween(o.openedOn, date) < o.pkg.days;

/** Copy, so a trial does not change the real tally. */
export const cloneOpen = (s: OpenState): OpenState => new Map([...s].map(([k, o]) => [k, { ...o }]));

/** Something a meal takes from an already-open package: `frac` of a package. */
export interface UsedUp { pkg: PackageInfo; frac: number; openedOn: string }

/** How much of open packages (in packages) a meal would use, without changing the tally. */
export function leftoverUse(state: OpenState, uses: PackagedUse[], servings: number, date: string): number {
  let sum = 0;
  for (const u of uses) {
    const o = state.get(u.pkg.key);
    if (!o || !goodOn(o, date)) continue;
    sum += Math.min(o.left, u.gPerServing * servings) / u.pkg.g;
  }
  return sum;
}

/** How much (in packages) a meal would open and leave unused: new packages only, not what was already open. */
export function newLeftover(state: OpenState, uses: PackagedUse[], servings: number, date: string): number {
  let sum = 0;
  for (const u of uses) {
    const o = state.get(u.pkg.key);
    const avail = o && goodOn(o, date) ? o.left : 0;
    const rest = u.gPerServing * servings - avail;
    if (rest <= HAIR * u.pkg.g) continue;
    const left = Math.max(1, Math.ceil(rest / u.pkg.g - HAIR)) * u.pkg.g - rest;
    if (left >= FINISHED * u.pkg.g) sum += left / u.pkg.g;
  }
  return sum;
}

/** Cook a meal: take from open packages first, open new ones for the rest. Returns what it used up. */
export function cook(state: OpenState, uses: PackagedUse[], servings: number, date: string): UsedUp[] {
  const used: UsedUp[] = [];
  for (const u of uses) {
    const need = u.gPerServing * servings;
    let o = state.get(u.pkg.key);
    if (o && !goodOn(o, date)) { state.delete(u.pkg.key); o = undefined; }
    const take = Math.min(o?.left ?? 0, need);
    if (o && take > 0) {
      used.push({ pkg: u.pkg, frac: take / u.pkg.g, openedOn: o.openedOn });
      o.left -= take;
      if (o.left < FINISHED * u.pkg.g) state.delete(u.pkg.key);
    }
    const rest = need - take;
    if (rest <= HAIR * u.pkg.g) continue;
    const opened = Math.max(1, Math.ceil(rest / u.pkg.g - HAIR));
    const left = opened * u.pkg.g - rest;
    if (left >= FINISHED * u.pkg.g) state.set(u.pkg.key, { pkg: u.pkg, left, openedOn: date });
    else state.delete(u.pkg.key);
  }
  return used;
}

/** What one planned meal cooks: the recipe (not batch servings or meals she typed in) for its number of people. */
export interface MealUses { uses: PackagedUse[]; servings: number }

export interface WeekTally {
  /** Per meal (`date|slot`): what it took from packages opened earlier. */
  usedUp: Map<string, UsedUp[]>;
  /** Still open (and good) when the week ends. */
  end: OpenState;
}

/** Run the tally over planned days, in order. `usesOf` says what a meal cooks (undefined for batch servings and her own meals). */
export function tallyWeek(days: DayPlan[], usesOf: (m: PlannedMeal) => MealUses | undefined, carryIn: OpenPack[] = []): WeekTally {
  const state: OpenState = new Map(carryIn.map((o) => [o.pkg.key, { ...o }]));
  const usedUp = new Map<string, UsedUp[]>();
  for (const d of days) {
    for (const m of d.meals) {
      const x = usesOf(m);
      if (!x) continue;
      const u = cook(state, x.uses, x.servings, d.date);
      if (u.length) usedUp.set(`${d.date}|${m.slot}`, u);
    }
  }
  return { usedUp, end: state };
}

/** Packages still open at the end of a week that are good on `nextWeekStart` (they carry into that week). */
export function carryOver(end: OpenState, nextWeekStart: string): OpenPack[] {
  return [...end.values()].filter((o) => goodOn(o, nextWeekStart));
}

/** "½ can", "⅓ bag", "1½ cans" (not rounded up to whole packages the way shopping amounts are). */
export function packText(frac: number, unit: string): string {
  const q = Math.max(0.125, frac);
  const plural = q > 1.0001 ? ({ bunch: 'bunches', box: 'boxes' } as Record<string, string>)[unit] ?? `${unit}s` : unit;
  return `${formatQty(q, unit)} ${plural}`;
}

