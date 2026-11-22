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

export interface AppData {
  foods: FoodDb;
  settings: Settings;
  recipes: Map<string, Recipe>;
  pool: PoolRecipe[];
  poolById: Map<string, PoolRecipe>;
  prefs: Map<string, RecipePref>;
  batches: Batch[];
  batchInfo: BatchInfo[];
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
    const settings: Settings = settingsRow ? { ...DEFAULT_SETTINGS, ...settingsRow, rules: { ...DEFAULT_SETTINGS.rules, ...settingsRow.rules } } : DEFAULT_SETTINGS;
    const myLive = mine.filter((r) => !r.deletedAt);
    const all: Recipe[] = [...BUILTIN_RECIPES, ...myLive];
    const prefs = new Map(prefList.filter((p) => !p.deletedAt).map((p) => [p.id, p]));
    const pool = buildPool(all, foods, prefs, new Set(myLive.map((r) => r.id)));
    const liveBatches = batches.filter((b) => !b.deletedAt);
    return {
      foods,
      settings,
      recipes: new Map(all.map((r) => [r.id, r])),
      pool,
      poolById: new Map(pool.map((p) => [p.id, p])),
      prefs,
      batches: liveBatches,
      batchInfo: liveBatches.map((b) => ({ id: b.id, recipeId: b.recipeId, cookedOn: b.cookedOn, cooked: b.cooked })),
    };
  }, [foods, settingsRow, prefList, mine, customFoods, batches]);

  if (error) return <main className="page"><p className="error">{error} Check the connection and reopen the app.</p></main>;
  if (!value) return <main className="page"><p className="muted">Loading…</p></main>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
