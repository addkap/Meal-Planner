// The weekly planner.
//
// How a week is built:
//  1. Meals she locked and batch servings are placed first and never changed.
//  2. The week's protein quotas are drawn within her rules (e.g. fish 2-3 times, poultry 1-2, red meat at most
//     once), minus what the fixed meals already use, and handed out to specific dinners (or lunches).
//     Every other meal is plant-based (beans, lentils, eggs, dairy, nuts...). This makes the counts exact.
//  3. Each day is filled by trying many random combinations of recipes that fit the day's effort level, active
//     cooking time, the "no repeats" and "no same protein on back-to-back dinners" rules, the egg and treat
//     limits, and (when needed) the beans-or-legumes-most-days rule. For each combination her serving size
//     (0.75x to 1.5x, in quarter steps) is tuned to land within 5% of the day's calorie target, and fiber is
//     checked. The best combination wins; her preferences (Use more / Use less, favorites, her own recipes)
//     make recipes more or less likely.
//  4. The whole week is checked against every rule (checkWeek). If anything is off, it tries again with a
//     different random start, and keeps the best. Days that still cannot reach their targets get a warning.
//
// Everything here is pure (no database), so it is fully tested in planner.test.ts.

import type { DayPlan, DietRules, Effort, MealSlot, PlannedMeal } from '../types';
import { makeRng, randInt, weightedPick, type Rng } from './rng';
import type { PoolRecipe, ProteinClass } from './pool';

// ---------------------------------------------------------------- settings

/** Most hands-on cooking minutes in a day, by effort level. */
export const ACTIVE_CAP: Record<Effort, number> = { easy: 45, medium: 75, long: 120 };
/** Calories must land within this share of the target. */
export const KCAL_TOLERANCE = 0.05;
export const PORTIONS = [0.75, 1, 1.25, 1.5];
const RED_MEAT_PORTIONS = [0.75, 1]; // red meat stays a small portion
const ATTEMPTS = 25;
const COMBOS_PER_DAY = 40;
const MAX_TREATS = 2;
/** A snack is at most this many calories per serving (some breakfasts, like egg bites, double as snacks). */
export const SNACK_MAX_KCAL = 320;
const MAX_SWEET_TREATS = 1; // her recipes that break the sugar rule

/** Which recipe effort tiers fit each meal on a day of the given effort, and how much to favor each. */
export function effortWeight(slot: MealSlot, day: Effort, recipe: Effort): number {
  if (slot === 'dinner') {
    if (day === 'easy') return recipe === 'easy' ? 1 : 0;
    if (day === 'medium') return recipe === 'easy' ? 1 : recipe === 'medium' ? 2 : 0;
    return recipe === 'long' ? 3 : recipe === 'medium' ? 1.5 : 1;
  }
  // breakfast, lunch and snacks skew easy to medium
  if (day === 'easy') return recipe === 'easy' ? 1 : 0;
  return recipe === 'easy' ? 2 : recipe === 'medium' ? 1 : 0;
}

/** The least hands-on time any recipe could take in this slot on a day of this effort (used when locked meals or a batch already fill the day's time). */
export function minActive(pool: PoolRecipe[], slot: MealSlot, day: Effort): number {
  let min = Infinity;
  for (const p of pool) if (p.weight > 0 && p.meals.includes(slot) && effortWeight(slot, day, p.effort) > 0 && p.activeMin < min) min = p.activeMin;
  return Number.isFinite(min) ? min : 0;
}

/**
 * The day's hands-on cooking limit. If her locked meals and batch cooking already use (nearly) all of it, the
 * limit stretches just enough for the quickest possible recipes in the other slots, and the day gets a warning.
 */
function activeLimit(pool: PoolRecipe[], d: { effort: Effort }, fixedActive: number, freeSlots: MealSlot[]): number {
  if (fixedActive + freeSlots.reduce((s, slot) => s + minActive(pool, slot, d.effort), 0) <= ACTIVE_CAP[d.effort]) return ACTIVE_CAP[d.effort];
  // Over budget anyway: leave room for quick, simple recipes (not only the single quickest one) in the other slots.
  return fixedActive + freeSlots.length * 12;
}

