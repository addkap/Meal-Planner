import 'fake-indexeddb/auto'; // first: gives Dexie an in-memory IndexedDB
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { getSettings, repairPlanDates, savePlan } from './store';
import { addDays, weekDates, weekStartOf } from './lib/dates';
import { AGE_RANGES, dailyTargets, normalizeAge } from './lib/dri';
import type { DayPlan } from './types';

const day = (date: string): DayPlan => ({ date, effort: 'medium', snack: true, people: 2, kcalTarget: 1800, fiberTarget: 30, meals: [] });

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('week dates', () => {
  it('every week of November and December 2026 runs Monday to Sunday with its own dates', () => {
    for (let w = '2026-11-02'; w <= '2026-12-28'; w = addDays(w, 7)) {
      const dates = weekDates(w);
      expect(dates[0]).toBe(w);
      expect(dates[6]).toBe(addDays(w, 6));
      for (const d of dates) expect(weekStartOf(d)).toBe(w);
    }
    expect(weekDates('2026-11-30')).toEqual(['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06']);
  });
});

describe('repairPlanDates', () => {
  it("re-dates a plan saved with another week's days and leaves good plans alone", async () => {
    // The bug: the week of Nov 30 was saved with the days of Nov 16-22.
    await savePlan({ id: '2026-11-30', weekStart: '2026-11-30', days: weekDates('2026-11-16').map(day), finalized: false, seed: 1 });
    await savePlan({ id: '2026-11-23', weekStart: '2026-11-23', days: weekDates('2026-11-23').map(day), finalized: false, seed: 2 });
    const goodBefore = await db.plans.get('2026-11-23');

    expect(await repairPlanDates()).toBe(1);
    expect((await db.plans.get('2026-11-30'))!.days.map((d) => d.date)).toEqual(weekDates('2026-11-30'));
    expect(await db.plans.get('2026-11-23')).toEqual(goodBefore);
    expect(await repairPlanDates()).toBe(0);
  });
});

describe('age ranges', () => {
  it('are 10-year steps', () => {
    expect(AGE_RANGES).toEqual(['19-30', '31-40', '41-50', '51-60', '61-70', '71-80', '81+']);
  });

  it('old 20-year settings map to a range with the same nutrient targets', () => {
    for (const [old, now] of [['31-50', '41-50'], ['51-70', '51-60'], ['71+', '71-80']] as const) {
      expect(normalizeAge(old)).toBe(now);
      expect(dailyTargets('female', old as never, 1800, 30)).toEqual(dailyTargets('female', now, 1800, 30));
    }
    expect(normalizeAge(undefined)).toBe('51-60');
  });

  it('targets change where the guidelines change: iron at 51, calcium and vitamin D at 71', () => {
    const t = (age: (typeof AGE_RANGES)[number]) => dailyTargets('female', age, 1800, 30);
    expect(t('41-50').iron.amount).toBe(18);
    expect(t('51-60').iron.amount).toBe(8);
    expect(t('51-60').calcium.amount).toBe(1200);
    expect(t('61-70').vitD.amount).toBe(15);
    expect(t('71-80').vitD.amount).toBe(20);
    expect(t('81+').vitD.amount).toBe(20);
  });

  it('settings saved by an earlier version read back with a new range', async () => {
    await db.settings.put({ ...(await getSettings()), id: 'settings', updatedAt: 1, age: '51-70' as never });
    expect((await getSettings()).age).toBe('51-60');
  });
});
