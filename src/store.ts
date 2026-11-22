// Database actions the screens call. The pure logic lives in src/lib.
import { db } from './db';
import { DEFAULT_SETTINGS } from './lib/defaults';
import { newId } from './lib/ids';
import type { Feedback, GroceryMark, RecipePref, Settings, Store, WeekPlan } from './types';

const now = () => Date.now();

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('settings');
  return s ? { ...DEFAULT_SETTINGS, ...s, rules: { ...DEFAULT_SETTINGS.rules, ...s.rules } } : DEFAULT_SETTINGS;
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const cur = await getSettings();
  await db.settings.put({ ...cur, ...patch, id: 'settings', updatedAt: now() });
}

export async function savePlan(plan: Omit<WeekPlan, 'updatedAt'>): Promise<void> {
  await db.plans.put({ ...plan, updatedAt: now() });
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
