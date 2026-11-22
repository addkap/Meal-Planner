import { describe, expect, it } from 'vitest';
import { BUILTIN_RECIPES } from '../data/recipes';
import { weekDates } from './dates';
import { buildPool, DEFAULT_RULES, explainPlacement, type PoolRecipe } from './pool';
import {
  ACTIVE_CAP, checkWeek, dayKcalFiber, fitPortions, generateWeek, isFixed, KCAL_TOLERANCE, rebalanceWeek, regenerateDay, regenerateWeek, swapMeal,
  type BatchInfo, type DaySetup, type PlanResult,
} from './planner';
import { planNutrition } from './planNutrition';
import { makeRng, randInt, type Rng } from './rng';
import { testDb } from './testDb';
import type { DayPlan, Effort, MealSlot, PlannedMeal, Recipe, RecipePref } from '../types';

const db = testDb();
const POOL = buildPool(BUILTIN_RECIPES, db);
const ctx = { pool: POOL, rules: DEFAULT_RULES };
const byId = new Map(POOL.map((p) => [p.id, p]));
const WEEK = '2026-11-23';

function randomSetups(rng: Rng): DaySetup[] {
  const efforts: Effort[] = ['easy', 'medium', 'long'];
  const kcal = randInt(rng, 14, 20) * 100; // 1400-2000
  const fiber = randInt(rng, 25, 35);
  return weekDates(WEEK).map((date) => ({
    date,
    effort: efforts[randInt(rng, 0, 2)],
    snack: rng() < 0.75,
    people: randInt(rng, 1, 4),
    kcalTarget: rng() < 0.2 ? kcal + randInt(rng, -2, 2) * 100 : kcal, // sometimes a per-day override
    fiberTarget: fiber,
  }));
}

/** Every rule the planner promises, for one generated week. */
function expectRulesHold(res: PlanResult, setups: DaySetup[], batches: BatchInfo[] = []) {
  const violations = checkWeek(res.days, { ...ctx, batches });
  // Anything that breaks a rule must be caused by her locked meals or batches, and must be shown to her.
  for (const v of violations) {
    expect(v.fixed, v.message).toBe(true);
    expect(res.warnings).toContain(v.message);
  }
  res.days.forEach((d, i) => {
    expect(d.date).toBe(setups[i].date);
    expect(d.meals.map((m) => m.slot)).toEqual(setups[i].snack ? ['breakfast', 'lunch', 'dinner', 'snack'] : ['breakfast', 'lunch', 'dinner']);
    for (const m of d.meals) {
      expect(m.portion).toBeGreaterThanOrEqual(0.75);
      expect(m.portion).toBeLessThanOrEqual(1.5);
      if (!isFixed(m)) expect(m.people).toBe(setups[i].people);
    }
    // calories within 5% and fiber met, or the day says why not
    const { kcal, fiber } = dayKcalFiber(d, POOL, batches);
    const kcalOk = Math.abs(kcal - d.kcalTarget) / d.kcalTarget <= KCAL_TOLERANCE;
    if (!kcalOk) expect((d.warnings ?? []).some((w) => w.includes('calories'))).toBe(true);
    if (fiber < d.fiberTarget) expect((d.warnings ?? []).some((w) => w.includes('fiber'))).toBe(true);
  });
}

describe('serving sizes', () => {
  it('finds the closest combination and prefers sizes near 1x', () => {
    const r = fitPortions([{ kcal: 400, fiber: 5, portions: [0.75, 1, 1.25, 1.5] }, { kcal: 600, fiber: 8, portions: [0.75, 1, 1.25, 1.5] }], 1000);
    expect(r.portions).toEqual([1, 1]);
    const up = fitPortions([{ kcal: 400, fiber: 5, portions: [0.75, 1, 1.25, 1.5] }, { kcal: 600, fiber: 8, portions: [0.75, 1, 1.25, 1.5] }], 1250);
    expect(Math.abs(up.kcal - 1250) / 1250).toBeLessThanOrEqual(0.05);
  });
  it('never goes outside the allowed sizes, even if the target is far away', () => {
    const r = fitPortions([{ kcal: 300, fiber: 5, portions: [0.75, 1, 1.25, 1.5] }], 3000);
    expect(r.portions).toEqual([1.5]);
  });
});

