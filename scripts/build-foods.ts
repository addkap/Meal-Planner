// Builds public/data/foods.json from the USDA FoodData Central "SR Legacy" download.
//
//   1. Download https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip (about 6 MB)
//   2. Unzip it anywhere OUTSIDE this project
//   3. node scripts/build-foods.ts /path/to/FoodData_Central_sr_legacy_food_csv_2018-04
//
// The download itself is never committed; only the trimmed result is. USDA data is public domain.
//
// What it keeps: about 2,000 commonly eaten foods (fruit, vegetables, dairy, breads, snacks, meats, fish,
// prepared basics...), the nutrients in src/lib/nutrients.ts, and up to 8 household portions per food.
// Every food the built-in recipes use (src/data/foodKeys.ts) is always kept.

import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { NUTRIENTS } from '../src/lib/nutrients.ts';
import { FOOD_KEYS } from '../src/data/foodKeys.ts';

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: node scripts/build-foods.ts <folder with the SR Legacy CSV files>');
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- tiny CSV reader (quoted fields, "" escapes)
function* csvRows(file: string): Generator<string[]> {
  const text = readFileSync(join(dir, file), 'utf8');
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let first = true;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (first) first = false; else if (row.length > 1) yield row;
      row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); if (!first) yield row; }
}

// ---------------------------------------------------------------- read
const groupName = new Map<string, string>();
for (const [id, , desc] of csvRows('food_category.csv')) groupName.set(id, desc);

interface Raw { id: number; desc: string; group: string }
const foods = new Map<number, Raw>();
for (const [id, , desc, cat] of csvRows('food.csv')) foods.set(Number(id), { id: Number(id), desc, group: groupName.get(cat) ?? 'Other' });

const wanted = new Map<number, number>(); // USDA nutrient id -> index in NUTRIENTS (first choice)
const fallback = new Map<number, number>(); // second choice ids (e.g. total folate when DFE is missing)
NUTRIENTS.forEach((n, i) => n.usda.forEach((u, j) => (j === 0 ? wanted : fallback).set(u, i)));

const values = new Map<number, (number | null)[]>();
const fallbackValues = new Map<number, (number | null)[]>();
for (const [, fdc, nid, amount] of csvRows('food_nutrient.csv')) {
  const n = Number(nid);
  const target = wanted.has(n) ? values : fallback.has(n) ? fallbackValues : null;
  if (!target || amount === '') continue;
  const idx = (wanted.get(n) ?? fallback.get(n))!;
  const id = Number(fdc);
  let arr = target.get(id);
  if (!arr) { arr = NUTRIENTS.map(() => null); target.set(id, arr); }
  arr[idx] = Number(amount);
}
for (const [id, fb] of fallbackValues) {
  const arr = values.get(id);
  if (!arr) continue;
  fb.forEach((v, i) => { if (arr[i] === null && v !== null) arr[i] = v; });
}

// Fill in zeros that are known from what a food IS, where USDA simply left the row out:
//  - no carbohydrate means no fiber and no sugar (meat, fish, oils)
//  - plant foods contain no cholesterol and no vitamin B12, and (apart from mushrooms) no vitamin D
// Anything else that is missing stays "not listed".
const PLANT_GROUPS = new Set(['Vegetables and Vegetable Products', 'Fruits and Fruit Juices', 'Legumes and Legume Products', 'Nut and Seed Products', 'Cereal Grains and Pasta', 'Spices and Herbs']);
const idx = (key: string) => NUTRIENTS.findIndex((n) => n.key === key);
for (const [id, arr] of values) {
  const f = foods.get(id);
  if (!f) continue;
  if (arr[idx('carbs')] === 0) {
    if (arr[idx('fiber')] === null) arr[idx('fiber')] = 0;
    if (arr[idx('sugars')] === null) arr[idx('sugars')] = 0;
  }
  if (PLANT_GROUPS.has(f.group) || /^oil, (olive|canola|vegetable|sunflower|safflower|corn|peanut|sesame)/i.test(f.desc)) {
    if (arr[idx('cholesterol')] === null) arr[idx('cholesterol')] = 0;
    if (arr[idx('vitB12')] === null) arr[idx('vitB12')] = 0;
    if (arr[idx('vitD')] === null && !/mushroom/i.test(f.desc)) arr[idx('vitD')] = 0;
  }
}

const portions = new Map<number, [string, number][]>();
for (const [, fdc, , amount, , desc, modifier, grams] of csvRows('food_portion.csv')) {
  const label = (modifier || desc).replace(/\s+/g, ' ').trim();
  const amt = Number(amount) || 1;
  const g = Number(grams);
  if (!label || !(g > 0) || /yield from|ready-to-cook|Gerber|Heinz|Beech-Nut/i.test(label)) continue;
  const list = portions.get(Number(fdc)) ?? [];
  if (list.length < 8 && !list.some(([l]) => l === label)) list.push([label, round(g / amt)]);
  portions.set(Number(fdc), list);
}

