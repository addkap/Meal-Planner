// The Plan tab: pick the week, set up each day, generate, review the nutrition, then use the plan.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAppData } from '../AppData';
import { useNav } from '../nav';
import { savePlan } from '../store';
import { addDays, dayName, shortDate, todayLocal, weekDates, weekStartOf } from '../lib/dates';
import { consistentFlags, dailyTargets } from '../lib/dri';
import { NUTRIENT_INFO } from '../lib/nutrients';
import { generateWeek, isFixed, regenerateDay, regenerateWeek, retuneDay, swapMeal, type DaySetup } from '../lib/planner';
import { planNutrition } from '../lib/planNutrition';
import { formatQty } from '../lib/units';
import NutritionPanel from '../components/NutritionPanel';
import SwapMenu from '../components/SwapMenu';
import { EffortBadge, kcalText, minutesText, Segmented, Stepper, Toggle } from '../components/ui';
import type { CustomMeal, DayPlan, Effort, MealSlot, PlannedMeal, WeekPlan } from '../types';
import type { SwapOption } from '../lib/planner';

const SLOT_LABEL: Record<MealSlot, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
const EFFORT_OPTIONS: { value: Effort; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Time-consuming' },
];
const newSeed = () => Math.floor(Math.random() * 1e9);

export default function PlanPage() {
  const [weekStart, setWeekStart] = useState(() => weekStartOf(todayLocal()));
  const [editing, setEditing] = useState(false);
  const plan = useLiveQuery(async () => (await db.plans.get(weekStart)) ?? null, [weekStart]);
  const thisWeek = weekStartOf(todayLocal());

  const label = weekStart === thisWeek ? 'This week' : weekStart === addDays(thisWeek, 7) ? 'Next week' : weekStart === addDays(thisWeek, -7) ? 'Last week' : `Week of ${shortDate(weekStart)}`;

  return (
    <>
      <div className="weekbar">
        <button className="arrow" aria-label="Previous week" onClick={() => { setWeekStart(addDays(weekStart, -7)); setEditing(false); }}>‹</button>
        <div className="weekbar-title">
          <h1>{label}</h1>
          <span className="muted">{shortDate(weekStart)} – {shortDate(addDays(weekStart, 6))}</span>
        </div>
        <button className="arrow" aria-label="Next week" onClick={() => { setWeekStart(addDays(weekStart, 7)); setEditing(false); }}>›</button>
      </div>
      {plan === undefined ? null : !plan || plan.deletedAt || editing ? (
        <PlanSetup weekStart={weekStart} existing={plan && !plan.deletedAt ? plan : null} onDone={() => setEditing(false)} onCancel={plan && !plan.deletedAt ? () => setEditing(false) : undefined} />
      ) : (
        <WeekView plan={plan} onEditSetup={() => setEditing(true)} />
      )}
    </>
  );
}

// ---------------------------------------------------------------- setup

