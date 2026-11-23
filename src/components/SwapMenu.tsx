// The Swap menu under a meal: a surprise pick, suggestions that keep the plan's rules, every recipe for that
// meal (with a note when one would break a rule), or typing in her own meal.
import { useMemo, useState } from 'react';
import { useAppData } from '../AppData';
import { swapOptions, type SwapOption } from '../lib/planner';
import { formatQty } from '../lib/units';
import { EffortBadge, kcalText, minutesText } from './ui';
import type { CustomMeal, DayPlan, MealSlot } from '../types';
import { useWeeksBefore } from '../useWeeksBefore';

const SLOT_WORD: Record<MealSlot, string> = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', snack: 'snack' };

export default function SwapMenu({ days, day, slot, onSurprise, onPickRecipe, onCustom, onClose }: {
  days: DayPlan[];
  day: DayPlan;
  slot: MealSlot;
  onSurprise: () => void;
  onPickRecipe: (o: SwapOption) => void;
  onCustom: (c: CustomMeal) => void;
  onClose: () => void;
}) {
  const { pool, settings, batchInfo } = useAppData();
  const before = useWeeksBefore(days[0]?.date ?? day.date);
  const options = useMemo(() => swapOptions(days, day.date, slot, { pool, rules: settings.rules, batches: batchInfo, ...before }), [days, day.date, slot, pool, settings.rules, batchInfo, before]);
  const [mode, setMode] = useState<'menu' | 'all' | 'custom'>('menu');
  const [q, setQ] = useState('');
  const current = day.meals.find((m) => m.slot === slot)?.custom;
  const [name, setName] = useState(current?.name ?? '');
  const [kcal, setKcal] = useState(current?.kcal !== undefined ? String(current.kcal) : '');
  const [fiber, setFiber] = useState(current?.fiber !== undefined ? String(current.fiber) : '');

  const suggestions = options.filter((o) => o.fits).slice(0, 6);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const all = options.filter((o) => words.every((w) => o.recipe.recipe.name.toLowerCase().includes(w)));

  const Row = ({ o }: { o: SwapOption }) => (
    <button className="swap-row" onClick={() => onPickRecipe(o)}>
      <span className="meal-name">{o.recipe.recipe.name}</span>
      <span className="meal-meta">
        <EffortBadge effort={o.recipe.effort} />
        <span>{minutesText(o.recipe.recipe.totalMin)}</span>
        <span>{kcalText(o.recipe.kcal * o.portion)}{o.portion !== 1 ? ` (${formatQty(o.portion)} servings)` : ''}</span>
      </span>
      {!o.fits && <span className="swap-note">Does not fit this week's plan: {o.breaks[0]}</span>}
    </button>
  );

  return (
    <div className="swap-menu" role="dialog" aria-label={`Swap ${SLOT_WORD[slot]}`}>
      <div className="row-between">
        <h3>Swap {SLOT_WORD[slot]}</h3>
        <button className="chip" onClick={onClose}>Close</button>
      </div>

      {mode === 'menu' && (
        <>
          <button className="btn primary" onClick={onSurprise}>Pick one for me</button>
          <p className="muted small">Or choose one of these. They all fit this week's plan.</p>
          {suggestions.map((o) => <Row key={o.recipe.id} o={o} />)}
          {suggestions.length === 0 && <p className="muted">No other recipes fit this week's rules here. You can still choose any recipe below.</p>}
          <button className="btn" onClick={() => setMode('all')}>Show all {SLOT_WORD[slot]} recipes</button>
          <button className="btn" onClick={() => setMode('custom')}>Type in my own {SLOT_WORD[slot]}</button>
        </>
      )}

      {mode === 'all' && (
        <>
          <input className="search" type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${SLOT_WORD[slot]} recipes`} />
          {all.map((o) => <Row key={o.recipe.id} o={o} />)}
          <button className="btn" onClick={() => setMode('menu')}>‹ Back to suggestions</button>
        </>
      )}

      {mode === 'custom' && (
        <form noValidate onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; onCustom({ name: name.trim(), kcal: kcal ? Number(kcal) : undefined, fiber: fiber ? Number(fiber) : undefined }); }}>
          <label className="field"><span>What are you having?</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dinner out, leftover soup" autoFocus /></label>
          <label className="field"><span>About how many calories? (optional)</span><input type="number" step="any" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} /></label>
          <label className="field"><span>Fiber in grams (optional)</span><input type="number" step="any" inputMode="numeric" value={fiber} onChange={(e) => setFiber(e.target.value)} /></label>
          <p className="muted small">The rest of the day is planned around it. Nutrients you do not enter show as "not listed".</p>
          <button className="btn primary" type="submit" disabled={!name.trim()}>Save</button>
          <button className="btn" type="button" onClick={() => setMode('menu')}>‹ Back</button>
        </form>
      )}
    </div>
  );
}
