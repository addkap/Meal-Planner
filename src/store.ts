// Database actions the screens call. The pure logic lives in src/lib.
import { db } from './db';
import { DEFAULT_SETTINGS } from './lib/defaults';
import { newId } from './lib/ids';
import type { Batch, CustomFood, Feedback, GroceryMark, LogEntry, MyRecipe, PlannedMeal, RecipePref, Settings, Store, WeekPlan } from './types';
import { addDays } from './lib/dates';
import { normalizeAge } from './lib/dri';

const now = () => Date.now();

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('settings');
  return s ? { ...DEFAULT_SETTINGS, ...s, age: normalizeAge(s.age), rules: { ...DEFAULT_SETTINGS.rules, ...s.rules } } : DEFAULT_SETTINGS;
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const cur = await getSettings();
  await db.settings.put({ ...cur, ...patch, id: 'settings', updatedAt: now() });
}

export async function savePlan(plan: Omit<WeekPlan, 'updatedAt'>): Promise<void> {
  await db.plans.put({ ...plan, updatedAt: now() });
}

/**
 * Repairs plans whose days carry another week's dates (an earlier bug: the setup screen kept the first week's
 * dates after moving to a different week). Days are re-dated in order; returns how many plans were fixed.
 */
export async function repairPlanDates(): Promise<number> {
  const bad = (await db.plans.toArray()).filter((p) => !p.deletedAt && p.days.some((d, i) => d.date !== addDays(p.weekStart, i)));
  for (const p of bad) await db.plans.put({ ...p, days: p.days.map((d, i) => ({ ...d, date: addDays(p.weekStart, i) })), updatedAt: now() });
  return bad.length;
}

export async function deletePlan(weekStart: string): Promise<void> {
  const p = await db.plans.get(weekStart);
  if (p) await db.plans.put({ ...p, deletedAt: now(), updatedAt: now() });
}

async function putPref(id: string, patch: Partial<RecipePref>): Promise<void> {
  const cur = (await db.prefs.get(id)) ?? { id, updatedAt: 0 };
  const next: RecipePref = { ...cur, ...patch, id, updatedAt: now() };
  delete next.deletedAt;
  await db.prefs.put(next);
}

/** "Use more" / "Use less" / "Don't use again"; null clears it (undo). */
export const setFeedback = (id: string, feedback: Feedback | null) => putPref(id, { feedback: feedback ?? undefined });
export const setFavorite = (id: string, favorite: boolean) => putPref(id, { favorite });

// ---------------------------------------------------------------- groceries


export async function addStore(name: string): Promise<void> {
  const all = (await db.stores.toArray()).filter((s) => !s.deletedAt);
  const store: Store = { id: newId(), updatedAt: now(), name: name.trim(), order: all.length ? Math.max(...all.map((s) => s.order)) + 1 : 0 };
  await db.stores.put(store);
}

export async function renameStore(id: string, name: string): Promise<void> {
  const s = await db.stores.get(id);
  if (s) await db.stores.put({ ...s, name: name.trim(), updatedAt: now() });
}

/** Removing a store sends its items back to "Unassigned" (the assignments point at a store that is gone). */
export async function removeStore(id: string): Promise<void> {
  const s = await db.stores.get(id);
  if (s) await db.stores.put({ ...s, deletedAt: now(), updatedAt: now() });
}

/** Always buy this item at this store (or ANY_STORE). */
export async function assignStore(itemKey: string, storeId: string): Promise<void> {
  await db.storeAssignments.put({ id: itemKey, storeId, updatedAt: now() });
}

/** Checked, "I already have this", or a one-week store change, for one item in one week. */
export async function setMark(weekStart: string, itemKey: string, patch: Partial<Pick<GroceryMark, 'checked' | 'have' | 'storeOverride'>>): Promise<void> {
  const id = `${weekStart}|${itemKey}`;
  const cur = (await db.groceryMarks.get(id)) ?? { id, weekStart, itemKey, updatedAt: 0 };
  const next: GroceryMark = { ...cur, ...patch, updatedAt: now() };
  delete next.deletedAt;
  await db.groceryMarks.put(next);
}

