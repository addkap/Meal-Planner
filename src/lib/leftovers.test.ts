import { describe, expect, it } from 'vitest';
import { BUILTIN_RECIPES } from '../data/recipes';
import { addDays, weekDates } from './dates';
import { buildGroceryList } from './grocery';
import { carryOver, cook, goodOn, packText, leftoverUse, newLeftover, packageOf, packagedUses, tallyWeek, type OpenPack, type OpenState, type PackagedUse } from './leftovers';
import { buildPool, DEFAULT_RULES } from './pool';
import { checkWeek, fromWeeksBefore, generateWeek, mealUses, REPEAT_MIN, type DaySetup } from './planner';
import { makeRng, randInt } from './rng';
import { testDb } from './testDb';
import type { DayPlan, PlannedMeal, Recipe } from '../types';

const foods = testDb();
const POOL = buildPool(BUILTIN_RECIPES, foods);
const BLIND = POOL.map((p) => ({ ...p, packaged: [] })); // a planner that does not know about packages
const recipes = new Map<string, Recipe>(BUILTIN_RECIPES.map((r) => [r.id, r]));
const pkgOf = (key: string) => packageOf(foods.get(key)!);
const chickpeas = pkgOf('key:chickpeas')!;
const use = (key: string, gPerServing: number): PackagedUse => ({ pkg: pkgOf(key)!, gPerServing });
const MON = '2026-11-23';
const peopleBy = { breakfast: 1, lunch: 1, dinner: 4, snack: 1 };

describe('which packages count', () => {
  it('amounts left read as fractions of a package', () => {
    expect(packText(0.5, 'can')).toBe('½ can');
    expect(packText(1 / 3, 'bag')).toBe('⅓ bag');
    expect(packText(1.5, 'bunch')).toBe('1½ bunches');
    expect(packText(0.01, 'tub')).toBe('⅛ tub');
  });
  it('quick-spoiling packages are tracked, with how long they keep once opened', () => {
    expect(chickpeas).toMatchObject({ unit: 'can', days: 4 });
    expect(pkgOf('key:spinach')).toMatchObject({ unit: 'bag', days: 5 });
    expect(pkgOf('key:parsley')).toMatchObject({ unit: 'bunch', days: 5 });
    expect(pkgOf('key:ricotta')).toMatchObject({ days: 7 });
  });
  it('things that keep, are bought loose or by weight are not', () => {
    for (const k of ['key:garlic', 'key:parmesan', 'key:olives', 'key:olive_oil', 'key:salmon', 'key:onion', 'key:ww_bread', 'key:milk', 'key:frozen_spinach', 'key:lentils']) {
      const f = foods.get(k);
      expect(f, k).toBeTruthy();
      expect(packageOf(f!), k).toBeNull();
    }
  });
  it('a recipe lists its packaged ingredients per serving', () => {
    const r: Recipe = { id: 't', name: 't', meal: 'lunch', servings: 4, activeMin: 5, totalMin: 5, effort: 'easy', protein: 'chickpeas', tags: [], steps: [], ingredients: [{ food: 'key:chickpeas', qty: 1, unit: 'can' }, { food: 'key:olive_oil', qty: 1, unit: 'tbsp' }] };
    const u = packagedUses(r, foods);
    expect(u).toHaveLength(1);
    expect(u[0].gPerServing).toBeCloseTo(chickpeas.g / 4);
  });
});

