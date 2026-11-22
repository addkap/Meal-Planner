// The week's grocery list: every ingredient of every planned recipe, scaled to the number of people at that meal,
// merged across recipes, turned into amounts you can actually buy, grouped by aisle, and split by store.
//
// Merging: amounts of the same food are added up. Weights add as weights, volumes as volumes (2 tbsp + ¼ cup =
// ½ cup), and mixed kinds (1 medium onion + ½ cup chopped onion) are added by weight through the food's own
// portion sizes. Then the total is expressed the way it is sold: whole onions, cans, bunches, bags...
// with the exact amount the recipes need shown alongside.
//
// Not on the list: batch servings (already cooked, or bought through the batch itself), meals she typed in,
// and tap water. A batch she has not cooked yet adds its whole recipe, scaled to the batch size.

import { FOOD_KEYS, type FoodKeyName } from '../data/foodKeys';
import { GROCERY_CATEGORIES, type GroceryCategory } from './categories';
import { addDays, dayName, shortDate } from './dates';
import type { FoodDb } from './foodDb';
import { formatAmount, isMass, isVolume, MASS_G, normalizeUnit, PACKAGE_UNITS, pluralize, toGrams, VOLUME_ML } from './units';
import type { Batch, DayPlan, Food, GroceryMark, Recipe, Store, StoreAssignment } from '../types';

/** Units that a food is sold in. When the food has one, the list rounds up to whole ones. */
const SHOP_UNITS = [...PACKAGE_UNITS];

/** Bought as something else: lemon juice and zest come from lemons (about 3 tbsp juice or 1 tbsp zest each), lime juice from limes. */
const BUY_AS: Record<string, { key: string; mlEach: number }> = {
  'key:lemon_juice': { key: 'key:lemon', mlEach: 45 },
  'key:lemon_zest': { key: 'key:lemon', mlEach: 15 },
  'key:lime_juice': { key: 'key:lime', mlEach: 30 },
};
const SIZES = ['each', 'small', 'medium', 'large'];

export interface Need { qty: number; unit: string; grams: number | null }

export interface Use { recipe: string; label: string } // label e.g. "Mon dinner" or "your batch"

export interface GroceryItem {
  key: string; // the food reference; stores are remembered per key
  name: string;
  cat: GroceryCategory;
  /** What to buy, e.g. "2 cans", "3 medium". */
  buy: string;
  /** What the recipes need in total, when different from `buy`, e.g. "1½ cans". */
  needed?: string;
  grams: number | null;
  uses: Use[];
}

// ---------------------------------------------------------------- collecting

export function collectNeeds(days: DayPlan[], recipes: Map<string, Recipe>, foods: FoodDb, batches: Batch[] = []): Map<string, { food: Food; needs: Need[]; uses: Use[] }> {
  const out = new Map<string, { food: Food; needs: Need[]; uses: Use[] }>();
  const add = (recipe: Recipe, people: number, label: string) => {
    const f = people / recipe.servings;
    for (const ing of recipe.ingredients) {
      if (ing.food.startsWith('key:') && FOOD_KEYS[ing.food.slice(4) as FoodKeyName]?.noGrocery) continue;
      let ref = ing.food;
      let qty = ing.qty * f;
      let unit = normalizeUnit(ing.unit);
      const as = BUY_AS[ref];
      if (as && isVolume(unit)) {
        qty = (qty * VOLUME_ML[unit]) / as.mlEach;
        unit = 'each';
        ref = as.key;
      }
      const food = foods.get(ref);
      if (!food) continue;
      const entry = out.get(ref) ?? { food, needs: [], uses: [] };
      entry.needs.push({ qty, unit, grams: toGrams(food, qty, unit) });
      if (!entry.uses.some((u) => u.recipe === recipe.name && u.label === label)) entry.uses.push({ recipe: recipe.name, label });
      out.set(ref, entry);
    }
  };
  for (const d of days) {
    for (const m of d.meals) {
      if (m.batchId || m.custom || !m.recipeId) continue;
      const r = recipes.get(m.recipeId);
      if (r) add(r, m.people, `${dayName(d.date, 'short')} ${m.slot}`);
    }
  }
  // Batches she plans to cook this week (not cooked yet): the whole batch.
  const first = days[0]?.date;
  for (const b of batches) {
    if (b.deletedAt || b.cooked || !first || b.cookedOn < first || b.cookedOn > addDays(first, 6)) continue;
    const r = recipes.get(b.recipeId);
    if (r) add(r, b.servingsMade, `batch of ${b.servingsMade}`);
  }
  return out;
}

// ---------------------------------------------------------------- merging and shopping amounts