// ---------------------------------------------------------------- inputs

export interface DaySetup {
  date: string;
  effort: Effort;
  snack: boolean;
  people: number;
  kcalTarget: number;
  fiberTarget: number;
}

export interface BatchInfo {
  id: string;
  recipeId: string;
  cookedOn: string;
  cooked: boolean;
}

export interface PlanInput {
  days: DaySetup[];
  pool: PoolRecipe[];
  rules: DietRules;
  seed: number;
  /** Meals already decided: locked meals, batch servings, and (for a swap or one-day regenerate) the rest of the week. */
  fixed?: PlannedMeal[][]; // per day, same order as `days`
  batches?: BatchInfo[];
  /** Recipes to steer away from (the ones being regenerated). */
  avoid?: Set<string>;
  /** Slots that should keep their recipe if the rules allow it (re-balancing around a batch). key = `${date}|${slot}` */
  keep?: Map<string, string>;
  /** Recipes that must not go in a slot (a swap must give something new). */
  exclude?: Map<string, Set<string>>;
}

export interface PlanResult {
  days: DayPlan[];
  /** Rule problems the planner could not avoid because of locked meals or batches. */
  warnings: string[];
  violations: Violation[];
}

const slotsFor = (d: DaySetup): MealSlot[] => (d.snack ? ['breakfast', 'lunch', 'dinner', 'snack'] : ['breakfast', 'lunch', 'dinner']);
const key = (date: string, slot: MealSlot) => `${date}|${slot}`;
export const isFixed = (m: PlannedMeal) => !!m.locked || !!m.batchId;

// ---------------------------------------------------------------- portions

interface FitMeal { kcal: number; fiber: number; portions: number[] }

/** Try every combination of serving sizes and return the one closest to the target (preferring sizes near 1x). */
export function fitPortions(meals: FitMeal[], kcalTarget: number): { portions: number[]; kcal: number; fiber: number } {
  let best = { portions: meals.map((m) => m.portions[0]), kcal: Infinity, fiber: 0, err: Infinity, drift: Infinity };
  const cur: number[] = [];
  const walk = (i: number, kcal: number, fiber: number, drift: number) => {
    if (i === meals.length) {
      const err = Math.abs(kcal - kcalTarget) / kcalTarget;
      const inBand = err <= KCAL_TOLERANCE;
      const bestInBand = best.err <= KCAL_TOLERANCE;
      const better = inBand && bestInBand ? drift < best.drift - 1e-9 || (Math.abs(drift - best.drift) < 1e-9 && err < best.err) : err < best.err;
      if (better) best = { portions: [...cur], kcal, fiber, err, drift };
      return;
    }
    for (const p of meals[i].portions) {
      cur[i] = p;
      walk(i + 1, kcal + p * meals[i].kcal, fiber + p * meals[i].fiber, drift + Math.abs(p - 1));
    }
  };
  walk(0, 0, 0, 0);
  return { portions: best.portions, kcal: best.kcal, fiber: best.fiber };
}

// ---------------------------------------------------------------- the planner

interface WeekState {
  used: Set<string>;
  eggs: number;
  treats: number;
  sweet: number;
  dinnerProtein: Map<string, string>; // date -> protein of that day's dinner
}

export function planWeek(input: PlanInput): PlanResult {
  let best: PlanResult | null = null;
  let bestScore = Infinity;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const rng = makeRng(input.seed * 31 + attempt * 7919 + 1);
    const days = attemptWeek(input, rng);
    const violations = checkWeek(days, input);
    const avoidable = violations.filter((v) => !v.fixed);
    const misses = days.filter((d) => (d.warnings ?? []).length > 0).length;
    const score = avoidable.length * 100 + misses;
    if (score < bestScore) {
      bestScore = score;
      best = { days, violations, warnings: violations.filter((v) => v.fixed).map((v) => v.message) };
    }
    if (score === 0) break;
  }
  return best!;
}