describe('100 random weeks without batches', () => {
  const results: { res: PlanResult; setups: DaySetup[] }[] = [];
  for (let i = 0; i < 100; i++) {
    const setups = randomSetups(makeRng(1000 + i));
    results.push({ res: generateWeek(setups, ctx, 1000 + i), setups });
  }
  it('follow every diet rule', () => {
    for (const { res, setups } of results) {
      expect(res.violations).toEqual([]);
      expectRulesHold(res, setups);
    }
  });
  it('hit the calorie and fiber targets on nearly every day', () => {
    const days = results.flatMap((r) => r.res.days);
    const missed = days.filter((d) => (d.warnings ?? []).length > 0).length;
    expect(missed / days.length).toBeLessThan(0.05);
  });
  it('vary from week to week', () => {
    const dinners = new Set(results.flatMap((r) => r.res.days.map((d) => d.meals.find((m) => m.slot === 'dinner')!.recipeId)));
    expect(dinners.size).toBeGreaterThan(40);
  });
  it('give the same plan for the same seed', () => {
    const setups = randomSetups(makeRng(5));
    expect(generateWeek(setups, ctx, 5).days).toEqual(generateWeek(setups, ctx, 5).days);
  });
});

/** Put a batch of a batch-friendly recipe into 2-6 random slots it suits. */
function randomBatch(rng: Rng, setups: DaySetup[], n: number, taken: Set<string>): { batch: BatchInfo; meals: { day: number; meal: PlannedMeal }[] } {
  const friendly = POOL.filter((p) => p.tags.has('batch-friendly'));
  const p = friendly[randInt(rng, 0, friendly.length - 1)];
  const batch: BatchInfo = { id: `batch-${n}`, recipeId: p.id, cookedOn: setups[randInt(rng, 0, 3)].date, cooked: rng() < 0.5 };
  const spots = setups.flatMap((d, day) => p.meals.filter((s) => s !== 'snack' || d.snack).map((slot) => ({ day, slot })));
  const want = randInt(rng, 2, 6);
  const meals: { day: number; meal: PlannedMeal }[] = [];
  for (const s of spots.sort(() => rng() - 0.5)) {
    if (meals.length >= want) break;
    const k = `${s.day}|${s.slot}`;
    if (taken.has(k)) continue;
    taken.add(k);
    meals.push({ day: s.day, meal: { slot: s.slot, recipeId: p.id, batchId: batch.id, portion: 1, people: 1 } });
  }
  return { batch, meals };
}

describe('100 random weeks with batches and locked meals', () => {
  const runs: { res: PlanResult; setups: DaySetup[]; batches: BatchInfo[]; fixed: PlannedMeal[][]; before: DayPlan[] }[] = [];
  for (let i = 0; i < 100; i++) {
    const rng = makeRng(5000 + i);
    const setups = randomSetups(rng);
    const before = generateWeek(setups, ctx, 5000 + i).days;
    // lock two meals she liked
    const taken = new Set<string>();
    const fixed: PlannedMeal[][] = setups.map(() => []);
    for (let k = 0; k < 2; k++) {
      const day = randInt(rng, 0, 6);
      const m = before[day].meals[randInt(rng, 0, before[day].meals.length - 1)];
      if (taken.has(`${day}|${m.slot}`)) continue;
      taken.add(`${day}|${m.slot}`);
      fixed[day].push({ ...m, locked: true });
    }
    // one or two batches
    const batches: BatchInfo[] = [];
    for (let b = 0; b < randInt(rng, 1, 2); b++) {
      const { batch, meals } = randomBatch(rng, setups, b, taken);
      batches.push(batch);
      for (const { day, meal } of meals) fixed[day].push(meal);
    }
    const withFixed = before.map((d, di) => ({
      ...d,
      meals: d.meals.map((m) => fixed[di].find((f) => f.slot === m.slot) ?? m),
    }));
    runs.push({ res: rebalanceWeek(withFixed, { ...ctx, batches }, 5000 + i), setups, batches, fixed, before });
  }

  it('follow every rule, except problems the batch itself causes, which are explained', () => {
    for (const { res, setups, batches } of runs) expectRulesHold(res, setups, batches);
  });
  it('keep every locked meal and every batch serving exactly where she put it', () => {
    for (const { res, fixed } of runs) {
      fixed.forEach((list, di) => {
        for (const f of list) {
          const m = res.days[di].meals.find((x) => x.slot === f.slot)!;
          expect(m.recipeId).toBe(f.recipeId);
          expect(m.batchId).toBe(f.batchId);
          expect(m.portion).toBe(f.portion);
        }
      });
    }
  });
  it('count the batch’s protein toward the weekly fish, poultry and red-meat rules', () => {
    for (const { res, batches } of runs) {
      const fish = res.days.flatMap((d) => d.meals).filter((m) => {
        const id = m.recipeId ?? batches.find((b) => b.id === m.batchId)?.recipeId;
        return byId.get(id!)?.cls === 'fish';
      }).length;
      if (!res.warnings.some((w) => w.startsWith('Fish'))) {
        expect(fish).toBeGreaterThanOrEqual(DEFAULT_RULES.fishMin);
        expect(fish).toBeLessThanOrEqual(DEFAULT_RULES.fishMax);
      }
    }
  });
  it('do not plan the batch recipe again as a separate meal', () => {
    for (const { res, batches } of runs) {
      for (const b of batches) {
        // (a meal she locked herself may happen to be the same recipe; that is her choice)
        const separate = res.days.flatMap((d) => d.meals).filter((m) => m.recipeId === b.recipeId && !m.batchId && !m.locked);
        expect(separate).toEqual([]);
      }
    }
  });
  it('change as little of the existing week as the rules allow', () => {
    let kept = 0;
    let total = 0;
    for (const { res, before, fixed } of runs) {
      before.forEach((d, di) => d.meals.forEach((m) => {
        if (fixed[di].some((f) => f.slot === m.slot)) return;
        total++;
        if (res.days[di].meals.find((x) => x.slot === m.slot)?.recipeId === m.recipeId) kept++;
      }));
    }
    expect(kept / total).toBeGreaterThan(0.5);
  });
});