describe('the running tally', () => {
  const half = [use('key:chickpeas', chickpeas.g / 2)]; // ½ can per serving

  it('opens a can, and a later meal finishes it', () => {
    const s: OpenState = new Map();
    expect(cook(s, half, 1, MON)).toEqual([]);
    expect(s.get(chickpeas.key)!.left).toBeCloseTo(chickpeas.g / 2);
    expect(leftoverUse(s, half, 1, addDays(MON, 1))).toBeCloseTo(0.5);
    const used = cook(s, half, 1, addDays(MON, 1));
    expect(used[0].frac).toBeCloseTo(0.5);
    expect(used[0].openedOn).toBe(MON);
    expect(s.size).toBe(0); // finished
  });

  it('an opened can is good for 4 days, then it no longer counts', () => {
    const s: OpenState = new Map();
    cook(s, half, 1, MON);
    expect(goodOn(s.get(chickpeas.key)!, addDays(MON, 3))).toBe(true);
    expect(goodOn(s.get(chickpeas.key)!, addDays(MON, 4))).toBe(false);
    expect(leftoverUse(s, half, 1, addDays(MON, 4))).toBe(0);
    expect(cook(s, half, 1, addDays(MON, 4))).toEqual([]); // opens a new can instead
    expect(s.get(chickpeas.key)!.openedOn).toBe(addDays(MON, 4));
  });

  it('a hair over a whole can does not open another, and whole cans leave nothing open', () => {
    const s: OpenState = new Map();
    cook(s, [use('key:chickpeas', chickpeas.g * 1.03)], 1, MON);
    expect(s.size).toBe(0);
    cook(s, [use('key:chickpeas', chickpeas.g * 1.5)], 1, MON);
    expect(s.get(chickpeas.key)!.left).toBeCloseTo(chickpeas.g / 2);
  });

  it('counts only new packages as newly left over', () => {
    const s: OpenState = new Map();
    expect(newLeftover(s, half, 1, MON)).toBeCloseTo(0.5);
    cook(s, half, 1, MON);
    expect(newLeftover(s, half, 1, MON)).toBe(0); // the open half covers it
  });

  it('what is still open at the end of the week carries over only while it is good', () => {
    const sat = addDays(MON, 5);
    const days: DayPlan[] = weekDates(MON).map((date) => ({ date, effort: 'easy', snack: false, kcalTarget: 1700, fiberTarget: 28, meals: [] }));
    const r = BUILTIN_RECIPES.find((x) => packagedUses(x, foods).some((u) => u.pkg.key === chickpeas.key))!;
    const meal: PlannedMeal = { slot: 'lunch', recipeId: r.id, portion: 1, people: 1 };
    days[5].meals = [meal];
    const t = tallyWeek(days, mealUses(POOL));
    const next = carryOver(t.end, addDays(MON, 7));
    expect(next.some((o) => o.pkg.key === chickpeas.key && o.openedOn === sat)).toBe(true);
    // opened on Tuesday instead: gone by next Monday
    days[5].meals = [];
    days[1].meals = [meal];
    expect(carryOver(tallyWeek(days, mealUses(POOL)).end, addDays(MON, 7)).some((o) => o.pkg.key === chickpeas.key)).toBe(false);
  });
});

describe('grocery list with what is left from last week', () => {
  const lunchWith = (id: string, date: string) => ({ date, effort: 'easy' as const, snack: false, kcalTarget: 1700, fiberTarget: 28, meals: [{ slot: 'lunch' as const, recipeId: id, portion: 1, people: 4 }] });
  // a recipe that uses exactly 1 can for 4 people
  const oneCan = BUILTIN_RECIPES.find((r) => r.servings === 4 && r.ingredients.some((i) => i.food === 'key:chickpeas' && i.qty === 1 && i.unit === 'can'))!;
  const carry = (left: number, openedOn: string): OpenPack[] => [{ pkg: chickpeas, left, openedOn }];

  it('uses the open half can first and buys one can, not two', () => {
    const list = buildGroceryList([lunchWith(oneCan.id, MON)], recipes, foods, [], carry(chickpeas.g / 2, addDays(MON, -2)));
    const item = list.find((i) => i.key === chickpeas.key)!;
    expect(item.buy).toBe('1 can');
    expect(item.fromLastWeek).toBe('½ can');
  });

  it('leftovers that cover the whole need mean nothing to buy', () => {
    const list = buildGroceryList([lunchWith(oneCan.id, MON)], recipes, foods, [], carry(chickpeas.g, addDays(MON, -1)));
    expect(list.find((i) => i.key === chickpeas.key)).toMatchObject({ covered: true, buy: '', fromLastWeek: '1 can' });
  });

  it('a leftover that has gone off by the day it is needed is not used', () => {
    const list = buildGroceryList([lunchWith(oneCan.id, addDays(MON, 3))], recipes, foods, [], carry(chickpeas.g / 2, addDays(MON, -2)));
    const item = list.find((i) => i.key === chickpeas.key)!;
    expect(item.fromLastWeek).toBeUndefined();
    expect(item.buy).toBe('1 can');
  });
});