function attemptWeek(input: PlanInput, rng: Rng): DayPlan[] {
  const { days: setups, pool, rules } = input;
  const byId = new Map(pool.map((p) => [p.id, p]));
  const batchRecipe = new Map((input.batches ?? []).map((b) => [b.id, b.recipeId]));
  const recipeOf = (m: PlannedMeal) => byId.get(m.recipeId ?? batchRecipe.get(m.batchId ?? '') ?? '');

  // 1. fixed meals
  const fixedBySlot = new Map<string, PlannedMeal>();
  setups.forEach((d, i) => (input.fixed?.[i] ?? []).forEach((m) => fixedBySlot.set(key(d.date, m.slot), m)));

  const state: WeekState = { used: new Set(), eggs: 0, treats: 0, sweet: 0, dinnerProtein: new Map() };
  const count = { fish: 0, poultry: 0, red: 0 };
  for (const [k, m] of fixedBySlot) {
    const p = recipeOf(m);
    if (!p) continue;
    if (!m.batchId) state.used.add(p.id);
    else state.used.add(p.id); // a batch recipe is not also planned as a separate meal
    if (p.cls !== 'plant') count[p.cls]++;
    if (p.eggs) state.eggs++;
    if (p.treat && m.slot === 'snack') { state.treats++; if (p.issues.length) state.sweet++; }
    if (m.slot === 'dinner') state.dinnerProtein.set(k.split('|')[0], p.protein);
  }

  // 2. protein quotas -> specific free slots
  const free = setups.flatMap((d) => slotsFor(d).filter((s) => !fixedBySlot.has(key(d.date, s))).map((s) => ({ d, s })));
  const cls = new Map<string, ProteinClass>(free.map(({ d, s }) => [key(d.date, s), 'plant']));
  const need = {
    fish: Math.max(0, randInt(rng, rules.fishMin, rules.fishMax) - count.fish),
    poultry: Math.max(0, randInt(rng, rules.poultryMin, rules.poultryMax) - count.poultry),
    red: Math.max(0, randInt(rng, 0, Math.max(0, rules.redMeatMax - count.red))),
  };
  // A slot can only take a class if some recipe could go there.
  const possible = (d: DaySetup, s: MealSlot, c: ProteinClass) =>
    pool.some((p) => p.cls === c && p.weight > 0 && p.meals.includes(s) && p.issues.length === 0 && effortWeight(s, d.effort, p.effort) > 0 && (s === 'snack' || s === 'breakfast' || p.veg));
  const assigned = new Map<string, ProteinClass>(); // date -> class of a protein dinner
  for (const c of ['red', 'fish', 'poultry'] as const) {
    for (let n = 0; n < need[c]; n++) {
      const dinnerSpots = free.filter(({ d, s }) => s === 'dinner' && cls.get(key(d.date, s)) === 'plant' && possible(d, s, c));
      const pickFrom = dinnerSpots.length ? dinnerSpots : free.filter(({ d, s }) => s === 'lunch' && cls.get(key(d.date, s)) === 'plant' && possible(d, s, c));
      const spot = weightedPick(rng, pickFrom, ({ d }) => {
        // spread the same protein class out across the week
        const i = setups.indexOf(d);
        const near = [setups[i - 1], setups[i + 1]].some((x) => x && assigned.get(x.date) === c);
        return near ? 0.25 : 1;
      });
      if (!spot) break;
      cls.set(key(spot.d.date, spot.s), c);
      if (spot.s === 'dinner') assigned.set(spot.d.date, c);
    }
  }

  // 3. fill each day
  const legumeDay = (d: DaySetup) => slotsFor(d).some((s) => { const m = fixedBySlot.get(key(d.date, s)); const p = m && recipeOf(m); return !!p?.legume; });
  let legumeDays = 0;
  const out: DayPlan[] = [];
  setups.forEach((d, i) => {
    const later = setups.slice(i + 1);
    const neededLegumeDays = rules.legumeDaysMin - legumeDays - later.filter(legumeDay).length;
    const thisHasFixedLegume = legumeDay(d);
    const openDaysLeft = 1 + later.filter((x) => !legumeDay(x)).length;
    const requireLegume = !thisHasFixedLegume && neededLegumeDays >= openDaysLeft;
    const wantLegume = !thisHasFixedLegume && neededLegumeDays > 0;

    const day = fillDay(d, input, rng, state, cls, fixedBySlot, recipeOf, { requireLegume, wantLegume }, setups[i - 1]?.date, setups[i + 1]?.date);
    if (day.meals.some((m) => recipeOf(m)?.legume)) legumeDays++;
    out.push(day);
  });
  return out;
}

