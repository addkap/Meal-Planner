// The Today tab: check off planned meals ("I ate this"), log anything else, and see the day's nutrition.
// Past days can be opened and changed with the arrows.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAppData } from '../AppData';
import { useNav } from '../nav';
import { plannedEntryId, removeLog, setDayTargets, setPlannedEaten } from '../store';
import { addDays, dayName, shortDate, todayLocal, weekStartOf } from '../lib/dates';
import { entryTotals, summarizeDay, targetsFor } from '../lib/log';
import { batchStatus } from '../lib/batch';
import { macroSplit } from '../lib/nutrition';
import { NUTRIENT_INFO } from '../lib/nutrients';
import { formatAmount, formatQty } from '../lib/units';
import NutritionPanel from '../components/NutritionPanel';
import { kcalText } from '../components/ui';
import type { LogEntry, MealSlot, PlannedMeal } from '../types';

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const SLOT_LABEL: Record<MealSlot, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };

export default function TodayPage() {
  const { settings, foods, recipes, batchInfo } = useAppData();
  const { open } = useNav();
  const today = todayLocal();
  const [date, setDate] = useState(today);
  const entries = useLiveQuery(() => db.logs.where('date').equals(date).toArray(), [date]);
  const plan = useLiveQuery(async () => (await db.plans.get(weekStartOf(date))) ?? null, [date]);
  const override = useLiveQuery(async () => (await db.dayTargets.get(date)) ?? null, [date]);
  const [editTargets, setEditTargets] = useState(false);
  if (!entries || plan === undefined || override === undefined) return null;

  const ctx = { foods, recipes, batchRecipe: new Map(batchInfo.map((b) => [b.id, b.recipeId])) };
  const live = entries.filter((e) => !e.deletedAt);
  const sum = summarizeDay(live, ctx);
  const planDay = plan && !plan.deletedAt ? plan.days.find((d) => d.date === date) : undefined;
  const t = targetsFor(date, override && !override.deletedAt ? override : undefined, planDay, settings);
  const split = macroSplit(sum.totals);
  const title = date === today ? 'Today' : date === addDays(today, -1) ? 'Yesterday' : dayName(date);
  const micros = sum.partial.filter((k) => NUTRIENT_INFO[k].group !== 'macro');

  return (
    <>
      <div className="weekbar">
        <button className="arrow" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}>‹</button>
        <div className="weekbar-title">
          <h1>{title}</h1>
          <span className="muted">{dayName(date)}, {shortDate(date)}</span>
        </div>
        <button className="arrow" aria-label="Next day" disabled={date >= today} onClick={() => setDate(addDays(date, 1))}>›</button>
      </div>

      <section className="card summary">
        <Progress label="Calories" value={sum.totals.kcal.amount} target={t.kcal} unit="" />
        <Progress label="Fiber" value={sum.totals.fiber.amount} target={t.fiber} unit=" g" atLeast={sum.totals.fiber.partial} />
        <p className="macro-line">Protein {Math.round(sum.totals.protein.amount)} g · Carbs {Math.round(sum.totals.carbs.amount)} g · Fat {Math.round(sum.totals.fat.amount)} g
          {sum.totals.kcal.amount > 0 && <span className="muted"> ({Math.round(split.protein * 100)}% / {Math.round(split.carbs * 100)}% / {Math.round(split.fat * 100)}%)</span>}
        </p>
        {micros.length > 0 && (
          <p className="partial-note">Partial data: some foods today do not list {micros.slice(0, 3).map((k) => NUTRIENT_INFO[k].label).join(', ')}{micros.length > 3 ? ` and ${micros.length - 3} more` : ''}. Those totals are "at least".</p>
        )}
        {editTargets ? (
          <TargetsEditor date={date} kcal={t.kcal} fiber={t.fiber} overridden={t.overridden} onDone={() => setEditTargets(false)} />
        ) : (
          <button className="linkish" onClick={() => setEditTargets(true)}>Targets: {t.kcal} calories, {t.fiber} g fiber{t.overridden ? ' (just this day)' : ''}. Change</button>
        )}
      </section>

      {SLOTS.map((slot) => {
        const meal = planDay?.meals.find((m) => m.slot === slot);
        const s = sum.slots.find((x) => x.slot === slot)!;
        const plannedId = meal ? plannedEntryId(date, meal) : '';
        const extras = s.entries.filter((e) => e.id !== plannedId);
        if (!meal && slot === 'snack' && !extras.length && planDay && !planDay.snack) {
          return (
            <section key={slot} className="slot">
              <div className="slot-head"><h2>Snack</h2></div>
              <button className="btn subtle" onClick={() => open({ name: 'log', date, slot })}>+ Add a snack</button>
            </section>
          );
        }
        return (
          <section key={slot} className="slot">
            <div className="slot-head">
              <h2>{SLOT_LABEL[slot]}</h2>
              {s.totals.kcal.amount > 0 && <span className="muted">{kcalText(s.totals.kcal.amount)} · P {Math.round(s.totals.protein.amount)} · C {Math.round(s.totals.carbs.amount)} · F {Math.round(s.totals.fat.amount)} g</span>}
            </div>
            {meal && <PlannedRow date={date} meal={meal} entry={live.find((e) => e.id === plannedId)} />}
            {extras.map((e) => <ExtraRow key={e.id} e={e} kcal={entryTotals(e, ctx).kcal.amount} date={date} />)}
            <button className="btn subtle" onClick={() => open({ name: 'log', date, slot })}>+ {meal ? 'Log something else' : `Add ${slot === 'snack' ? 'a snack' : SLOT_LABEL[slot].toLowerCase()}`}</button>
          </section>
        );
      })}

      <section className="card">
        <h2>Nutrition for the day</h2>
        <NutritionPanel totals={sum.totals} kcalTarget={t.kcal} fiberTarget={t.fiber} compact />
      </section>
    </>
  );
}

