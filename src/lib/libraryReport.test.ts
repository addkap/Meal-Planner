// Not a real test: prints every recipe's per-serving numbers when REPORT=1 (used while writing recipes).
import { it } from 'vitest';
import { BUILTIN_RECIPES } from '../data/recipes';
import { recipeNutrition, resolveIngredients, dietProfile, dietTags } from './recipes';
import { testDb } from './testDb';

it.runIf(process.env.REPORT)('library report', () => {
  const db = testDb();
  for (const r of BUILTIN_RECIPES) {
    const n = recipeNutrition(r, db).perServing;
    const bad = resolveIngredients(r, db).filter((x) => x.grams === null).map((x) => `${x.ing.qty} ${x.ing.unit} ${x.ing.food} [${x.food?.portions.map((p) => p.unit + '=' + p.g).join(' ')}]`);
    const p = dietProfile(r, db);
    process.stdout.write(`${r.meal.padEnd(9)} ${Math.round(n.kcal.amount).toString().padStart(4)} kcal ${n.protein.amount.toFixed(0).padStart(3)}p ${n.fiber.amount.toFixed(1).padStart(4)}fib ${n.sodium.amount.toFixed(0).padStart(5)}Na veg${p.veg.toFixed(0)} | ${r.name} [${dietTags(p).join(',')}] ${bad.length ? 'UNRESOLVED: ' + bad.join('; ') : ''}\n`);
  }
});

it.runIf(process.env.DEBUG_RECIPE)('ingredient grams', () => {
  const db = testDb();
  const want = process.env.DEBUG_RECIPE!.toLowerCase().split('|');
  for (const r of BUILTIN_RECIPES.filter((x) => want.some((w) => x.name.toLowerCase().includes(w)))) {
    process.stdout.write(`\n## ${r.name} (serves ${r.servings})\n`);
    for (const x of resolveIngredients(r, db)) {
      const kcal = x.food && x.grams !== null ? ((x.food.per100g.kcal ?? 0) * x.grams) / 100 : NaN;
      process.stdout.write(`  ${x.ing.qty} ${x.ing.unit} ${x.ing.food} -> ${x.grams?.toFixed(0)} g, ${kcal.toFixed(0)} kcal, Na ${x.food && x.grams !== null ? (((x.food.per100g.sodium ?? 0) * x.grams) / 100).toFixed(0) : '?'}\n`);
    }
  }
});