/** Nice kitchen volume for a number of milliliters: cups from ½ cup up, then tbsp, then tsp (4 tbsp still shows as ¼ cup). */
export function volumeText(ml: number): [number, string] {
  if (ml >= VOLUME_ML.cup / 2 - 0.5) return [ml / VOLUME_ML.cup, 'cup'];
  if (ml >= VOLUME_ML.tbsp - 0.1) return [ml / VOLUME_ML.tbsp, 'tbsp'];
  return [ml / VOLUME_ML.tsp, 'tsp'];
}

/** Weight as sold in the US: ounces, or pounds from 1 lb up. */
export function massText(g: number): [number, string] {
  return g >= MASS_G.lb - 1 ? [g / MASS_G.lb, 'lb'] : [g / MASS_G.oz, 'oz'];
}

const roundUp = (q: number, step: number) => Math.ceil(q / step - 0.02) * step; // (a hair over a step is not the next step)

/** Round an amount up to something you can buy or measure: whole cans and onions, ¼ cups, whole ounces, ¼ pounds. */
export function shoppingRound(q: number, unit: string): number {
  if (unit === 'cup') return roundUp(q, 0.25);
  if (unit === 'tbsp') return roundUp(q, 0.5);
  if (unit === 'tsp') return roundUp(q, 0.25);
  if (unit === 'lb') return roundUp(q, 0.25);
  if (unit === 'oz' || unit === 'g') return roundUp(q, 1);
  return roundUp(q, 1); // counted things: you buy whole ones
}

const amountText = (q: number, unit: string) => formatAmount(q, unit);

/** Add up one food's needs and express the total as something to buy. */
export function mergeNeeds(food: Pick<Food, 'portions' | 'name'> & { cat?: Food['cat'] }, needs: Need[], shopUnits: string[] = food.cat === 'meat-seafood' ? [] : SHOP_UNITS): { buy: string; needed?: string; grams: number | null } {
  // (meat and fish are bought by weight at the counter, so no packages for them)
    const units = [...new Set(needs.map((n) => n.unit))];
  const allKnown = needs.every((n) => n.grams !== null);
  const totalG = allKnown ? needs.reduce((s, n) => s + (n.grams ?? 0), 0) : null;

  // 1. Sold in packages (cans, bunches, bags...): round up to whole packages.
  const pkg = food.portions.find((p) => shopUnits.includes(p.unit) && units.includes(p.unit)) ?? (totalG !== null ? food.portions.find((p) => shopUnits.includes(p.unit) && p.g >= 25) : undefined);
  if (pkg && totalG !== null) {
    const exact = totalG / pkg.g;
    const buy = Math.max(1, Math.ceil(exact - 0.05)); // a hair over is not a whole extra can
    const neededText = units.length === 1 && units[0] === pkg.unit ? amountText(exact, pkg.unit) : describeNeed(needs);
    return { buy: amountText(buy, pkg.unit), needed: neededText !== amountText(buy, pkg.unit) ? neededText : undefined, grams: totalG };
  }

  // 2. Everything in one unit: just add it up.
  if (units.length === 1) {
    const u = units[0];
    const q = needs.reduce((s, n) => s + n.qty, 0);
    if (isVolume(u)) {
      const [vq, vu] = volumeText(q * VOLUME_ML[u]);
      return { buy: amountText(shoppingRound(vq, vu), vu), grams: totalG };
    }
    if (isMass(u)) {
      const [mq, mu] = massText(q * MASS_G[u]);
      return { buy: amountText(shoppingRound(mq, mu), mu), grams: totalG };
    }
    const buy = shoppingRound(q, u);
    const same = amountText(q, u) === amountText(buy, u);
    return { buy: amountText(buy, u), needed: same ? undefined : `about ${amountText(q, u)}`, grams: totalG };
  }

  // 3. Only volumes (tbsp + cups): add them as volumes, no weights needed.
  if (units.every(isVolume)) {
    const ml = needs.reduce((s, n) => s + n.qty * VOLUME_ML[n.unit], 0);
    const [vq, vu] = volumeText(ml);
    return { buy: amountText(shoppingRound(vq, vu), vu), grams: totalG };
  }

  // 4. Mixed kinds: add by weight, then buy in the counted size if one was used (onions), else by weight.
  if (totalG !== null) {
    const counted = units.find((u) => SIZES.includes(u) || (!isMass(u) && !isVolume(u)));
    const per = counted ? toGrams(food, 1, counted) : null;
    if (counted && per) {
      const exact = totalG / per;
      const buy = Math.max(1, Math.ceil(exact - 0.05));
      return { buy: amountText(buy, counted), needed: describeNeed(needs), grams: totalG };
    }
    const [mq, mu] = massText(totalG);
    return { buy: amountText(shoppingRound(mq, mu), mu), needed: describeNeed(needs), grams: totalG };
  }

  // 5. Could not add them up (no weight known for some unit): list the parts.
  return { buy: describeNeed(needs), grams: null };
}

