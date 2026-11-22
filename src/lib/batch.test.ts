import { describe, expect, it } from 'vitest';
import { BUILTIN_RECIPES } from '../data/recipes';
import { batchStatus, batchWarning, fittingSlots, placeBatch, statusText, suggestSlots } from './batch';
import { weekDates } from './dates';
import { buildGroceryList } from './grocery';
import { buildPool, DEFAULT_RULES } from './pool';
import { checkWeek, generateWeek, rebalanceWeek } from './planner';
import { testDb } from './testDb';
import type { Batch, LogEntry, WeekPlan } from '../types';

const foods = testDb();
const pool = buildPool(BUILTIN_RECIPES, foods);
const recipes = new Map(BUILTIN_RECIPES.map((r) => [r.id, r]));
const bites = pool.find((p) => p.id === 'b-spinach-and-feta-egg-bites')!; // breakfast, also a snack
const W = '2026-11-23';
const setups = weekDates(W).map((date, i) => ({ date, effort: 'medium' as const, snack: i !== 2, people: 3, kcalTarget: 1700, fiberTarget: 28 }));
const week = generateWeek(setups, { pool, rules: DEFAULT_RULES }, 99).days;
const batch: Batch = { id: 'b1', updatedAt: 1, recipeId: bites.id, servingsMade: 12, frozen: 2, cookedOn: W, cooked: true };
const plan = (days = week): WeekPlan => ({ id: W, updatedAt: 1, weekStart: W, days, finalized: true, seed: 1 });
let n = 0;
const ate = (date: string, slot: LogEntry['slot'], qty = 1, deleted = false): LogEntry => ({ id: `l${n++}`, updatedAt: 1, date, slot, kind: 'batch', batchId: 'b1', qty, label: 'Egg bites', deletedAt: deleted ? 5 : undefined });

describe('servings left', () => {
  it('counts made minus frozen minus eaten', () => {
    const s = batchStatus(batch, [ate(W, 'breakfast'), ate('2026-11-24', 'snack', 0.5)], [], W);
    expect(s).toMatchObject({ made: 12, frozen: 2, eaten: 1.5, left: 8.5 });
    expect(statusText(s)).toBe('8.5 of 12 left · 2 in the freezer');
  });
  it('un-checking a meal (a removed log entry) gives the serving back', () => {
    expect(batchStatus(batch, [ate(W, 'breakfast', 1, true)], [], W).left).toBe(10);
  });
  it('leftovers stay available after the week ends', () => {
    const s = batchStatus(batch, [ate(W, 'breakfast')], [plan()], '2026-12-01'); // the next week
    expect(s.left).toBe(9);
    expect(s.plannedAhead).toBe(0);
  });
  it('warns when more meals are planned than servings are left, and when only one is left', () => {
    const placed = placeBatch(week, { ...batch, servingsMade: 3, frozen: 1 }, weekDates(W).slice(0, 4).map((date) => ({ date, slot: 'breakfast' as const })));
    const s = batchStatus({ ...batch, servingsMade: 3, frozen: 1 }, [], [plan(placed)], W);
    expect(s).toMatchObject({ left: 2, plannedAhead: 4, short: 2 });
    expect(batchWarning('Egg bites', s)).toBe('Egg bites: 4 meals are planned but only 2 servings are left (take some out of the freezer?).');
    const one = batchStatus({ ...batch, servingsMade: 2, frozen: 0 }, [ate(W, 'breakfast')], [], W);
    expect(batchWarning('Egg bites', one)).toBe('Egg bites: only 1 serving left.');
    expect(batchWarning('Egg bites', batchStatus(batch, [], [], W))).toBeNull();
  });
  it('a planned batch meal she already checked off is not counted twice', () => {
    const placed = placeBatch(week, batch, [{ date: W, slot: 'breakfast' }, { date: '2026-11-24', slot: 'breakfast' }]);
    const s = batchStatus(batch, [ate(W, 'breakfast')], [plan(placed)], W);
    expect(s).toMatchObject({ eaten: 1, left: 9, plannedAhead: 1 });
  });
});

