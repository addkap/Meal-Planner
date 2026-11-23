// Units: turning "1 1/2 cups", "3 cloves" or "6 oz" of a food into grams, and back again for display.
//
// Weights (g, oz, lb) convert directly. Volumes (tsp, tbsp, cup...) need the food's density, which comes
// from its USDA household portions (e.g. "1 cup, chopped = 160 g"). Counts (medium, slice, clove, can...)
// need a matching portion. If none fits, the answer is null ("can't tell") rather than a guess.

import type { Food, Portion } from '../types';

export const MASS_G: Record<string, number> = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 };
export const VOLUME_ML: Record<string, number> = { pinch: 0.3, tsp: 4.92892, tbsp: 14.7868, 'fl oz': 29.5735, cup: 236.588, ml: 1, l: 1000, pint: 473.176, quart: 946.353 };

const SYNONYMS: Record<string, string> = {
  gram: 'g', grams: 'g', gm: 'g', kilogram: 'kg', kilograms: 'kg',
  ounce: 'oz', ounces: 'oz', pound: 'lb', pounds: 'lb', lbs: 'lb',
  teaspoon: 'tsp', teaspoons: 'tsp', t: 'tsp', tablespoon: 'tbsp', tablespoons: 'tbsp', tbs: 'tbsp', tbl: 'tbsp',
  cups: 'cup', c: 'cup', milliliter: 'ml', milliliters: 'ml', ml: 'ml', liter: 'l', liters: 'l', litre: 'l',
  'fluid ounce': 'fl oz', 'fluid ounces': 'fl oz', floz: 'fl oz',
  pints: 'pint', quarts: 'quart', qt: 'quart', pinches: 'pinch', dash: 'pinch',
  slices: 'slice', cloves: 'clove', cans: 'can', jars: 'jar', pieces: 'piece', pcs: 'piece', leaves: 'leaf',
  stalks: 'stalk', sprigs: 'sprig', heads: 'head', bunches: 'bunch', packages: 'package', pkg: 'package',
  containers: 'container', fillets: 'fillet', breasts: 'breast', thighs: 'thigh', tortillas: 'tortilla',
  bags: 'bag', boxes: 'box', blocks: 'block', cartons: 'carton', caps: 'cap', servings: 'serving',
  'nlea serving': 'serving', fruit: 'each', whole: 'each', item: 'each', items: 'each', ea: 'each', '': 'each',
  smalls: 'small', mediums: 'medium', larges: 'large',
  pitas: 'pita', muffins: 'muffin', eggs: 'each', egg: 'each', chips: 'chip', crackers: 'cracker',
};

/** "Cups" -> "cup", "Tablespoon" -> "tbsp", "" -> "each". */
export function normalizeUnit(raw: string): string {
  const u = raw.trim().toLowerCase().replace(/\.$/, '').replace(/\s+/g, ' ');
  return SYNONYMS[u] ?? u;
}

export const isMass = (u: string) => u in MASS_G;
export const isVolume = (u: string) => u in VOLUME_ML;