/** "1 medium + ½ cup" — the separate amounts, grouped by unit. */
function describeNeed(needs: Need[]): string {
  const byUnit = new Map<string, number>();
  for (const n of needs) byUnit.set(n.unit, (byUnit.get(n.unit) ?? 0) + n.qty);
  return [...byUnit].map(([u, q]) => amountText(q, u)).join(' + ');
}

/** The full list, grouped by aisle in store order. */
export function buildGroceryList(days: DayPlan[], recipes: Map<string, Recipe>, foods: FoodDb, batches: Batch[] = []): GroceryItem[] {
  const items: GroceryItem[] = [];
  for (const [key, { food, needs, uses }] of collectNeeds(days, recipes, foods, batches)) {
    const merged = mergeNeeds(food, needs);
    items.push({ key, name: food.name, cat: food.cat, buy: merged.buy, needed: merged.needed, grams: merged.grams, uses });
  }
  const order = new Map<GroceryCategory, number>(GROCERY_CATEGORIES.map((c, i) => [c.id, i]));
  return items.sort((a, b) => (order.get(a.cat)! - order.get(b.cat)!) || a.name.localeCompare(b.name));
}

/** A readable line: "Red onion: 2 medium" -> used on screen and in copied text. */
export const itemLine = (i: GroceryItem) => {
  const counted = /^[\d½¼¾⅓⅔⅛]+( (small|medium|large))?$/.test(i.buy);
  const name = counted && !/^1( |$)/.test(i.buy) ? pluralize(i.name.toLowerCase()) : i.name.toLowerCase();
  return `${i.buy} ${name}`.replace(/^(.)/, (c) => c.toUpperCase());
};

// ---------------------------------------------------------------- stores

export const ANY_STORE = 'any';
export const UNASSIGNED = 'unassigned';

export interface ItemState {
  item: GroceryItem;
  storeId: string; // a store id, ANY_STORE or UNASSIGNED
  thisWeekOnly: boolean; // the store was changed for this week only
  checked: boolean;
  have: boolean;
}

/**
 * Where each item is bought this week: a one-week override if she set one, otherwise the store she always buys it
 * at, otherwise "Unassigned" (a new item she has not sorted yet). A store that was removed counts as unassigned.
 */
export function resolveItems(items: GroceryItem[], weekStart: string, stores: Store[], assignments: StoreAssignment[], marks: GroceryMark[]): ItemState[] {
  const live = new Set(stores.filter((s) => !s.deletedAt).map((s) => s.id));
  const valid = (id?: string) => (id === ANY_STORE || (id && live.has(id)) ? id : undefined);
  const assign = new Map(assignments.filter((a) => !a.deletedAt).map((a) => [a.id, a.storeId]));
  const mark = new Map(marks.filter((m) => !m.deletedAt && m.weekStart === weekStart).map((m) => [m.itemKey, m]));
  return items.map((item) => {
    const m = mark.get(item.key);
    const override = valid(m?.storeOverride);
    const always = valid(assign.get(item.key));
    return { item, storeId: override ?? always ?? UNASSIGNED, thisWeekOnly: !!override && override !== always, checked: !!m?.checked, have: !!m?.have };
  });
}

/** The list for one store: its own items plus everything marked "Buy at any store". "I already have this" items are left off. */
export function listForStore(states: ItemState[], storeId: string): { own: ItemState[]; any: ItemState[] } {
  const active = states.filter((s) => !s.have);
  return {
    own: storeId === ANY_STORE ? [] : active.filter((s) => s.storeId === storeId),
    any: active.filter((s) => s.storeId === ANY_STORE),
  };
}

/** Plain text for one store's list (only what is still to buy), for pasting into a message or notes. */
export function storeListText(storeName: string, weekStart: string, states: ItemState[], storeId: string): string {
  const { own, any } = listForStore(states, storeId);
  const lines: string[] = [`${storeName} (week of ${shortDate(weekStart)})`];
  const section = (title: string, list: ItemState[]) => {
    const left = list.filter((s) => !s.checked);
    if (!left.length) return;
    lines.push('');
    if (title) lines.push(title.toUpperCase());
    for (const c of GROCERY_CATEGORIES) {
      const inCat = left.filter((s) => s.item.cat === c.id);
      if (!inCat.length) continue;
      lines.push(`${c.label}:`);
      for (const s of inCat) lines.push(`- ${itemLine(s.item)}`);
    }
  };
  if (storeId !== ANY_STORE) section('', own);
  section('Buy at any store', any);
  if (lines.length === 1) lines.push('', 'Nothing left to buy.');
  return lines.join('\n').trim();
}