function fillDay(
  d: DaySetup,
  input: PlanInput,
  rng: Rng,
  state: WeekState,
  cls: Map<string, ProteinClass>,
  fixedBySlot: Map<string, PlannedMeal>,
  recipeOf: (m: PlannedMeal) => PoolRecipe | undefined,
  legume: { requireLegume: boolean; wantLegume: boolean },
  prevDate?: string,
  nextDate?: string,
): DayPlan {
  const { pool, rules } = input;
  const slots = slotsFor(d);
  const fixedHere = slots.map((s) => fixedBySlot.get(key(d.date, s)));
  // Cooking a batch counts as cooking on the day she makes it.
  const batchCookMin = (input.batches ?? [])
    .filter((b) => b.cookedOn === d.date)
    .reduce((sum, b) => sum + (pool.find((p) => p.id === b.recipeId)?.activeMin ?? 0), 0);

  // candidate lists per free slot
  const cands = slots.map((s, i) => {
    if (fixedHere[i]) return [] as PoolRecipe[];
    const c = cls.get(key(d.date, s)) ?? 'plant';
    const excluded = input.exclude?.get(key(d.date, s));
    return pool.filter((p) => {
      if (p.weight <= 0 || !p.meals.includes(s) || p.cls !== c || state.used.has(p.id) || excluded?.has(p.id)) return false;
      if (s === 'snack' && p.kcal > SNACK_MAX_KCAL) return false; // e.g. two muffins are breakfast, not a snack
      if (effortWeight(s, d.effort, p.effort) <= 0) return false;
      if (s === 'snack' ? p.issues.length > 0 && !p.treat : p.issues.length > 0) return false;
      if ((s === 'lunch' || s === 'dinner') && !p.veg) return false;
      if (p.treat && s === 'snack' && (state.treats >= MAX_TREATS || (p.issues.length > 0 && state.sweet >= MAX_SWEET_TREATS))) return false;
      if (p.treat && s !== 'snack') return false;
      if (p.eggs && state.eggs >= rules.eggMealsMax) return false;
      if (s === 'dinner' && p.protein !== 'none') {
        if (prevDate && state.dinnerProtein.get(prevDate) === p.protein) return false;
        if (nextDate && state.dinnerProtein.get(nextDate) === p.protein) return false;
      }
      return true;
    });
  });

  const weightOf = (p: PoolRecipe, s: MealSlot) => {
    let w = p.weight * effortWeight(s, d.effort, p.effort);
    if (input.avoid?.has(p.id)) w *= 0.05;
    if (input.keep?.get(key(d.date, s)) === p.id) w *= 6;
    if (legume.wantLegume && p.legume && (s === 'lunch' || s === 'dinner')) w *= 1.6;
    if (p.treat) w *= 0.4;
    return w;
  };

  const fixedActive = batchCookMin + fixedHere.reduce((s, f) => s + (f && !f.batchId ? recipeOf(f)?.activeMin ?? 0 : 0), 0);
  const limit = activeLimit(pool, d, fixedActive, slots.filter((_, i) => !fixedHere[i]));

  type Combo = { picks: (PoolRecipe | undefined)[]; portions: number[]; kcal: number; fiber: number; score: number };
  let best: Combo | null = null;
  for (let t = 0; t < COMBOS_PER_DAY; t++) {
    const picks: (PoolRecipe | undefined)[] = [];
    const taken = new Set<string>();
    let ok = true;
    let eggs = 0;
    slots.forEach((s, i) => {
      if (!ok) return;
      if (fixedHere[i]) { picks.push(recipeOf(fixedHere[i]!)); return; }
      const open = cands[i].filter((c) => !taken.has(c.id));
      // First try: keep what was there before (re-balancing changes as little as it can).
      const kept = t === 0 ? open.find((c) => input.keep?.get(key(d.date, s)) === c.id) : undefined;
      const p = kept ?? weightedPick(rng, open, (c) => weightOf(c, s));
      if (!p) { ok = false; return; }
      if (p.eggs) eggs++;
      taken.add(p.id);
      picks.push(p);
    });
    if (!ok) continue;
    if (eggs > 0 && state.eggs + eggs > rules.eggMealsMax) continue; // (batches alone may already be over: then just add no more)
    const active = batchCookMin + picks.reduce((sum, p, i) => sum + (p && !fixedHere[i]?.batchId ? p.activeMin : 0), 0);
    if (active > limit && picks.some((_, i) => !fixedHere[i])) continue;
    // Prefer not to have the same main protein twice in one day (chickpeas at lunch and dinner, eggs at
    // breakfast and dinner), when possible. Nuts, yogurt and cheese are small parts of many meals, so they may repeat.
    const mains = (['breakfast', 'lunch', 'dinner'] as MealSlot[]).map((s) => picks[slots.indexOf(s)]?.protein).filter((x) => x && !['none', 'nuts', 'yogurt', 'cheese'].includes(x));
    if (new Set(mains).size < mains.length && t < COMBOS_PER_DAY / 2) continue;
    const hasLegume = picks.some((p) => p?.legume);
    if (legume.requireLegume && !hasLegume) continue;

    const fit = fitPortions(
      picks.map((p, i) => {
        const f = fixedHere[i];
        const kcal = p?.kcal ?? 0;
        const fiber = p?.fiber ?? 0;
        if (f && (f.batchId || f.locked)) return { kcal, fiber, portions: [f.portion] };
        return { kcal, fiber, portions: p?.cls === 'red' ? RED_MEAT_PORTIONS : PORTIONS };
      }),
      d.kcalTarget,
    );
    const err = Math.abs(fit.kcal - d.kcalTarget) / d.kcalTarget;
    const fiberShort = Math.max(0, d.fiberTarget - fit.fiber) / d.fiberTarget;
    // Recipes were already drawn in proportion to how much she likes them, so the first combination that meets
    // every target wins (scoring on preference again would always favor the same few recipes).
    const score = -40 * Math.max(0, err - KCAL_TOLERANCE) - 25 * fiberShort - (legume.wantLegume && !hasLegume ? 0.5 : 0);
    if (!best || score > best.score) best = { picks, portions: fit.portions, kcal: fit.kcal, fiber: fit.fiber, score };
    if (score === 0) break;
  }

  const meals: PlannedMeal[] = slots.map((s, i) => {
    const f = fixedHere[i];
    const p = best?.picks[i];
    const portion = best?.portions[i] ?? f?.portion ?? 1;
    if (f) return { ...f, portion: f.batchId || f.locked ? f.portion : portion };
    return { slot: s, recipeId: p?.id, portion, people: d.people };
  });

  // commit to the week
  meals.forEach((m, i) => {
    if (fixedHere[i]) return;
    const p = best?.picks[i];
    if (!p) return;
    state.used.add(p.id);
    if (p.eggs) state.eggs++;
    if (p.treat && m.slot === 'snack') { state.treats++; if (p.issues.length) state.sweet++; }
    if (m.slot === 'dinner') state.dinnerProtein.set(d.date, p.protein);
  });

  const warnings: string[] = [];
  if (!best) warnings.push('No recipes fit all the rules for this day. Try a different effort level, or unlock a meal.');
  else {
    const pct = Math.round(((best.kcal - d.kcalTarget) / d.kcalTarget) * 100);
    if (Math.abs(best.kcal - d.kcalTarget) / d.kcalTarget > KCAL_TOLERANCE) {
      warnings.push(`About ${Math.round(best.kcal)} calories, ${Math.abs(pct)}% ${pct < 0 ? 'under' : 'over'} the ${d.kcalTarget} target.${pct < 0 && !d.snack ? ' Turning the snack on would help.' : ''}`);
    }
    if (best.fiber < d.fiberTarget) warnings.push(`About ${Math.round(best.fiber)} g of fiber, under the ${d.fiberTarget} g target.`);
  }
  return { date: d.date, effort: d.effort, snack: d.snack, people: d.people, kcalTarget: d.kcalTarget, fiberTarget: d.fiberTarget, meals, warnings };
}