/** The unit a USDA portion label describes: "cup, chopped" -> cup, "medium (2-3/4" dia)" -> medium, "oz (6 kernels)" -> oz. */
export function portionUnit(label: string): string {
  const head = label.toLowerCase().split(/[,(]/)[0].trim();
  for (const known of ['fl oz', 'cup', 'tbsp', 'tsp', 'oz', 'lb']) {
    if (head === known || head.startsWith(known + ' ')) return known;
  }
  // "medium whole (2-3/5" dia)" -> medium, "large (3-3/8" dia)" -> large ("extra large" stays as it is)
  const first = head.split(' ')[0];
  if (first === 'small' || first === 'medium' || first === 'large') return first;
  // "slice regular", "slices (1" dia)", "cup slices": the first word is the unit
  const firstUnit = normalizeUnit(first);
  if (COUNT_UNITS.has(firstUnit)) return firstUnit;
  return normalizeUnit(head); // "slice, thin" -> slice, "fruit (2-1/8" dia)" -> each
}

export function makePortion(label: string, g: number): Portion {
  return { unit: portionUnit(label), label, g };
}

const COUNT_UNITS = new Set(['slice', 'clove', 'can', 'jar', 'piece', 'stalk', 'sprig', 'head', 'bunch', 'package', 'container', 'fillet', 'leaf', 'tortilla', 'pita', 'muffin', 'serving', 'cracker', 'chip', 'bar', 'cookie', 'breast', 'thigh', 'patty']);

const SIZE_ORDER = ['medium', 'each', 'large', 'small'];

/** Units things are sold in. A plain count ("2 pitas") never means a package of them. */
export const PACKAGE_UNITS = new Set(['can', 'jar', 'bunch', 'head', 'bag', 'box', 'package', 'block', 'carton', 'container', 'pint', 'dozen', 'loaf', 'tub', 'bottle', 'half-gallon']);

/**
 * Grams in `qty` `unit` of `food`, or null if the unit cannot be worked out for this food.
 */
export function toGrams(food: Pick<Food, 'portions'>, qty: number, rawUnit: string): number | null {
  const unit = normalizeUnit(rawUnit);
  if (!(qty >= 0)) return null;
  if (isMass(unit)) return qty * MASS_G[unit];

  if (isVolume(unit)) {
    const ml = qty * VOLUME_ML[unit];
    const vol = food.portions.find((p) => p.unit === unit) ?? food.portions.find((p) => isVolume(p.unit));
    if (!vol) return null;
    return ml * (vol.g / VOLUME_ML[vol.unit]);
  }

  const exact = food.portions.find((p) => p.unit === unit);
  if (exact) return qty * exact.g;
  if (unit === 'each') {
    // "2 eggs", "1 apple": use the medium (or only) size
    for (const s of SIZE_ORDER) {
      const p = food.portions.find((x) => x.unit === s);
      if (p) return qty * p.g;
    }
    const counted = food.portions.find((p) => !isMass(p.unit) && !isVolume(p.unit) && !PACKAGE_UNITS.has(p.unit));
    return counted ? qty * counted.g : null;
  }
  return null;
}

/** Units she can pick for a food: weights always, volumes if the food has a volume portion, plus its own counted portions. */
export function unitsFor(food: Pick<Food, 'portions'>): string[] {
  const out = new Set<string>();
  for (const p of food.portions) if (!isMass(p.unit) && !isVolume(p.unit)) out.add(p.unit);
  if (food.portions.some((p) => isVolume(p.unit))) ['cup', 'tbsp', 'tsp'].forEach((u) => out.add(u));
  ['g', 'oz', 'lb'].forEach((u) => out.add(u));
  return [...out];
}

// ---------------------------------------------------------------- display

const FRACTIONS: [number, string][] = [
  [0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'], [1, ''],
];

/**
 * A kitchen-friendly number: 1.5 -> "1½", 0.33 -> "⅓", 2.97 -> "3", 12.4 -> "12".
 * Fractions only for small amounts in kitchen units; weights and big numbers round to whole numbers.
 */
export function formatQty(q: number, unit = ''): string {
  if (!isFinite(q) || q <= 0) return '0';
  const u = normalizeUnit(unit);
  if (u === 'g' || u === 'ml' || q >= 10) return String(Math.round(q));
  if (u === 'oz' || u === 'lb' || u === 'kg') return String(Math.round(q * 10) / 10).replace(/\.0$/, '');
  const whole = Math.floor(q);
  const rest = q - whole;
  let best = FRACTIONS[0];
  for (const f of FRACTIONS) if (Math.abs(f[0] - rest) < Math.abs(best[0] - rest)) best = f;
  const w = best[0] === 1 ? whole + 1 : whole;
  if (w === 0 && best[1] === '') return '⅛'; // never show "0" for a real amount
  return `${w || ''}${best[1]}` || '0';
}

const PLURAL_UNITS = new Set(['cup', 'slice', 'clove', 'can', 'jar', 'piece', 'stalk', 'sprig', 'head', 'bunch', 'package', 'container', 'fillet', 'bag', 'box', 'block', 'carton', 'pint', 'quart', 'leaf', 'serving', 'tortilla', 'pita', 'cap', 'tub', 'bottle', 'loaf', 'half-gallon', 'dozen']);

/**
 * Round a scaled amount the way a cook would: counted things (eggs, cloves, cans, slices) to the nearest half
 * below 3 and to whole numbers from 3 up, never to zero. Measured amounts (cups, grams) are left alone.
 */
export function kitchenRound(q: number, unit: string): number {
  const u = normalizeUnit(unit);
  if (isMass(u) || isVolume(u) || q <= 0) return q;
  const r = q < 3 ? Math.round(q * 2) / 2 : Math.round(q);
  return Math.max(r, q < 0.5 ? 0.5 : 1);
}

/** 3 tsp -> 1 tbsp, 8 tbsp -> ½ cup, but only when the bigger unit gives a clean kitchen fraction. */
export function tidyVolume(q: number, unit: string): [number, string] {
  const u = normalizeUnit(unit);
  const clean = (x: number) => [1, 2, 3, 4].some((d) => Math.abs(x * d - Math.round(x * d)) < 0.02);
  if (u === 'tsp' && q >= 3 && clean(q / 3)) return tidyVolume(q / 3, 'tbsp');
  if (u === 'tbsp' && q >= 4 && clean(q / 16)) return [q / 16, 'cup'];
  return [q, u];
}

/** "2 cups", "1 can", "3 cloves", "8 oz". `each` shows no unit at all ("2"). Counted things are rounded (see kitchenRound). */
export function formatAmount(rawQ: number, rawUnit: string): string {
  const [vq, u] = tidyVolume(rawQ, rawUnit);
  const q = kitchenRound(vq, u);
  const n = formatQty(q, u);
  if (u === 'each') return n;
  const IRREG: Record<string, string> = { leaf: 'leaves', bunch: 'bunches', box: 'boxes', loaf: 'loaves', dozen: 'dozen', 'half-gallon': 'half-gallons' };
  const plural = PLURAL_UNITS.has(u) && (q > 1.0001) ? (IRREG[u] ?? u + 's') : u;
  return `${n} ${plural}`;
}

/** "orange" -> "oranges", "red bell pepper" -> "red bell peppers", "tomato" -> "tomatoes", "eggs" stays. */
const IRREGULAR: Record<string, string> = { celery: 'celery stalks', 'fresh ginger': 'pieces fresh ginger', 'cherry tomatoes': 'cherry tomatoes' };

export function pluralize(name: string): string {
  if (IRREGULAR[name.toLowerCase()]) return IRREGULAR[name.toLowerCase()];
  if (name.includes(',') || /s$/i.test(name)) return name;
  if (/(ch|sh|x|z)$/i.test(name)) return name + 'es';
  if (/(potato|tomato)$/i.test(name)) return name + 'es';
  if (/[^aeiou]y$/i.test(name)) return name.slice(0, -1) + 'ies';
  return name + 's';
}

/** One ingredient line as a cook reads it: "2 cups spinach", "3 oranges", "1 medium onion, diced". */
export function ingredientText(qty: number, unit: string, foodName: string, note?: string): string {
  const [vq, u] = tidyVolume(qty, unit);
  const q = kitchenRound(vq, u);
  const counted = u === 'each' || u === 'small' || u === 'medium' || u === 'large';
  const name = counted && q > 1 ? pluralize(foodName) : foodName;
  return `${formatAmount(vq, u)} ${name}${note ? `, ${note}` : ''}`;
}