describe('the planner uses up what it opens', () => {
  const setups = (rng: ReturnType<typeof makeRng>, start = MON): DaySetup[] =>
    weekDates(start).map((date) => ({ date, effort: (['easy', 'medium', 'long'] as const)[randInt(rng, 0, 2)], snack: rng() < 0.75, peopleBy, kcalTarget: 1700, fiberTarget: 28 }));
  const unfinished = (days: DayPlan[], carryIn: OpenPack[] = []) => {
    // packages left open at the end, plus any that went off before being finished
    const usesOf = mealUses(POOL);
    const s: OpenState = new Map(carryIn.map((o) => [o.pkg.key, { ...o }]));
    let wasted = 0;
    for (const d of days) for (const m of d.meals) {
      const x = usesOf(m);
      if (!x) continue;
      for (const u of x.uses) { const o = s.get(u.pkg.key); if (o && !goodOn(o, d.date)) wasted += o.left / o.pkg.g; }
      cook(s, x.uses, x.servings, d.date);
    }
    for (const o of s.values()) wasted += o.left / o.pkg.g;
    return wasted;
  };

  it('leaves far fewer packages unfinished than a planner that ignores them (60 weeks)', () => {
    let aware = 0;
    let blind = 0;
    for (let i = 0; i < 60; i++) {
      const st = setups(makeRng(300 + i));
      aware += unfinished(generateWeek(st, { pool: POOL, rules: DEFAULT_RULES }, i).days);
      blind += unfinished(generateWeek(st, { pool: BLIND, rules: DEFAULT_RULES }, i).days);
    }
    expect(aware).toBeLessThan(blind * 0.75);
  });

  it('a recipe comes back (any meal, any number of times) only on a later day, and only to use up what is open', () => {
    let repeats = 0;
    let dinnerRepeats = 0;
    for (let i = 0; i < 100; i++) {
      const res = generateWeek(setups(makeRng(700 + i)), { pool: POOL, rules: DEFAULT_RULES }, i);
      expect(res.violations).toEqual([]);
      const tally = tallyWeek(res.days, mealUses(POOL));
      const last = new Map<string, string>();
      for (const d of res.days) for (const m of d.meals) {
        if (!m.recipeId || m.batchId) continue;
        const prev = last.get(m.recipeId);
        last.set(m.recipeId, d.date);
        if (!prev) continue;
        repeats++;
        if (m.slot === 'dinner') dinnerRepeats++;
        expect(prev < d.date).toBe(true); // never twice in one day
        const usedUp = (tally.usedUp.get(`${d.date}|${m.slot}`) ?? []).reduce((s, u) => s + u.frac, 0);
        expect(usedUp).toBeGreaterThanOrEqual(REPEAT_MIN - 1e-9);
      }
    }
    expect(repeats).toBeGreaterThan(0); // it does happen
    expect(dinnerRepeats).toBeGreaterThan(0); // dinners too
  });

  it('the rule check still catches a repeat that uses up nothing, at any meal, and twice in one day', () => {
    const res = generateWeek(setups(makeRng(11)), { pool: POOL, rules: DEFAULT_RULES }, 11);
    // Only the meals set below cook anything (every other meal is one she typed in). Monday and Sunday: whatever
    // Monday opened has gone off by Sunday, so the repeat uses up nothing.
    const only = (slot: string) => structuredClone(res.days).map((d) => ({ ...d, meals: d.meals.map((m) => (m.slot === slot ? m : { slot: m.slot, portion: 1, people: 1, custom: { name: 'out' } })) }));
    for (const slot of ['lunch', 'dinner'] as const) {
      const p = POOL.find((x) => x.meals.includes(slot) && x.veg && !x.issues.length && x.packaged.every((u) => u.pkg.days <= 5))!;
      const days = only(slot);
      days[0].meals.find((m) => m.slot === slot)!.recipeId = p.id;
      days[6].meals.find((m) => m.slot === slot)!.recipeId = p.id;
      expect(checkWeek(days, { pool: POOL, rules: DEFAULT_RULES }).some((v) => v.rule === 'repeat'), slot).toBe(true);
    }
    const same = structuredClone(res.days);
    same[2].meals.find((m) => m.slot === 'dinner')!.recipeId = same[2].meals.find((m) => m.slot === 'lunch')!.recipeId;
    expect(checkWeek(same, { pool: POOL, rules: DEFAULT_RULES }).some((v) => v.rule === 'repeat' && v.message.includes('same day'))).toBe(true);
  });

  it("starts the week by using up last week's open packages", () => {
    const carryIn: OpenPack[] = [{ pkg: chickpeas, left: chickpeas.g / 2, openedOn: addDays(MON, -1) }];
    let used = 0;
    let usedBlind = 0;
    for (let i = 0; i < 40; i++) {
      const st = setups(makeRng(900 + i));
      const withCarry = tallyWeek(generateWeek(st, { pool: POOL, rules: DEFAULT_RULES, carryIn }, i).days, mealUses(POOL), carryIn);
      const without = tallyWeek(generateWeek(st, { pool: POOL, rules: DEFAULT_RULES }, i).days, mealUses(POOL), carryIn);
      const finished = (t: typeof withCarry) => [...t.usedUp.values()].flat().some((u) => u.pkg.key === chickpeas.key && u.openedOn < MON);
      if (finished(withCarry)) used++;
      if (finished(without)) usedBlind++;
    }
    expect(used).toBeGreaterThanOrEqual(30);
    expect(used).toBeGreaterThan(usedBlind);
  });

  it('weeks in a row follow every rule with carry-over, and use fewer of last week\'s recipes', () => {
    let overlapWith = 0;
    let overlapWithout = 0;
    for (let s = 0; s < 15; s++) {
      const rng = makeRng(1200 + s);
      const before: (DayPlan[] | undefined)[] = [undefined, undefined];
      let start = MON;
      for (let w = 0; w < 4; w++) {
        const st = setups(rng, start);
        const ctxBefore = fromWeeksBefore(start, before, POOL);
        const res = generateWeek(st, { pool: POOL, rules: DEFAULT_RULES, ...ctxBefore }, s * 10 + w);
        expect(res.violations).toEqual([]);
        expect(checkWeek(res.days, { pool: POOL, rules: DEFAULT_RULES, carryIn: ctxBefore.carryIn })).toEqual([]);
        const plain = generateWeek(st, { pool: POOL, rules: DEFAULT_RULES }, s * 10 + w);
        const ids = (days: DayPlan[]) => new Set(days.flatMap((d) => d.meals.map((m) => m.recipeId!)));
        if (w > 0) {
          overlapWith += [...ids(res.days)].filter((id) => ctxBefore.recent.has(id)).length;
          overlapWithout += [...ids(plain.days)].filter((id) => ctxBefore.recent.has(id)).length;
        }
        before.shift();
        before.push(res.days);
        start = addDays(start, 7);
      }
    }
    expect(overlapWith).toBeLessThan(overlapWithout * 0.75);
  });

  it("works out last week's carry-over and recipes from the plans before", () => {
    const res = generateWeek(setups(makeRng(5)), { pool: POOL, rules: DEFAULT_RULES }, 5);
    const next = addDays(MON, 7);
    const got = fromWeeksBefore(next, [undefined, res.days], POOL);
    expect(got.carryIn).toEqual(carryOver(tallyWeek(res.days, mealUses(POOL)).end, next));
    expect(got.recent).toEqual(new Set(res.days.flatMap((d) => d.meals.filter((m) => m.recipeId && !m.batchId).map((m) => m.recipeId))));
    expect(fromWeeksBefore(next, [undefined, undefined], POOL)).toEqual({ carryIn: [], recent: new Set() });
  });
});