// ---------------------------------------------------------------- checking a week

export interface Violation {
  rule: string;
  message: string;
  date?: string;
  /** True when locked meals or batches cause it, so the planner could not avoid it. */
  fixed: boolean;
}

export function checkWeek(days: DayPlan[], input: Pick<PlanInput, 'pool' | 'rules' | 'batches'>): Violation[] {
  const { pool, rules } = input;
  const byId = new Map(pool.map((p) => [p.id, p]));
  const batchRecipe = new Map((input.batches ?? []).map((b) => [b.id, b.recipeId]));
  const recipeOf = (m: PlannedMeal) => byId.get(m.recipeId ?? batchRecipe.get(m.batchId ?? '') ?? '');
  const all = days.flatMap((d) => d.meals.map((m) => ({ d, m, p: recipeOf(m) })));
  const v: Violation[] = [];
  const countOf = (c: ProteinClass, onlyFixed = false) => all.filter((x) => x.p?.cls === c && (!onlyFixed || isFixed(x.m))).length;

  const quota = (c: ProteinClass, label: string, min: number, max: number) => {
    const n = countOf(c);
    const nFixed = countOf(c, true);
    if (n > max) v.push({ rule: `${c}-max`, message: `${label} ${n} times this week (the plan allows at most ${max}).`, fixed: nFixed > max });
    const roomLeft = all.some((x) => !isFixed(x.m) && (x.m.slot === 'lunch' || x.m.slot === 'dinner'));
    if (n < min) v.push({ rule: `${c}-min`, message: `${label} only ${n} times this week (the plan aims for at least ${min}).`, fixed: !roomLeft });
  };
  quota('fish', 'Fish or seafood', rules.fishMin, rules.fishMax);
  quota('poultry', 'Poultry', rules.poultryMin, rules.poultryMax);
  quota('red', 'Red meat', 0, rules.redMeatMax);

  const legumeDays = days.filter((d) => d.meals.some((m) => recipeOf(m)?.legume)).length;
  if (legumeDays < rules.legumeDaysMin) {
    const plantSlotsLeft = days.some((d) => d.meals.some((m) => !isFixed(m)));
    v.push({ rule: 'legume-days', message: `Beans or legumes on ${legumeDays} days (the plan aims for ${rules.legumeDaysMin}).`, fixed: !plantSlotsLeft });
  }

  const eggs = all.filter((x) => x.p?.eggs).length;
  if (eggs > rules.eggMealsMax) v.push({ rule: 'eggs', message: `${eggs} egg-based meals (the plan keeps it to ${rules.eggMealsMax}).`, fixed: all.filter((x) => x.p?.eggs && isFixed(x.m)).length > rules.eggMealsMax });

  const treats = all.filter((x) => x.p?.treat && x.m.slot === 'snack');
  if (treats.length > MAX_TREATS) v.push({ rule: 'treats', message: `${treats.length} sweet treats this week.`, fixed: treats.filter((x) => isFixed(x.m)).length > MAX_TREATS });

  // no repeats (batch servings are meant to repeat)
  const seen = new Map<string, PlannedMeal>();
  for (const { m, d } of all) {
    if (!m.recipeId || m.batchId) continue;
    const prev = seen.get(m.recipeId);
    if (prev) v.push({ rule: 'repeat', message: `${byId.get(m.recipeId)?.recipe.name ?? m.recipeId} is planned twice.`, date: d.date, fixed: isFixed(prev) && isFixed(m) });
    seen.set(m.recipeId, m);
  }

  days.forEach((d, i) => {
    // back-to-back dinner proteins
    const din = d.meals.find((m) => m.slot === 'dinner');
    const prevDin = days[i - 1]?.meals.find((m) => m.slot === 'dinner');
    const a = din && recipeOf(din);
    const b = prevDin && recipeOf(prevDin);
    if (a && b && a.protein === b.protein && a.protein !== 'none' && !(din!.batchId && din!.batchId === prevDin!.batchId)) {
      v.push({ rule: 'same-protein', message: `Two dinners in a row with ${a.protein}.`, date: d.date, fixed: isFixed(din!) && isFixed(prevDin!) });
    }
    // snack switch
    const hasSnack = d.meals.some((m) => m.slot === 'snack');
    if (hasSnack !== d.snack && !d.meals.some((m) => m.slot === 'snack' && isFixed(m))) v.push({ rule: 'snack', message: 'Snack setting not followed.', date: d.date, fixed: false });

    let active = 0;
    for (const m of d.meals) {
      const p = recipeOf(m);
      if (!p) { if (!isFixed(m)) v.push({ rule: 'empty', message: `No ${m.slot} planned.`, date: d.date, fixed: false }); continue; }
      if (!m.batchId) active += p.activeMin;
      if (isFixed(m)) continue;
      if (effortWeight(m.slot, d.effort, p.effort) <= 0) v.push({ rule: 'effort', message: `${p.recipe.name} is too much work for an ${d.effort} day.`, date: d.date, fixed: false });
      if ((m.slot === 'lunch' || m.slot === 'dinner') && !p.veg) v.push({ rule: 'veg', message: `${p.recipe.name} has no vegetables.`, date: d.date, fixed: false });
      if (p.issues.length && !(p.treat && m.slot === 'snack')) v.push({ rule: 'diet', message: `${p.recipe.name}: ${p.issues.join('; ')}.`, date: d.date, fixed: false });
      if (m.portion < 0.75 || m.portion > 1.5) v.push({ rule: 'portion', message: `Serving size ${m.portion}x is outside 0.75x to 1.5x.`, date: d.date, fixed: false });
      if (p.cls === 'red' && m.portion > 1) v.push({ rule: 'red-portion', message: 'Red meat serving is larger than a small portion.', date: d.date, fixed: false });
    }
    const batchCook = (input.batches ?? []).filter((x) => x.cookedOn === d.date).reduce((s, x) => s + (byId.get(x.recipeId)?.activeMin ?? 0), 0);
    if (active + batchCook > ACTIVE_CAP[d.effort]) {
      const fixedActive = d.meals.filter((m) => isFixed(m) && !m.batchId).reduce((s, m) => s + (recipeOf(m)?.activeMin ?? 0), 0) + batchCook;
      const limit = activeLimit(pool, d, fixedActive, d.meals.filter((m) => !isFixed(m)).map((m) => m.slot));
      v.push({
        rule: 'active-time',
        message: `${d.date}: about ${active + batchCook} minutes of hands-on cooking, more than an ${d.effort === 'easy' ? 'Easy' : d.effort === 'medium' ? 'Medium' : 'Time-consuming'} day's ${ACTIVE_CAP[d.effort]} because of the locked meal or batch cooking.`,
        date: d.date,
        fixed: active + batchCook <= limit && limit > ACTIVE_CAP[d.effort],
      });
    }
  });
  return v;
}

