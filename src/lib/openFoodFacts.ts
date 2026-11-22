// Looking up packaged foods in Open Food Facts (free, no key): https://world.openfoodfacts.org
// Only the barcode (or the search words) is sent. Results are saved on the phone, so a second scan of the
// same product works offline and never asks the internet again.
//
// Open Food Facts reports nutrients per 100 g, in grams (vitamins and minerals too), so they are converted to
// the units this app uses. Anything the product does not list stays null ("not listed"), never 0.

import { emptyValues, NUTRIENTS, type NutrientKey, type NutrientValues } from './nutrients';
import type { GroceryCategory } from './categories';
import type { CustomFood } from '../types';

/** Open Food Facts field for each nutrient. */
const OFF_FIELD: Record<NutrientKey, string> = {
  kcal: 'energy-kcal', protein: 'proteins', fat: 'fat', satFat: 'saturated-fat', monoFat: 'monounsaturated-fat', polyFat: 'polyunsaturated-fat',
  carbs: 'carbohydrates', fiber: 'fiber', sugars: 'sugars', cholesterol: 'cholesterol',
  vitA: 'vitamin-a', vitC: 'vitamin-c', vitD: 'vitamin-d', vitE: 'vitamin-e', vitK: 'vitamin-k', thiamin: 'vitamin-b1', riboflavin: 'vitamin-b2',
  niacin: 'vitamin-pp', pantothenic: 'pantothenic-acid', vitB6: 'vitamin-b6', folate: 'vitamin-b9', vitB12: 'vitamin-b12',
  calcium: 'calcium', iron: 'iron', magnesium: 'magnesium', phosphorus: 'phosphorus', potassium: 'potassium', sodium: 'sodium',
  zinc: 'zinc', copper: 'copper', manganese: 'manganese', selenium: 'selenium',
};

/** Open Food Facts gives grams; this app uses mg or µg for these. */
const SCALE: Record<string, number> = { mg: 1000, 'µg': 1_000_000, g: 1, kcal: 1 };

export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  categories_tags?: string[];
  nutriments?: Record<string, number | string | undefined>;
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
};

/** Per-100 g values in this app's units; null where the product does not list the nutrient. */
export function parseNutriments(n: OffProduct['nutriments'] = {}, servingG?: number | null): NutrientValues {
  const out = emptyValues(null);
  for (const info of NUTRIENTS) {
    const f = OFF_FIELD[info.key];
    let v = num(n[`${f}_100g`]);
    // Some products only list per serving: convert when the serving weight is known.
    if (v === null && servingG) {
      const s = num(n[`${f}_serving`]);
      if (s !== null) v = (s / servingG) * 100;
    }
    if (info.key === 'kcal' && v === null) {
      const kj = num(n['energy_100g']) ?? (servingG && num(n['energy_serving']) !== null ? (num(n['energy_serving'])! / servingG) * 100 : null);
      if (kj !== null) v = kj / 4.184; // energy is kJ
    }
    out[info.key] = v === null ? null : round(v * (SCALE[info.unit] ?? 1));
  }
  return out;
}

function round(x: number): number {
  if (x === 0) return 0;
  const d = Math.max(0, 3 - Math.ceil(Math.log10(Math.abs(x))));
  return Number(x.toFixed(Math.min(d, 4)));
}

/** Rough grocery section from Open Food Facts categories. */
export function categoryFromTags(tags: string[] = []): GroceryCategory {
  const has = (t: string) => tags.some((x) => x.includes(t));
  if (has('frozen')) return 'frozen';
  if (has('beverages') || has('drinks')) return 'beverages';
  if (has('dairies') || has('cheeses') || has('yogurts') || has('eggs')) return 'dairy-eggs';
  if (has('breads') || has('bakery')) return 'bakery';
  if (has('breakfast-cereals') || has('pastas') || has('rices') || has('cereals')) return 'grains-pasta';
  if (has('nuts') || has('dried-fruits') || has('seeds')) return 'nuts-dried-fruit';
  if (has('canned') || has('sauces') || has('soups')) return 'canned-jarred';
  if (has('snacks') || has('sweet') || has('chocolate') || has('crackers') || has('chips')) return 'snacks';
  if (has('meats') || has('fish') || has('seafood')) return 'meat-seafood';
  if (has('fruits') || has('vegetables')) return 'produce';
  return 'other';
}

/** Turn an Open Food Facts product into a food saved on the phone, linked to the barcode that was scanned. */
export function productToFood(p: OffProduct, barcode: string, id: string, now: number): CustomFood {
  const servingG = num(p.serving_quantity);
  const name = (p.product_name || p.product_name_en || '').trim() || `Product ${barcode}`;
  return {
    id,
    updatedAt: now,
    name,
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    barcode,
    cat: categoryFromTags(p.categories_tags),
    per100g: parseNutriments(p.nutriments, servingG),
    servingG: servingG ?? undefined,
    servingLabel: p.serving_size?.trim() || undefined,
    portions: [],
    source: 'scanned',
    origin: 'Open Food Facts',
  };
}

/** How many of the app's nutrients the product lists (to tell her when the label is incomplete). */
export const listedCount = (v: NutrientValues) => Object.values(v).filter((x) => x !== null).length;

// ---------------------------------------------------------------- network (browser only)

const FIELDS = 'code,product_name,product_name_en,brands,serving_size,serving_quantity,categories_tags,nutriments';

export type LookupResult = { status: 'found'; product: OffProduct } | { status: 'not-found' } | { status: 'offline' } | { status: 'error'; message: string };

export async function lookupBarcode(barcode: string, fetchFn: typeof fetch = fetch): Promise<LookupResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { status: 'offline' };
  try {
    const res = await fetchFn(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`);
    if (res.status === 404) return { status: 'not-found' };
    if (!res.ok) return { status: 'error', message: `Open Food Facts did not answer (${res.status}).` };
    const json = (await res.json()) as { status?: number; product?: OffProduct };
    if (json.status !== 1 || !json.product) return { status: 'not-found' };
    return { status: 'found', product: json.product };
  } catch {
    return { status: 'offline' };
  }
}

export async function searchProducts(words: string, fetchFn: typeof fetch = fetch): Promise<OffProduct[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(words)}&search_simple=1&action=process&json=1&page_size=15&fields=${FIELDS}`;
  const res = await fetchFn(url);
  if (!res.ok) throw new Error('Search did not work. Try again later.');
  const json = (await res.json()) as { products?: OffProduct[] };
  return (json.products ?? []).filter((p) => p.product_name || p.product_name_en);
}

/** A barcode as typed: digits only, 8 to 14 long (EAN-8, UPC-A, EAN-13, GTIN-14). */
export function cleanBarcode(s: string): string | null {
  const d = s.replace(/\D/g, '');
  return d.length >= 8 && d.length <= 14 ? d : null;
}