// ---------------------------------------------------------------- daily log

/**
 * The log entry for "I ate this" on a planned meal. It names the exact meal (recipe, batch or her own), so if the
 * plan changes after she checked a meal off, the old entry stays as what she really ate and the new meal is unchecked.
 */
export const plannedEntryId = (date: string, meal: Pick<PlannedMeal, 'slot' | 'recipeId' | 'batchId' | 'custom'>) =>
  `${date}|${meal.slot}|planned|${meal.batchId ?? meal.recipeId ?? `own:${meal.custom?.name ?? ''}`}`;

/** Check off (qty = servings eaten) or un-check (null) a planned meal. */
export async function setPlannedEaten(date: string, meal: PlannedMeal, label: string, qty: number | null): Promise<void> {
  const id = plannedEntryId(date, meal);
  const cur = await db.logs.get(id);
  if (qty === null) {
    if (cur) await db.logs.put({ ...cur, deletedAt: now(), updatedAt: now() });
    return;
  }
  const entry: LogEntry = {
    id,
    updatedAt: now(),
    date,
    slot: meal.slot,
    kind: meal.batchId ? 'batch' : 'planned',
    recipeId: meal.recipeId,
    batchId: meal.batchId,
    custom: meal.custom,
    qty,
    label,
  };
  await db.logs.put(entry);
}

export async function addLog(e: Omit<LogEntry, 'id' | 'updatedAt'>): Promise<void> {
  await db.logs.put({ ...e, id: newId(), updatedAt: now() });
}

export async function updateLog(id: string, patch: Partial<LogEntry>): Promise<void> {
  const cur = await db.logs.get(id);
  if (cur) await db.logs.put({ ...cur, ...patch, id, updatedAt: now() });
}

export async function removeLog(id: string): Promise<void> {
  const cur = await db.logs.get(id);
  if (cur) await db.logs.put({ ...cur, deletedAt: now(), updatedAt: now() });
}

/** Save a food she typed in or scanned (new or corrected). */
export async function saveCustomFood(f: CustomFood): Promise<void> {
  const next = { ...f, updatedAt: now() };
  delete next.deletedAt;
  await db.customFoods.put(next);
}

export async function findFoodByBarcode(barcode: string): Promise<CustomFood | undefined> {
  return (await db.customFoods.where('barcode').equals(barcode).toArray()).find((f) => !f.deletedAt);
}

/** Calorie and fiber targets for one day only; null goes back to the usual targets. */
export async function setDayTargets(date: string, t: { kcal?: number; fiber?: number } | null): Promise<void> {
  if (t === null) {
    const cur = await db.dayTargets.get(date);
    if (cur) await db.dayTargets.put({ ...cur, kcal: undefined, fiber: undefined, deletedAt: now(), updatedAt: now() });
    return;
  }
  await db.dayTargets.put({ id: date, ...t, updatedAt: now() });
}

// ---------------------------------------------------------------- batches and her recipes

export async function saveBatch(b: Omit<Batch, 'updatedAt'>): Promise<void> {
  const next: Batch = { ...b, updatedAt: now() };
  delete next.deletedAt;
  await db.batches.put(next);
}

export async function updateBatch(id: string, patch: Partial<Batch>): Promise<void> {
  const cur = await db.batches.get(id);
  if (cur) await db.batches.put({ ...cur, ...patch, id, updatedAt: now() });
}

export async function saveMyRecipe(r: MyRecipe): Promise<void> {
  const next = { ...r, updatedAt: now() };
  delete next.deletedAt;
  await db.myRecipes.put(next);
}

export async function deleteMyRecipe(id: string): Promise<void> {
  const cur = await db.myRecipes.get(id);
  if (cur) await db.myRecipes.put({ ...cur, deletedAt: now(), updatedAt: now() });
}