/** Calories and fiber the plan gives her on a day (her own portions). */
export function dayKcalFiber(day: DayPlan, pool: PoolRecipe[], batches: BatchInfo[] = []): { kcal: number; fiber: number } {
  const byId = new Map(pool.map((p) => [p.id, p]));
  const batchRecipe = new Map(batches.map((b) => [b.id, b.recipeId]));
  let kcal = 0;
  let fiber = 0;
  for (const m of day.meals) {
    const p = byId.get(m.recipeId ?? batchRecipe.get(m.batchId ?? '') ?? '');
    if (!p) continue;
    kcal += p.kcal * m.portion;
    fiber += p.fiber * m.portion;
  }
  return { kcal, fiber };
}

// ---------------------------------------------------------------- what the screens call

const setupOf = (d: DayPlan): DaySetup => ({ date: d.date, effort: d.effort, snack: d.snack, people: d.people, kcalTarget: d.kcalTarget, fiberTarget: d.fiberTarget });
const fixedOnly = (d: DayPlan) => d.meals.filter(isFixed);

interface Ctx {
  pool: PoolRecipe[];
  rules: DietRules;
  batches?: BatchInfo[];
}

/** A brand-new week from her day-by-day choices. */
export function generateWeek(setups: DaySetup[], ctx: Ctx, seed: number, fixed?: PlannedMeal[][]): PlanResult {
  return planWeek({ days: setups, ...ctx, seed, fixed });
}