describe('where the servings could go', () => {
  it('only meals the recipe suits, from the day it was cooked, and snacks only on snack days', () => {
    const slots = fittingSlots(bites, week, '2026-11-24');
    expect(slots.every((s) => s.slot === 'breakfast' || s.slot === 'snack')).toBe(true);
    expect(slots.every((s) => s.date >= '2026-11-24')).toBe(true);
    expect(slots.some((s) => s.date === '2026-11-25' && s.slot === 'snack')).toBe(false); // snack off that day
    expect(slots[0].slot).toBe('breakfast'); // its own meal type first
  });
  it('suggests a few of its own meal type to start, or fills every fitting meal spread over the days', () => {
    expect(suggestSlots(bites, week, W, 10).map((s) => s.slot)).toEqual(['breakfast', 'breakfast', 'breakfast', 'breakfast']);
    const all = suggestSlots(bites, week, W, 10, true);
    expect(all).toHaveLength(10);
    expect(new Set(all.map((s) => s.date)).size).toBe(7); // every day before doubling up
    expect(suggestSlots(bites, week, W, 2, true)).toHaveLength(2); // never more than the servings she has
  });
  it('skips meals she is keeping and meals she typed in', () => {
    const kept = week.map((d, i) => (i === 0 ? { ...d, meals: d.meals.map((m) => (m.slot === 'breakfast' ? { ...m, locked: true } : m)) } : d));
    expect(fittingSlots(bites, kept, W).some((s) => s.date === W && s.slot === 'breakfast')).toBe(false);
  });
});

describe('re-balancing the week around a batch', () => {
  const slots = suggestSlots(bites, week, W, 10, true);
  const placed = placeBatch(week, batch, slots);
  const res = rebalanceWeek(placed, { pool, rules: DEFAULT_RULES, batches: [batch] }, 5);

  it('the batch servings take over exactly the chosen meals', () => {
    for (const s of slots) {
      const m = res.days.find((d) => d.date === s.date)!.meals.find((x) => x.slot === s.slot)!;
      expect(m).toMatchObject({ batchId: 'b1', recipeId: bites.id, portion: 1 });
    }
    const batchMeals = res.days.flatMap((d) => d.meals).filter((m) => m.batchId === 'b1');
    expect(batchMeals).toHaveLength(10);
  });
  it('every rule still holds (or the batch itself is the reason, and she is told)', () => {
    for (const v of checkWeek(res.days, { pool, rules: DEFAULT_RULES, batches: [batch] })) {
      expect(v.fixed, v.message).toBe(true);
      expect(res.warnings).toContain(v.message);
    }
  });
  it('the egg bites count toward the week’s egg limit (10 egg meals is more than 4, so she is told)', () => {
    expect(res.warnings.some((w) => /egg-based meals/.test(w))).toBe(true);
    // and no other egg recipe was added on top
    const otherEggs = res.days.flatMap((d) => d.meals).filter((m) => !m.batchId && pool.find((p) => p.id === m.recipeId)?.eggs);
    expect(otherEggs).toEqual([]);
  });
  it('taking servings back out frees those meals for the planner', () => {
    const fewer = placeBatch(res.days, batch, slots.slice(0, 3));
    const again = rebalanceWeek(fewer, { pool, rules: DEFAULT_RULES, batches: [batch] }, 6);
    expect(again.days.flatMap((d) => d.meals).filter((m) => m.batchId === 'b1')).toHaveLength(3);
    expect(again.days.flatMap((d) => d.meals).every((m) => m.recipeId || m.custom)).toBe(true); // nothing left empty
  });
  it('groceries: a cooked batch adds nothing, a planned one adds the whole batch', () => {
    const cooked = buildGroceryList(res.days, recipes, foods, [batch]);
    const planned = buildGroceryList(res.days, recipes, foods, [{ ...batch, cooked: false }]);
    const eggsCooked = cooked.find((i) => i.key === 'key:egg')?.grams ?? 0;
    const eggsPlanned = planned.find((i) => i.key === 'key:egg')?.grams ?? 0;
    expect(eggsPlanned - eggsCooked).toBeCloseTo(10 * 50 * (12 / 4), 0); // 10 eggs per 4 servings, batch of 12
  });
});
