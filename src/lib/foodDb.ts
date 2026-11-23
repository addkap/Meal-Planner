// The bundled USDA food database (public/data/foods.json) and looking foods up by reference.
//
// The file is NOT part of the app's JavaScript: it is fetched the first time it is needed, and the
// offline service worker keeps a copy on the phone, so it works with no signal afterwards.

import { FOOD_KEYS, type FoodKey, type FoodKeyName } from '../data/foodKeys';
import { CATEGORY_BY_USDA_GROUP } from './categories';
import { NUTRIENT_KEYS, type NutrientValues } from './nutrients';
import { makePortion, normalizeUnit } from './units';
import type { CustomFood, Food, FoodRef, Portion } from '../types';

/** The raw file format: [fdcId, name, groupIndex, values (NUTRIENT order), portions [label, grams][]]. */
export interface FoodsFile {
  v: number;
  source: string;
  nutrients: string[];
  groups: string[];
  foods: [number, string, number, (number | null)[], [string, number][]][];
}

export class FoodDb {
  readonly usda = new Map<number, Food>();
  private custom = new Map<string, Food>();

  constructor(file: FoodsFile) {
    if (file.nutrients.join() !== NUTRIENT_KEYS.join()) throw new Error('foods.json does not match this version of the app.');
    for (const [id, name, gi, vals, portions] of file.foods) {
      const group = file.groups[gi];
      this.usda.set(id, {
        ref: `usda:${id}`,
        name,
        group,
        cat: CATEGORY_BY_USDA_GROUP[group] ?? 'other',
        per100g: Object.fromEntries(NUTRIENT_KEYS.map((k, i) => [k, vals[i]])) as NutrientValues,
        portions: portions.map(([l, g]) => makePortion(l, g)),
        source: 'usda',
      });
    }
  }

  /** Her own and scanned foods (call again whenever they change). */
  setCustomFoods(list: CustomFood[]) {
    this.custom = new Map(list.filter((c) => !c.deletedAt).map((c) => [`custom:${c.id}`, customToFood(c)]));
  }

  get(ref: FoodRef): Food | null {
    if (ref.startsWith('key:')) {
      const key: FoodKey | undefined = FOOD_KEYS[ref.slice(4) as FoodKeyName];
      if (!key) return null;
      const base = this.usda.get(key.id);
      if (!base) return null;
      const extra: Portion[] = Object.entries(key.portions ?? {}).map(([u, g]) => ({ unit: normalizeUnit(u), label: u, g }));
      // Extra portions go first so a standard "can" or "bunch" wins over an odd USDA one.
      return { ...base, ref, name: key.name, cat: key.cat, portions: [...extra, ...base.portions] };
    }
    if (ref.startsWith('usda:')) return this.usda.get(Number(ref.slice(5))) ?? null;
    if (ref.startsWith('custom:')) return this.custom.get(ref) ?? null;
    return null;
  }

  all(): Food[] {
    return [...this.usda.values(), ...this.custom.values()];
  }

  /**
   * Foods to offer in searches: her own and scanned foods, the everyday foods the built-in recipes use under
   * their friendly names ("Extra-virgin olive oil", "Onion"), then the rest of the USDA list.
   * `boost` ranks them in that order.
   */
  searchable(): { food: Food; boost: number }[] {
    const out: { food: Food; boost: number }[] = [...this.custom.values()].map((food) => ({ food, boost: 3 }));
    const keyed = new Set<number>();
    for (const name of Object.keys(FOOD_KEYS) as FoodKeyName[]) {
      if (FOOD_KEYS[name].noGrocery) continue;
      const f = this.get(`key:${name}`);
      if (f) { out.push({ food: f, boost: 2 }); keyed.add(FOOD_KEYS[name].id); }
    }
    for (const [id, food] of this.usda) out.push({ food, boost: keyed.has(id) ? -1 : 0 });
    return out;
  }
}

export function customToFood(c: CustomFood): Food {
  const portions = [...c.portions];
  if (c.servingG && !portions.some((p) => p.unit === 'serving')) {
    portions.unshift({ unit: 'serving', label: c.servingLabel ? `serving (${c.servingLabel})` : 'serving', g: c.servingG });
  }
  return { ref: `custom:${c.id}`, name: c.brand ? `${c.name} (${c.brand})` : c.name, group: c.source === 'scanned' ? 'Packaged' : 'Custom', cat: c.cat, per100g: c.per100g, portions, source: c.source };
}

// ---------------------------------------------------------------- loading in the browser

let loading: Promise<FoodDb> | null = null;

/** Load the database once (from the phone's offline copy after the first visit). */
export function loadFoodDb(): Promise<FoodDb> {
  loading ??= (async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}data/foods.json`);
    if (!res.ok) throw new Error('Could not load the food list.');
    return new FoodDb((await res.json()) as FoodsFile);
  })();
  loading.catch(() => { loading = null; }); // allow a retry later
  return loading;
}