/** Regenerate the whole week, keeping locked meals and batch servings, and steering away from the current recipes. */
export function regenerateWeek(days: DayPlan[], ctx: Ctx, seed: number): PlanResult {
  const avoid = new Set(days.flatMap((d) => d.meals.filter((m) => !isFixed(m) && m.recipeId).map((m) => m.recipeId!)));
  return planWeek({ days: days.map(setupOf), ...ctx, seed, fixed: days.map(fixedOnly), avoid });
}

/** Regenerate one day. Other days stay exactly as they are. */
export function regenerateDay(days: DayPlan[], date: string, ctx: Ctx, seed: number): PlanResult {
  const target = days.find((d) => d.date === date);
  const avoid = new Set((target?.meals ?? []).filter((m) => !isFixed(m) && m.recipeId).map((m) => m.recipeId!));
  const fixed = days.map((d) => (d.date === date ? fixedOnly(d) : d.meals.map((m) => ({ ...m, locked: true }))));
  const res = planWeek({ days: days.map(setupOf), ...ctx, seed, fixed, avoid });
  return unlockOthers(res, days, date);
}

/** Swap one meal for a different recipe (same protein kind when the weekly rules need it). Its serving size is tuned to the day's target; the rest of the week stays as it is. */
export function swapMeal(days: DayPlan[], date: string, slot: MealSlot, ctx: Ctx, seed: number): PlanResult {
  const target = days.find((d) => d.date === date);
  const old = target?.meals.find((m) => m.slot === slot);
  const fixed = days.map((d) =>
    d.date !== date
      ? d.meals.map((m) => ({ ...m, locked: true }))
      : d.meals.filter((m) => m.slot !== slot).map((m) => (isFixed(m) ? m : { ...m, locked: true, portion: m.portion })),
  );
  const exclude = new Map([[key(date, slot), new Set(old?.recipeId ? [old.recipeId] : [])]]);
  const res = planWeek({ days: days.map(setupOf), ...ctx, seed, fixed, exclude });
  return unlockOthers(res, days, date, slot);
}

/**
 * After batch servings are placed (or removed), re-balance the rest of the week:
 * locked meals and batch servings stay, everything else may change, but current recipes are kept where the
 * rules and targets still allow, so the week does not change more than it needs to.
 */
export function rebalanceWeek(days: DayPlan[], ctx: Ctx, seed: number): PlanResult {
  const keep = new Map<string, string>();
  for (const d of days) for (const m of d.meals) if (!isFixed(m) && m.recipeId) keep.set(key(d.date, m.slot), m.recipeId);
  return planWeek({ days: days.map(setupOf), ...ctx, seed, fixed: days.map(fixedOnly), keep });
}

/** The helpers above lock other meals temporarily; give them back their real locked flags. */
function unlockOthers(res: PlanResult, original: DayPlan[], date: string, slot?: MealSlot): PlanResult {
  const days = res.days.map((d, i) => ({
    ...d,
    meals: d.meals.map((m) => {
      const orig = original[i].meals.find((o) => o.slot === m.slot);
      if (d.date === date && (slot === undefined || m.slot === slot)) return m;
      return orig ? { ...m, locked: orig.locked } : m;
    }),
  }));
  return { ...res, days };
}