// ---------------------------------------------------------------- choose which foods to keep
const EXCLUDE = new RegExp(
  [
    'babyfood', 'infant', 'formula', 'toddler', 'USDA Commodity', 'school lunch', 'industrial', 'food service',
    'military', '\\bNFS\\b', 'Alaska Native', 'Navajo', 'Hopi', 'Apache', 'Shoshone', 'Northern Plains', 'Pueblo',
    'Ojibwe', 'Cheyenne', 'variety meats', 'by-products', '\\bcomposite\\b', 'imported', '\\bchoice\\b', '\\bselect\\b',
    '\\bprime\\b', 'trimmed to 1/4', 'separable fat', 'Quality Control', 'not further specified',
  ].join('|'),
  'i',
);
const SKIP_GROUPS = new Set(['Baby Foods', 'American Indian/Alaska Native Foods', 'Quality Control Materials', 'Branded Food Products Database']);

/** How many foods to keep from each USDA group (the most generic, i.e. shortest-named, first). */
const QUOTA: Record<string, number> = {
  'Fruits and Fruit Juices': 220,
  'Vegetables and Vegetable Products': 330,
  'Dairy and Egg Products': 170,
  'Legumes and Legume Products': 120,
  'Nut and Seed Products': 80,
  'Cereal Grains and Pasta': 110,
  'Baked Products': 180,
  Snacks: 110,
  Sweets: 90,
  Beverages: 80,
  'Fats and Oils': 50,
  'Spices and Herbs': 55,
  'Soups, Sauces, and Gravies': 80,
  'Poultry Products': 70,
  'Finfish and Shellfish Products': 130,
  'Beef Products': 60,
  'Pork Products': 45,
  'Lamb, Veal, and Game Products': 20,
  'Sausages and Luncheon Meats': 45,
  'Breakfast Cereals': 70,
  'Fast Foods': 60,
  'Meals, Entrees, and Side Dishes': 40,
  'Restaurant Foods': 40,
  'Alcoholic Beverages': 20,
};

const recipeIds = new Set(Object.values(FOOD_KEYS).map((f) => f.id));
const keep = new Set<number>(recipeIds);
const byGroup = new Map<string, Raw[]>();
for (const f of foods.values()) {
  const v = values.get(f.id);
  if (!v || v[0] === null) continue; // no calories: useless for logging
  if (SKIP_GROUPS.has(f.group) || EXCLUDE.test(f.desc)) continue;
  // "with salt" cooked vegetables/beans duplicate the "without salt" versions
  if (/, with salt\b/i.test(f.desc) && /Vegetables|Legumes|Cereal Grains/.test(f.group)) continue;
  const list = byGroup.get(f.group) ?? [];
  list.push(f);
  byGroup.set(f.group, list);
}
const cleanName = (d: string) => d.replace(/\s*\(Includes foods for USDA's Food Distribution Program\)/i, '').trim();
for (const [group, list] of byGroup) {
  const quota = QUOTA[group] ?? 0;
  list.sort((a, b) => cleanName(a.desc).length - cleanName(b.desc).length || a.desc.localeCompare(b.desc));
  let n = 0;
  for (const f of list) {
    if (n >= quota) break;
    if (!keep.has(f.id)) { keep.add(f.id); n++; }
  }
}

// ---------------------------------------------------------------- write
function round(x: number): number {
  if (x === 0) return 0;
  const digits = Math.max(0, 3 - Math.ceil(Math.log10(Math.abs(x)))); // 3 significant figures
  return Number(x.toFixed(Math.min(digits, 4)));
}

const groups = [...new Set([...keep].map((id) => foods.get(id)!.group))].sort();
const out = [...keep]
  .map((id) => foods.get(id)!)
  .sort((a, b) => a.id - b.id)
  .map((f) => [
    f.id,
    cleanName(f.desc),
    groups.indexOf(f.group),
    values.get(f.id)!.map((v) => (v === null ? null : round(v))),
    portions.get(f.id) ?? [],
  ]);

const missing = [...recipeIds].filter((id) => !foods.has(id) || !values.get(id));
if (missing.length) {
  console.error('Recipe foods missing from the USDA files:', missing);
  process.exit(1);
}

const json = JSON.stringify({
  v: 1,
  source: 'USDA FoodData Central, SR Legacy (April 2018). Public domain.',
  nutrients: NUTRIENTS.map((n) => n.key),
  groups,
  foods: out,
});
const file = join(root, 'public/data/foods.json');
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, json);
const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;
console.log(`Kept ${out.length} foods (${recipeIds.size} used by recipes). foods.json: ${kb(statSync(file).size)}, gzipped about ${kb(gzipSync(json).length)}.`);