describe('swap, regenerate and lock', () => {
  const setups = randomSetups(makeRng(42));
  const week = generateWeek(setups, ctx, 42).days;

  it('swaps one meal for a different recipe and leaves everything else alone', () => {
    const res = swapMeal(week, setups[2].date, 'dinner', ctx, 7);
    const before = week[2].meals.find((m) => m.slot === 'dinner')!;
    const after = res.days[2].meals.find((m) => m.slot === 'dinner')!;
    expect(after.recipeId).toBeDefined();
    expect(after.recipeId).not.toBe(before.recipeId);
    res.days.forEach((d, i) => d.meals.forEach((m) => {
      if (i === 2 && m.slot === 'dinner') return;
      expect(m).toEqual(week[i].meals.find((x) => x.slot === m.slot));
    }));
    expect(checkWeek(res.days, ctx).filter((v) => !v.fixed)).toEqual([]);
  });

  it('regenerates one day without touching the others, and keeps a locked meal on that day', () => {
    const locked = week.map((d, i) => (i === 3 ? { ...d, meals: d.meals.map((m) => (m.slot === 'lunch' ? { ...m, locked: true } : m)) } : d));
    const res = regenerateDay(locked, setups[3].date, ctx, 9);
    res.days.forEach((d, i) => {
      if (i !== 3) expect(d).toEqual({ ...locked[i], warnings: d.warnings });
    });
    expect(res.days[3].meals.find((m) => m.slot === 'lunch')).toEqual(locked[3].meals.find((m) => m.slot === 'lunch'));
    const changed = res.days[3].meals.filter((m) => m.slot !== 'lunch' && m.recipeId !== locked[3].meals.find((x) => x.slot === m.slot)?.recipeId);
    expect(changed.length).toBeGreaterThan(0);
    expect(checkWeek(res.days, ctx).filter((v) => !v.fixed)).toEqual([]);
  });

  it('regenerates the whole week around locked meals', () => {
    const locked = week.map((d, i) => (i === 0 ? { ...d, meals: d.meals.map((m) => (m.slot === 'dinner' ? { ...m, locked: true } : m)) } : d));
    const res = regenerateWeek(locked, ctx, 11);
    expect(res.days[0].meals.find((m) => m.slot === 'dinner')).toEqual(locked[0].meals.find((m) => m.slot === 'dinner'));
    const same = res.days.flatMap((d, i) => d.meals.filter((m) => !m.locked && m.recipeId === locked[i].meals.find((x) => x.slot === m.slot)?.recipeId)).length;
    expect(same).toBeLessThan(6); // mostly new recipes
    expect(res.violations.filter((v) => !v.fixed)).toEqual([]);
  });
});

