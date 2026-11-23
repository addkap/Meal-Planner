// Everything the screens share: the food database, all recipes (built-in and hers), the planner's recipe
// pool with her preferences applied, and her settings. Re-computed automatically when the data changes.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { BUILTIN_RECIPES } from './data/recipes';
import { DEFAULT_SETTINGS } from './lib/defaults';
import { loadFoodDb, type FoodDb } from './lib/foodDb';
import { buildPool, type PoolRecipe } from './lib/pool';
import type { BatchInfo } from './lib/planner';
import type { Batch, Recipe, RecipePref, Settings } from './types';
import { normalizeAge } from './lib/dri';
import { combineRecipes } from './lib/myRecipes';

export interface AppData {
  foods: FoodDb;
  settings: Settings;
  recipes: Map<string, Recipe>;
  pool: PoolRecipe[];
  poolById: Map<string, PoolRecipe>;
  prefs: Map<string, RecipePref>;
  batches: Batch[];
  batchInfo: BatchInfo[];
  /** Ids of her own recipes (listed under "My recipes"; batch-only ones are not). */
  myIds: Set<string>;
  /** Recipes typed in only for a batch, or deleted: not listed and never planned. */
  hiddenIds: Set<string>;
  /** Built-in recipes she has changed (her version is used everywhere until she undoes it). */
  changedIds: Set<string>;
}

const Ctx = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppData outside AppDataProvider');
  return v;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [foods, setFoods] = useState<FoodDb | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    loadFoodDb().then(setFoods, (e: Error) => setError(e.message));
  }, []);

  const settingsRow = useLiveQuery(() => db.settings.get('settings'), []);
  const prefList = useLiveQuery(() => db.prefs.toArray(), []);
  const mine = useLiveQuery(() => db.myRecipes.toArray(), []);
  const customFoods = useLiveQuery(() => db.customFoods.toArray(), []);
  const batches = useLiveQuery(() => db.batches.toArray(), []);

  const value = useMemo<AppData | null>(() => {
    if (!foods || !prefList || !mine || !customFoods || !batches) return null;
    foods.setCustomFoods(customFoods);
    const settings: Settings = settingsRow ? { ...DEFAULT_SETTINGS, ...settingsRow, age: normalizeAge(settingsRow.age), rules: { ...DEFAULT_SETTINGS.rules, ...settingsRow.rules } } : DEFAULT_SETTINGS;
    const prefs = new Map(prefList.filter((p) => !p.deletedAt).map((p) => [p.id, p]));
    // Deleted and batch-only recipes of hers stay in the pool (planned batch meals and past days need their
    // nutrition) but are never listed or picked by the planner. Changed built-ins replace the original.
    const { everything, myIds, hiddenIds, changedIds } = combineRecipes(BUILTIN_RECIPES, mine);
    const pool = buildPool(everything, foods, prefs, myIds).map((p) => (hiddenIds.has(p.id) ? { ...p, weight: 0 } : p));
    const liveBatches = batches.filter((b) => !b.deletedAt);
    return {
      foods,
      settings,
      recipes: new Map(everything.map((r) => [r.id, r])),
      pool,
      poolById: new Map(pool.map((p) => [p.id, p])),
      prefs,
      batches: liveBatches,
      batchInfo: liveBatches.map((b) => ({ id: b.id, recipeId: b.recipeId, cookedOn: b.cookedOn, cooked: b.cooked })),
      myIds,
      hiddenIds,
      changedIds,
    };
  }, [foods, settingsRow, prefList, mine, customFoods, batches]);

  if (error) return <main className="page"><p className="error">{error} Check the connection and reopen the app.</p></main>;
  if (!value) return <main className="page"><p className="muted">Loading…</p></main>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
