// Database actions the screens call. The pure logic lives in src/lib.
import { db } from './db';
import { DEFAULT_SETTINGS } from './lib/defaults';
import type { Feedback, RecipePref, Settings, WeekPlan } from './types';

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