describe('effort levels', () => {
  it('easy days get easy recipes and little hands-on time; long days can have long dinners', () => {
    let longDinners = 0;
    for (let i = 0; i < 20; i++) {
      const setups = weekDates(WEEK).map((date, j) => ({ date, effort: (j % 2 ? 'easy' : 'long') as Effort, snack: true, people: 3, kcalTarget: 1700, fiberTarget: 30 }));
      const res = generateWeek(setups, ctx, 300 + i);
      res.days.forEach((d) => {
        const active = d.meals.reduce((s, m) => s + byId.get(m.recipeId!)!.activeMin, 0);
        expect(active).toBeLessThanOrEqual(ACTIVE_CAP[d.effort]);
        if (d.effort === 'easy') for (const m of d.meals) expect(byId.get(m.recipeId!)!.effort).toBe('easy');
        else if (byId.get(d.meals.find((m) => m.slot === 'dinner')!.recipeId!)!.effort === 'long') longDinners++;
      });
    }
    expect(longDinners).toBeGreaterThan(20);
  });
  it('counts cooking a batch as cooking on that day', () => {
    const setups = weekDates(WEEK).map((date) => ({ date, effort: 'medium' as Effort, snack: true, people: 3, kcalTarget: 1700, fiberTarget: 30 }));
    const stew = POOL.find((p) => p.id === 'd-beef-mushroom-and-barley-stew')!;
    const batches: BatchInfo[] = [{ id: 'b1', recipeId: stew.id, cookedOn: setups[0].date, cooked: false }];
    const fixed = setups.map((_, i) => (i === 2 ? [{ slot: 'dinner' as MealSlot, recipeId: stew.id, batchId: 'b1', portion: 1, people: 1 }] : []));
    for (let seed = 0; seed < 10; seed++) {
      const res = generateWeek(setups, { ...ctx, batches }, seed, fixed);
      // the stew takes 25 hands-on minutes on Monday, so Monday's meals get only the rest of the 75
      const monday = res.days[0].meals.reduce((s, m) => s + byId.get(m.recipeId!)!.activeMin, 0);
      expect(monday + stew.activeMin).toBeLessThanOrEqual(ACTIVE_CAP.medium);
      // and eating it on Wednesday takes no cooking time
      expect(res.days[2].meals.find((m) => m.slot === 'dinner')!.batchId).toBe('b1');
    }
  });
  it('fills an over-full day with quick recipes and explains why it runs long', () => {
    const setups = weekDates(WEEK).map((date) => ({ date, effort: 'easy' as Effort, snack: true, people: 3, kcalTarget: 1700, fiberTarget: 30 }));
    const stew = POOL.find((p) => p.id === 'd-beef-mushroom-and-barley-stew')!; // 25 active minutes
    const curry = POOL.find((p) => p.id === 'd-chickpea-and-cauliflower-curry')!; // 20 active minutes
    const batches: BatchInfo[] = [{ id: 'b1', recipeId: stew.id, cookedOn: setups[0].date, cooked: false }, { id: 'b2', recipeId: curry.id, cookedOn: setups[0].date, cooked: false }];
    const fixed = setups.map((_, i) => (i === 3 ? [{ slot: 'dinner' as MealSlot, recipeId: stew.id, batchId: 'b1', portion: 1, people: 1 }] : i === 5 ? [{ slot: 'dinner' as MealSlot, recipeId: curry.id, batchId: 'b2', portion: 1, people: 1 }] : []));
    const res = generateWeek(setups, { ...ctx, batches }, 4, fixed);
    expect(res.days[0].meals.every((m) => m.recipeId)).toBe(true);
    expect(res.warnings.some((w) => w.includes('hands-on cooking'))).toBe(true);
    expectRulesHold(res, setups, batches);
  });
});