function Progress({ label, value, target, unit, atLeast }: { label: string; value: number; target: number; unit: string; atLeast?: boolean }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const left = Math.round(target - value);
  return (
    <div className="progress">
      <div className="row-between">
        <span><b>{label}</b></span>
        <span><b>{atLeast ? '≥ ' : ''}{Math.round(value)}{unit}</b> of {target}{unit}</span>
      </div>
      <div className="pbar" aria-hidden><span style={{ width: `${pct}%` }} /></div>
      <span className="muted small">{left > 0 ? `${left}${unit} to go` : left === 0 ? 'Right on target' : `${-left}${unit} over`}</span>
    </div>
  );
}

function PlannedRow({ date, meal, entry }: { date: string; meal: PlannedMeal; entry?: LogEntry }) {
  const { poolById, batchInfo, batches } = useAppData();
  const { open } = useNav();
  const [custom, setCustom] = useState<string | null>(null);
  const recipeId = meal.recipeId ?? batchInfo.find((b) => b.id === meal.batchId)?.recipeId;
  const p = poolById.get(recipeId ?? '');
  const name = meal.custom?.name ?? p?.recipe.name ?? 'Planned meal';
  const perServing = p?.kcal ?? meal.custom?.kcal ?? 0;
  const eaten = !!entry;
  const qty = entry?.qty ?? meal.portion;
  const set = (q: number | null) => void setPlannedEaten(date, meal, name, q);
  const choices = [...new Set([0.5, 1, meal.portion, 1.5])].sort((a, b) => a - b);
  const logs = useLiveQuery(async (): Promise<LogEntry[]> => (meal.batchId ? db.logs.toArray() : []), [meal.batchId]);
  const batch = batches.find((b) => b.id === meal.batchId);
  const batchLeft = batch && logs ? Math.round(batchStatus(batch, logs, [], date).left * 10) / 10 : null;
  return (
    <div className={eaten ? 'logrow eaten' : 'logrow'}>
      <div className="item-main">
        <button className={eaten ? 'check on' : 'check'} role="checkbox" aria-checked={eaten} aria-label={`I ate ${name}`} onClick={() => set(eaten ? null : meal.portion)}>{eaten ? '✓' : ''}</button>
        <div className="item-text static">
          <span className="item-name">{eaten ? '' : 'I ate this: '}{name}</span>
          <span className="muted small">{meal.batchId ? `From your batch${batchLeft !== null ? ` (${batchLeft} left)` : ''} · ` : ''}{perServing ? kcalText(perServing * qty) : 'calories not entered'} · {formatQty(qty)} {qty <= 1 ? 'serving' : 'servings'}{qty === meal.portion ? ' (as planned)' : ''}</span>
        </div>
        {p && <button className="chip small-chip" onClick={() => open({ name: 'recipe', recipeId: p.id })}>Recipe</button>}
      </div>
      {eaten && (
        <div className="amounts">
          <span className="muted small">How much did you eat?</span>
          <div className="sort-chips">
            {choices.map((c) => (
              <button key={c} className={Math.abs(qty - c) < 1e-9 ? 'chip on' : 'chip'} onClick={() => set(c)}>{c === 0.5 ? 'Half' : formatQty(c)}{c === meal.portion && c !== 0.5 ? ' (planned)' : ''}</button>
            ))}
            <button className={custom !== null ? 'chip on' : 'chip'} onClick={() => setCustom(String(qty))}>Other</button>
          </div>
          {custom !== null && (
            <form noValidate className="row-between" onSubmit={(e) => { e.preventDefault(); const n = Number(custom); if (n > 0) set(n); setCustom(null); }}>
              <label className="field inline"><span>Servings</span><input type="number" inputMode="decimal" step="any" min="0.1" value={custom} onChange={(e) => setCustom(e.target.value)} autoFocus /></label>
              <button className="chip" type="submit">Save</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function ExtraRow({ e, kcal, date }: { e: LogEntry; kcal: number; date: string }) {
  const { open } = useNav();
  const amount = e.kind === 'food' ? `${formatAmount(e.qty, e.unit ?? 'g')}` : `${formatQty(e.qty)} ${e.qty <= 1 ? 'serving' : 'servings'}`;
  return (
    <div className="logrow extra">
      <div className="item-main">
        <button className="item-text" onClick={() => open({ name: 'log', date, slot: e.slot, editId: e.id })}>
          <span className="item-name">{e.label}</span>
          <span className="muted small">{amount} · {kcalText(kcal)}</span>
        </button>
        <button className="chip small-chip" aria-label={`Remove ${e.label}`} onClick={() => void removeLog(e.id)}>Remove</button>
      </div>
    </div>
  );
}

function TargetsEditor({ date, kcal, fiber, overridden, onDone }: { date: string; kcal: number; fiber: number; overridden: boolean; onDone: () => void }) {
  const [k, setK] = useState(String(kcal));
  const [f, setF] = useState(String(fiber));
  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void setDayTargets(date, { kcal: Number(k) || undefined, fiber: Number(f) || undefined }).then(onDone); }}>
      <label className="field"><span>Calories for this day</span><input type="number" step="any" inputMode="numeric" value={k} onChange={(e) => setK(e.target.value)} /></label>
      <label className="field"><span>Fiber for this day (g)</span><input type="number" step="any" inputMode="numeric" value={f} onChange={(e) => setF(e.target.value)} /></label>
      <div className="btns">
        <button className="btn primary" type="submit">Save</button>
        {overridden && <button className="btn" type="button" onClick={() => void setDayTargets(date, null).then(onDone)}>Use the usual targets</button>}
        <button className="btn" type="button" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