function PlanSetup({ weekStart, existing, onDone, onCancel }: { weekStart: string; existing: WeekPlan | null; onDone: () => void; onCancel?: () => void }) {
  const { settings, pool, batchInfo } = useAppData();
  const [weekKcal, setWeekKcal] = useState(String(existing?.days[0]?.kcalTarget ?? settings.kcal));
  const [weekFiber, setWeekFiber] = useState(String(existing?.days[0]?.fiberTarget ?? settings.fiber));
  const [days, setDays] = useState<(DaySetup & { ownTargets: boolean })[]>(() =>
    weekDates(weekStart).map((date) => {
      const d = existing?.days.find((x) => x.date === date);
      return {
        date,
        effort: d?.effort ?? 'medium',
        snack: d?.snack ?? true,
        people: d?.people ?? settings.people,
        kcalTarget: d?.kcalTarget ?? settings.kcal,
        fiberTarget: d?.fiberTarget ?? settings.fiber,
        ownTargets: !!d && (d.kcalTarget !== existing?.days[0]?.kcalTarget || d.fiberTarget !== existing?.days[0]?.fiberTarget),
      };
    }),
  );
  const [openTargets, setOpenTargets] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const kcalNum = Number(weekKcal);
  const fiberNum = Number(weekFiber);
  const valid = kcalNum >= 1000 && kcalNum <= 4000 && fiberNum >= 10 && fiberNum <= 80 && days.every((d) => d.kcalTarget >= 1000 && d.fiberTarget >= 10);

  const setDay = (i: number, patch: Partial<DaySetup & { ownTargets: boolean }>) => setDays((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const setWeekTargets = (kcal: string, fiber: string) => {
    setWeekKcal(kcal);
    setWeekFiber(fiber);
    setDays((ds) => ds.map((d) => (d.ownTargets ? d : { ...d, kcalTarget: Number(kcal) || d.kcalTarget, fiberTarget: Number(fiber) || d.fiberTarget })));
  };

  function generate() {
    setBusy(true);
    // Keep meals she locked and batch servings from the plan she already had.
    const fixed = days.map((d) => (existing?.days.find((x) => x.date === d.date)?.meals ?? []).filter(isFixed).filter((m) => m.slot !== 'snack' || d.snack));
    const seed = newSeed();
    const res = generateWeek(days.map(({ ownTargets: _o, ...d }) => d), { pool, rules: settings.rules, batches: batchInfo }, seed, fixed);
    void savePlan({ id: weekStart, weekStart, days: res.days, finalized: false, seed, warnings: res.warnings }).then(() => {
      setBusy(false);
      onDone();
      window.scrollTo(0, 0);
    });
  }

  return (
    <>
      <p className="lead">How much cooking do you want to do each day? The plan picks breakfast, lunch, dinner and a snack to match.</p>
      <p className="muted">Easy: about 25 minutes or less. Medium: 25 to 50 minutes. Time-consuming: over 50 minutes.</p>

      <div className="card">
        <h2>Targets for the week</h2>
        <label className="field">
          <span>Calories per day</span>
          <input type="number" step="any" inputMode="numeric" value={weekKcal} onChange={(e) => setWeekTargets(e.target.value, weekFiber)} />
        </label>
        <label className="field">
          <span>Fiber per day (grams)</span>
          <input type="number" step="any" inputMode="numeric" value={weekFiber} onChange={(e) => setWeekTargets(weekKcal, e.target.value)} />
        </label>
        <p className="muted small">Filled in from Settings. You can change them for any single day below.</p>
      </div>

      {days.map((d, i) => (
        <div className="card day-setup" key={d.date}>
          <h2>{dayName(d.date)} <span className="muted">{shortDate(d.date)}</span></h2>
          <Segmented label={`Cooking effort for ${dayName(d.date)}`} value={d.effort} options={EFFORT_OPTIONS} onChange={(effort) => setDay(i, { effort })} />
          <div className="row-between">
            <Toggle label="Snack" checked={d.snack} onChange={(snack) => setDay(i, { snack })} />
          </div>
          <div className="row-between">
            <span>Cooking for</span>
            <Stepper label="people" value={d.people} onChange={(people) => setDay(i, { people })} unit={d.people === 1 ? 'person' : 'people'} />
          </div>
          {openTargets === d.date ? (
            <div className="targets-edit">
              <label className="field"><span>Calories</span><input type="number" step="any" inputMode="numeric" value={d.kcalTarget} onChange={(e) => setDay(i, { kcalTarget: Number(e.target.value), ownTargets: true })} /></label>
              <label className="field"><span>Fiber (g)</span><input type="number" step="any" inputMode="numeric" value={d.fiberTarget} onChange={(e) => setDay(i, { fiberTarget: Number(e.target.value), ownTargets: true })} /></label>
              <div className="btns">
                <button className="btn" onClick={() => setOpenTargets(null)}>Done</button>
                {d.ownTargets && <button className="btn" onClick={() => { setDay(i, { kcalTarget: kcalNum, fiberTarget: fiberNum, ownTargets: false }); setOpenTargets(null); }}>Use the week's targets</button>}
              </div>
            </div>
          ) : (
            <button className="linkish" onClick={() => setOpenTargets(d.date)}>
              {d.kcalTarget} calories · {d.fiberTarget} g fiber{d.ownTargets ? ' (just this day)' : ''} — Change
            </button>
          )}
        </div>
      ))}

      <button className="btn primary big" disabled={!valid || busy} onClick={generate}>{busy ? 'Planning…' : existing ? 'Make a new plan' : 'Make my plan'}</button>
      {existing && existing.days.some((d) => d.meals.some(isFixed)) && <p className="muted small center">Meals you chose to keep and batch servings stay in place.</p>}
      {onCancel && <button className="btn" onClick={onCancel}>Cancel</button>}
      {!valid && <p className="error">Calories should be between 1000 and 4000, and fiber between 10 and 80 grams.</p>}
    </>
  );
}

// ---------------------------------------------------------------- the week

function WeekView({ plan, onEditSetup }: { plan: WeekPlan; onEditSetup: () => void }) {
  const { settings, pool, batchInfo } = useAppData();
  const ctx = { pool, rules: settings.rules, batches: batchInfo };
  const save = (days: DayPlan[], warnings?: string[]) => savePlan({ ...plan, days, warnings: warnings ?? plan.warnings });

  const updateMeal = (date: string, slot: MealSlot, patch: Partial<PlannedMeal>, retune = false) =>
    save(plan.days.map((d) => {
      if (d.date !== date) return d;
      const next = { ...d, meals: d.meals.map((m) => (m.slot === slot ? { ...m, ...patch } : m)) };
      return retune ? retuneDay(next, ctx) : next;
    }));

  return (
    <>
      {!plan.finalized && (
        <div className="card review-banner">
          <h2>Review your plan</h2>
          <p>Look over the meals and the nutrition below. Swap anything you do not fancy, tap <b>Keep</b> on meals you want to hold on to, then tap <b>Use this plan</b>.</p>
          <button className="btn primary big" onClick={() => void savePlan({ ...plan, finalized: true })}>Use this plan</button>
        </div>
      )}

      {(plan.warnings ?? []).length > 0 && (
        <div className="card warn">
          {(plan.warnings ?? []).map((w) => <p key={w}>{w}</p>)}
        </div>
      )}

      <NutritionReview plan={plan} open={!plan.finalized} />

      {plan.days.map((d) => (
        <DayCard
          key={d.date}
          day={d}
          days={plan.days}
          weekStart={plan.weekStart}
          onToggleLock={(slot, locked) => void updateMeal(d.date, slot, { locked })}
          onSurprise={(slot) => {
            // a fresh pick for this slot (if she had typed something in, the slot opens up again first)
            const open = plan.days.map((x) => (x.date !== d.date ? x : { ...x, meals: x.meals.map((m) => (m.slot === slot ? { slot, recipeId: m.recipeId, portion: 1, people: m.people } : m)) }));
            const r = swapMeal(open, d.date, slot, ctx, newSeed());
            void save(r.days);
          }}
          onPickRecipe={(slot, o: SwapOption) => void updateMeal(d.date, slot, { recipeId: o.recipe.id, custom: undefined, batchId: undefined, portion: o.portion, locked: true }, true)}
          onCustom={(slot, c: CustomMeal) => void updateMeal(d.date, slot, { recipeId: undefined, batchId: undefined, custom: c, portion: 1, locked: true }, true)}
          onRegenerateDay={() => { const r = regenerateDay(plan.days, d.date, ctx, newSeed()); void save(r.days); }}
        />
      ))}

      <div className="card">
        <h2>Change the whole week</h2>
        <button className="btn" onClick={() => { const r = regenerateWeek(plan.days, ctx, newSeed()); void save(r.days, r.warnings); }}>New meals for the whole week</button>
        <p className="muted small">Meals marked Kept stay.</p>
        <button className="btn" onClick={onEditSetup}>Change effort, snacks, people or targets</button>
      </div>
    </>
  );
}

function DayCard({ day, days, weekStart, onToggleLock, onSurprise, onPickRecipe, onCustom, onRegenerateDay }: {
  day: DayPlan;
  days: DayPlan[];
  weekStart: string;
  onToggleLock: (slot: MealSlot, locked: boolean) => void;
  onSurprise: (slot: MealSlot) => void;
  onPickRecipe: (slot: MealSlot, o: SwapOption) => void;
  onCustom: (slot: MealSlot, c: CustomMeal) => void;
  onRegenerateDay: () => void;
}) {
  const { poolById, batchInfo } = useAppData();
  const { open } = useNav();
  const [swapping, setSwapping] = useState<MealSlot | null>(null);
  const close = () => setSwapping(null);
  const recipeIdOf = (m: PlannedMeal) => m.recipeId ?? batchInfo.find((b) => b.id === m.batchId)?.recipeId;
  const kcal = day.meals.reduce((s, m) => s + (poolById.get(recipeIdOf(m) ?? '')?.kcal ?? m.custom?.kcal ?? 0) * m.portion, 0);
  const fiber = day.meals.reduce((s, m) => s + (poolById.get(recipeIdOf(m) ?? '')?.fiber ?? m.custom?.fiber ?? 0) * m.portion, 0);
  const menu = (m: PlannedMeal) =>
    swapping === m.slot && (
      <SwapMenu
        days={days}
        day={day}
        slot={m.slot}
        onClose={close}
        onSurprise={() => { onSurprise(m.slot); close(); }}
        onPickRecipe={(o) => { onPickRecipe(m.slot, o); close(); }}
        onCustom={(c) => { onCustom(m.slot, c); close(); }}
      />
    );
  const actions = (m: PlannedMeal) => (
    <div className="meal-actions">
      <button className={m.locked ? 'chip on' : 'chip'} aria-pressed={!!m.locked} aria-label={m.locked ? 'Kept. Tap to stop keeping this meal' : 'Keep this meal when making new plans'} onClick={() => onToggleLock(m.slot, !m.locked)}>{m.locked ? '✓ Kept' : 'Keep'}</button>
      <button className={swapping === m.slot ? 'chip on' : 'chip'} aria-expanded={swapping === m.slot} onClick={() => setSwapping(swapping === m.slot ? null : m.slot)}>Swap ▾</button>
    </div>
  );
  return (
    <section className="day" aria-label={dayName(day.date)}>
      <div className="day-head">
        <h2>{dayName(day.date)} <span className="muted">{shortDate(day.date)}</span></h2>
        <EffortBadge effort={day.effort} />
      </div>
      <p className="muted day-sub">{kcalText(kcal)} of {day.kcalTarget} · {Math.round(fiber)} g fiber of {day.fiberTarget} · for {day.people}{day.snack ? '' : ' · no snack'}</p>
      {(day.warnings ?? []).map((w) => <p key={w} className="warn-line">{w}</p>)}
      {day.meals.map((m) => {
        const rid = recipeIdOf(m);
        const p = poolById.get(rid ?? '');
        if (m.custom) {
          return (
            <div key={m.slot} className={m.locked ? 'meal-card locked' : 'meal-card'}>
              <div className="meal-main static">
                <span className="meal-slot">{SLOT_LABEL[m.slot]} · your own</span>
                <span className="meal-name">{m.custom.name}</span>
                <span className="meal-meta"><span>{m.custom.kcal !== undefined ? kcalText(m.custom.kcal) : 'calories not entered'}</span></span>
              </div>
              {actions(m)}
              {menu(m)}
            </div>
          );
        }
        if (!p) return <div key={m.slot} className="meal-card empty">{SLOT_LABEL[m.slot]}: nothing planned{actions(m)}{menu(m)}</div>;
        return (
          <div key={m.slot} className={m.locked ? 'meal-card locked' : 'meal-card'}>
            <button className="meal-main" onClick={() => open({ name: 'recipe', recipeId: p.id, meal: { weekStart, date: day.date, slot: m.slot } })}>
              <span className="meal-slot">{SLOT_LABEL[m.slot]}{m.batchId ? ' · from your batch' : ''}</span>
              <span className="meal-name">{p.recipe.name}</span>
              <span className="meal-meta">
                <EffortBadge effort={p.effort} />
                <span>{minutesText(p.recipe.totalMin)}</span>
                <span>{kcalText(p.kcal * m.portion)}</span>
                {m.portion !== 1 && <span>{formatQty(m.portion)} servings</span>}
              </span>
            </button>
            {!m.batchId && actions(m)}
            {menu(m)}
          </div>
        );
      })}
      <button className="btn subtle" onClick={onRegenerateDay}>New meals for {dayName(day.date)}</button>
    </section>
  );
}

// ---------------------------------------------------------------- nutrition review

function NutritionReview({ plan, open }: { plan: WeekPlan; open: boolean }) {
  const { pool, settings, batchInfo } = useAppData();
  const [dayOpen, setDayOpen] = useState<string | null>(null);
  const n = planNutrition(plan.days, pool, batchInfo);
  const targets = dailyTargets(settings.sex, settings.age, plan.days[0]?.kcalTarget ?? settings.kcal, plan.days[0]?.fiberTarget ?? settings.fiber);
  const flags = consistentFlags(
    n.days.map((d) => ({
      amount: Object.fromEntries(Object.entries(d.totals).map(([k, v]) => [k, v.amount])) as never,
      partial: Object.fromEntries(Object.entries(d.totals).map(([k, v]) => [k, v.partial])) as never,
    })),
    targets,
  );
  const avgKcal = n.days.reduce((s, d) => s + d.kcalTarget, 0) / Math.max(1, n.days.length);
  const avgFiber = n.days.reduce((s, d) => s + d.fiberTarget, 0) / Math.max(1, n.days.length);
  return (
    <details className="card review" open={open}>
      <summary><h2>Nutrition for this plan</h2></summary>
      {flags.length > 0 ? (
        <div className="flags">
          {flags.map((f) => (
            <p key={f.key + f.kind} className={f.kind === 'low' ? 'flag low' : 'flag high'}>
              {NUTRIENT_INFO[f.key].label} is {f.kind === 'low' ? 'low' : 'high'} on {f.days} of {n.days.length} days (about {Math.round(f.avgPct)}% of {f.kind === 'low' ? 'target' : 'the limit'} on average).
            </p>
          ))}
        </div>
      ) : (
        <p className="ok-line">No nutrients are consistently low or high this week.</p>
      )}
      <h3>Each day</h3>
      <div className="daytable">
        {n.days.map((d) => {
          const kOk = Math.abs(d.totals.kcal.amount - d.kcalTarget) / d.kcalTarget <= 0.05;
          const fOk = d.totals.fiber.amount >= d.fiberTarget;
          return (
            <div key={d.date}>
              <button className="dayrow" aria-expanded={dayOpen === d.date} onClick={() => setDayOpen(dayOpen === d.date ? null : d.date)}>
                <span className="dname">{dayName(d.date, 'short')}</span>
                <span className={kOk ? 'ok' : 'off'}>{Math.round(d.totals.kcal.amount)} / {d.kcalTarget} cal</span>
                <span className={fOk ? 'ok' : 'off'}>{Math.round(d.totals.fiber.amount)} / {d.fiberTarget} g fiber</span>
              </button>
              {dayOpen === d.date && <NutritionPanel totals={d.totals} kcalTarget={d.kcalTarget} fiberTarget={d.fiberTarget} compact />}
            </div>
          );
        })}
      </div>
      <h3>Weekly average per day</h3>
      <NutritionPanel totals={n.weeklyAverage} kcalTarget={Math.round(avgKcal)} fiberTarget={Math.round(avgFiber)} compact={!open} />
    </details>
  );
}