describe('her preferences', () => {
  const setupsFor = (i: number) => randomSetups(makeRng(9000 + i));
  const countIn = (pool: PoolRecipe[], id: string, weeks = 60) => {
    let n = 0;
    for (let i = 0; i < weeks; i++) {
      const res = generateWeek(setupsFor(i), { pool, rules: DEFAULT_RULES }, 9000 + i);
      n += res.days.flatMap((d) => d.meals).filter((m) => m.recipeId === id).length;
    }
    return n;
  };
  const target = 'l-greek-lentil-salad';
  const withPref = (pref: Partial<RecipePref>) => buildPool(BUILTIN_RECIPES, db, new Map([[target, { id: target, updatedAt: 1, ...pref }]]));

  it('"Don\'t use again" removes a recipe completely', () => {
    expect(countIn(withPref({ feedback: 'never' }), target)).toBe(0);
  });
  it('"Use more" picks it more often than normal, and "Use less" less often', () => {
    const normal = countIn(POOL, target);
    const more = countIn(withPref({ feedback: 'more' }), target);
    const less = countIn(withPref({ feedback: 'less' }), target);
    expect(more).toBeGreaterThan(normal * 1.3);
    expect(less).toBeLessThan(normal * 0.8);
  });
  it('her own recipes get a boost, and favorites a bigger one', () => {
    const mine = buildPool(BUILTIN_RECIPES, db, new Map(), new Set([target]));
    const fav = buildPool(BUILTIN_RECIPES, db, new Map([[target, { id: target, updatedAt: 1, favorite: true }]]), new Set([target]));
    expect(mine.find((p) => p.id === target)!.weight).toBe(1.5);
    expect(fav.find((p) => p.id === target)!.weight).toBe(1.5 * 2.5);
  });
  it('a dessert of hers is used only now and then as a snack, and the app says why', () => {
    const cookies: Recipe = {
      id: 'mine-cookies', name: 'Grandma’s Chocolate Chip Cookies', meal: 'snack', servings: 12, activeMin: 15, totalMin: 30, effort: 'medium', protein: 'none', tags: [], steps: ['Bake.'],
      ingredients: [
        { food: 'key:ww_flour', qty: 2, unit: 'cup' }, { food: 'key:butter', qty: 0.5, unit: 'cup' }, { food: 'key:sugar', qty: 0.75, unit: 'cup' },
        { food: 'key:dark_chocolate', qty: 4, unit: 'oz' }, { food: 'key:egg', qty: 1, unit: 'large' },
      ],
    };
    const pool = buildPool([...BUILTIN_RECIPES, cookies], db, new Map(), new Set([cookies.id]));
    const p = pool.find((x) => x.id === cookies.id)!;
    expect(p.treat).toBe(true);
    expect(explainPlacement(p).join(' ')).toMatch(/added sugar/);
    expect(explainPlacement(p).join(' ')).toMatch(/butter/);
    let weeksWithCookies = 0;
    for (let i = 0; i < 30; i++) {
      const res = generateWeek(randomSetups(makeRng(700 + i)), { pool, rules: DEFAULT_RULES }, 700 + i);
      const uses = res.days.flatMap((d) => d.meals).filter((m) => m.recipeId === cookies.id);
      expect(uses.length).toBeLessThanOrEqual(1);
      for (const u of uses) expect(u.slot).toBe('snack');
      if (uses.length) weeksWithCookies++;
    }
    expect(weeksWithCookies).toBeGreaterThan(0);
  });
  it('a lunch of hers without vegetables is explained, not silently dropped', () => {
    const plain: Recipe = { id: 'mine-pb', name: 'PB sandwich', meal: 'lunch', servings: 1, activeMin: 3, totalMin: 3, effort: 'easy', protein: 'nuts', tags: [], steps: ['Make.'], ingredients: [{ food: 'key:ww_bread', qty: 2, unit: 'slice' }, { food: 'key:peanut_butter', qty: 2, unit: 'tbsp' }] };
    const p = buildPool([plain], db)[0];
    expect(explainPlacement(p)[0]).toMatch(/vegetables/);
  });
});

describe('nutrition review of a plan', () => {
  it('adds up each day and averages the week', () => {
    const setups = randomSetups(makeRng(77));
    const res = generateWeek(setups, ctx, 77);
    const n = planNutrition(res.days, POOL);
    expect(n.days).toHaveLength(7);
    n.days.forEach((d, i) => expect(d.totals.kcal.amount).toBeCloseTo(dayKcalFiber(res.days[i], POOL).kcal, 6));
    const avg = n.days.reduce((s, d) => s + d.totals.kcal.amount, 0) / 7;
    expect(n.weeklyAverage.kcal.amount).toBeCloseTo(avg, 6);
  });
});
