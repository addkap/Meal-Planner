// Batch cooking: "I made a batch" (pick the recipe, how many servings, when, how many to freeze, then which meals
// it covers), planning leftovers into a week, and the list of batches with servings left.
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAppData } from '../AppData';
import { useNav } from '../nav';
import { saveBatch, saveMyRecipe, savePlan, updateBatch } from '../store';
import { batchStatus, batchWarning, fittingSlots, placeBatch, statusText, suggestSlots, type SlotRef } from '../lib/batch';
import { addDays, dayName, shortDate, todayLocal, weekStartOf } from '../lib/dates';
import { newId } from '../lib/ids';
import { rebalanceWeek } from '../lib/planner';
import { makeIndex } from '../lib/search';
import { BackBar, EffortBadge, kcalText, Stepper } from '../components/ui';
import RecipeEditorPage from './RecipeEditorPage';
import type { Batch, MealSlot, WeekPlan } from '../types';

const SLOT_LABEL: Record<MealSlot, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
const newSeed = () => Math.floor(Math.random() * 1e9);

// ---------------------------------------------------------------- "I made a batch"

export function BatchNewPage() {
  const { pool, recipes, hiddenIds } = useAppData();
  const { back } = useNav();
  const [step, setStep] = useState<'recipe' | 'new-recipe' | 'details' | 'slots'>('recipe');
  const [recipeId, setRecipeId] = useState('');
  const [q, setQ] = useState('');
  const today = todayLocal();
  const [made, setMade] = useState(8);
  const [frozen, setFrozen] = useState(0);
  const [cookedOn, setCookedOn] = useState(today);
  const [batchId] = useState(() => newId());

  const search = useMemo(() => makeIndex(pool.filter((p) => !hiddenIds.has(p.id)).map((p) => ({ id: p.id, name: p.recipe.name, boost: p.tags.has('batch-friendly') ? 2 : 0, p }))), [pool, hiddenIds]);
  const list = q.trim() ? search(q, 30) : pool.filter((p) => p.tags.has('batch-friendly') && !hiddenIds.has(p.id)).map((p) => ({ id: p.id, name: p.recipe.name, p }));
  const recipe = recipes.get(recipeId);

  if (step === 'new-recipe') {
    return (
      <>
        <BackBar onBack={() => setStep('recipe')} />
        <RecipeEditorPage forBatch onSaved={(r) => { setRecipeId(r.id); setMade(r.servings); setStep('details'); }} />
      </>
    );
  }

  return (
    <>
      <BackBar onBack={step === 'recipe' ? back : () => setStep(step === 'slots' ? 'details' : 'recipe')} />
      {step === 'recipe' && (
        <>
          <h1>I made a batch</h1>
          <p className="lead">What did you make?</p>
          <input className="search" type="search" placeholder="Search recipes" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search recipes" />
          {!q.trim() && <p className="muted">Good for batch cooking:</p>}
          {list.map((r) => (
            <button key={r.id} className="recipe-row" onClick={() => { setRecipeId(r.id); setMade(Math.max(r.p.recipe.servings, 4)); setStep('details'); }}>
              <span className="meal-name">{r.name}</span>
              <span className="meal-meta"><EffortBadge effort={r.p.effort} /><span>makes {r.p.recipe.servings}</span><span>{kcalText(r.p.kcal)} per serving</span></span>
            </button>
          ))}
          <button className="btn" onClick={() => setStep('new-recipe')}>Something else: type in the recipe</button>
        </>
      )}

      {step === 'details' && recipe && (
        <>
          <h1>{recipe.name}</h1>
          <section className="card">
            <div className="row-between"><span>Servings you made</span><Stepper label="servings made" value={made} min={1} max={60} onChange={(n) => { setMade(n); setFrozen(Math.min(frozen, n)); }} /></div>
            <p className="muted small">The recipe as written makes {recipe.servings}. {recipe.about ?? ''}</p>
            <label className="field"><span>Day you cooked it (or will cook it)</span><input type="date" value={cookedOn} onChange={(e) => setCookedOn(e.target.value || today)} /></label>
            {cookedOn > today && <p className="muted small">Not cooked yet: its ingredients go on that week's grocery list, scaled to {made} servings.</p>}
            <div className="row-between"><span>Servings to freeze</span><Stepper label="servings to freeze" value={frozen} min={0} max={made} onChange={setFrozen} /></div>
            <p className="muted small">Frozen servings are kept aside. Take them out later from "Your batches".</p>
          </section>
          <button className="btn primary big" onClick={() => setStep('slots')}>Next: which meals?</button>
        </>
      )}

      {step === 'slots' && recipe && (
        <SlotPicker
          title={`Which meals will ${recipe.name.toLowerCase()} cover?`}
          batch={{ id: batchId, updatedAt: 0, recipeId, servingsMade: made, frozen, cookedOn, cooked: cookedOn <= today }}
          available={made - frozen}
          weekStart={weekStartOf(cookedOn)}
          from={cookedOn}
          onDone={back}
          createBatch
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------- choosing the meals

function SlotPicker({ title, batch, available, weekStart: start, from, onDone, createBatch }: { title: string; batch: Batch; available: number; weekStart: string; from: string; onDone: () => void; createBatch?: boolean }) {
  const { poolById, settings, pool, batchInfo } = useAppData();
  const { setTab } = useNav();
  const [weekStart, setWeekStart] = useState(start);
  const plan = useLiveQuery(async () => (await db.plans.get(weekStart)) ?? null, [weekStart]);
  const p = poolById.get(batch.recipeId);
  const [chosen, setChosen] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);
  if (plan === undefined || !p) return null;
  const live = plan && !plan.deletedAt ? plan : null;
  const fromDate = weekStart > from ? weekStart : from;
  const fits = live ? fittingSlots(p, live.days, fromDate) : [];
  const key = (s: SlotRef) => `${s.date}|${s.slot}`;
  const already = live ? live.days.flatMap((d) => d.meals.filter((m) => m.batchId === batch.id).map((m) => `${d.date}|${m.slot}`)) : [];
  const current = chosen ?? new Set(already.length ? already : live ? suggestSlots(p, live.days, fromDate, available).map(key) : []);
  const toggle = (k: string) => { const next = new Set(current); if (next.has(k)) next.delete(k); else next.add(k); setChosen(next); };
  const over = current.size - Math.floor(available + 1e-9);

  async function finish(plan: WeekPlan | null) {
    setBusy(true);
    if (createBatch) await saveBatch(batch);
    if (plan) {
      const slots = [...current].map((k) => { const [date, slot] = k.split('|'); return { date, slot: slot as MealSlot }; });
      const placed = placeBatch(plan.days, batch, slots);
      const batches = [...batchInfo.filter((b) => b.id !== batch.id), { id: batch.id, recipeId: batch.recipeId, cookedOn: batch.cookedOn, cooked: batch.cooked }];
      const res = rebalanceWeek(placed, { pool, rules: settings.rules, batches }, newSeed());
      await savePlan({ ...plan, days: res.days, warnings: res.warnings });
    }
    setBusy(false);
    onDone();
    setTab('Plan');
  }

  return (
    <>
      <h1>{title}</h1>
      <div className="weekbar">
        <button className="arrow" aria-label="Previous week" onClick={() => { setWeekStart(addDays(weekStart, -7)); setChosen(null); }}>‹</button>
        <div className="weekbar-title"><b>Week of {shortDate(weekStart)}</b></div>
        <button className="arrow" aria-label="Next week" onClick={() => { setWeekStart(addDays(weekStart, 7)); setChosen(null); }}>›</button>
      </div>
      {!live ? (
        <div className="card">
          <p>There is no plan for this week yet. {createBatch ? 'The batch is saved, and you can put its servings into a plan later from "Your batches".' : 'Make a plan first, then come back.'}</p>
          {createBatch && <button className="btn primary" disabled={busy} onClick={() => void finish(null)}>Save the batch</button>}
        </div>
      ) : (
        <>
          <p className="lead">{current.size} of {Math.floor(available + 1e-9)} servings placed</p>
          {over > 0 && <p className="warn-line">That is {over} more than you have. Fewer meals, or take some out of the freezer.</p>}
          <div className="btns">
            <button className="btn" onClick={() => setChosen(new Set(suggestSlots(p, live.days, fromDate, available, true).map(key)))}>Fill any that fit</button>
            <button className="btn" onClick={() => setChosen(new Set())}>Clear</button>
          </div>
          {live.days.filter((d) => fits.some((f) => f.date === d.date)).map((d) => (
            <div key={d.date} className="slot-day">
              <b>{dayName(d.date)} <span className="muted">{shortDate(d.date)}</span></b>
              <div className="sort-chips">
                {fits.filter((f) => f.date === d.date).map((f) => (
                  <button key={key(f)} className={current.has(key(f)) ? 'chip on' : 'chip'} aria-pressed={current.has(key(f))} onClick={() => toggle(key(f))}>
                    {current.has(key(f)) ? '✓ ' : ''}{SLOT_LABEL[f.slot]}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {fits.length === 0 && <p className="muted">No open meals this week suit this recipe (it fits {p.meals.join(' or ')}).</p>}
          <p className="muted small">The rest of the week is re-planned around these meals so calories, fiber and the diet rules still work out. Meals you are keeping stay.</p>
          <button className="btn primary big" disabled={busy} onClick={() => void finish(live)}>{busy ? 'Planning…' : 'Put them in the plan'}</button>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------- planning leftovers

export function BatchPlanPage({ batchId, weekStart: wanted }: { batchId: string; weekStart?: string }) {
  const { batches, recipes } = useAppData();
  const { back } = useNav();
  const logs = useLiveQuery(() => db.logs.toArray(), []);
  const plans = useLiveQuery(() => db.plans.toArray(), []);
  const b = batches.find((x) => x.id === batchId);
  if (!b || !logs || !plans) return null;
  const today = todayLocal();
  const s = batchStatus(b, logs, plans, today);
  const week = wanted ?? weekStartOf(today);
  // Servings already planned in OTHER weeks are spoken for; the ones in this week can be moved around.
  const inThisWeek = batchStatus(b, logs, plans.filter((p) => p.id === week), today).plannedAhead;
  const available = Math.max(0, s.left - (s.plannedAhead - inThisWeek));
  return (
    <>
      <BackBar onBack={back} />
      <SlotPicker title={`Plan ${recipes.get(b.recipeId)?.name.toLowerCase() ?? 'this batch'}`} batch={b} available={available} weekStart={week} from={today > b.cookedOn ? today : b.cookedOn} onDone={back} />
    </>
  );
}

// ---------------------------------------------------------------- your batches

export function BatchesPage() {
  const { batches, recipes, hiddenIds } = useAppData();
  const { back, open } = useNav();
  const logs = useLiveQuery(() => db.logs.toArray(), []);
  const plans = useLiveQuery(() => db.plans.toArray(), []);
  const [showDone, setShowDone] = useState(false);
  if (!logs || !plans) return null;
  const today = todayLocal();
  const rows = batches
    .map((b) => ({ b, r: recipes.get(b.recipeId), s: batchStatus(b, logs, plans, today) }))
    .sort((x, y) => y.b.cookedOn.localeCompare(x.b.cookedOn));
  const active = rows.filter((x) => !x.b.finished && (x.s.left > 0 || x.s.frozen > 0 || !x.b.cooked));
  const done = rows.filter((x) => !active.includes(x));

  const card = ({ b, r, s }: (typeof rows)[number]) => {
    const name = r?.name ?? 'Batch';
    const warn = batchWarning(name, s);
    return (
      <div key={b.id} className="card batch-card">
        <h2>{name}</h2>
        <p className="muted">{b.cooked ? `Cooked ${dayName(b.cookedOn)} ${shortDate(b.cookedOn)}` : `To cook ${dayName(b.cookedOn)} ${shortDate(b.cookedOn)}`}</p>
        <p className="lead">{statusText(s)}</p>
        {warn && <p className="warn-line">{warn}</p>}
        {!b.finished && (
          <>
            <button className="btn primary" onClick={() => open({ name: 'batch-plan', batchId: b.id })}>Put servings in this week's plan</button>
            {!b.cooked && <button className="btn" onClick={() => void updateBatch(b.id, { cooked: true, cookedOn: b.cookedOn > today ? today : b.cookedOn })}>I cooked it</button>}
            {b.frozen > 0 && <button className="btn" onClick={() => void updateBatch(b.id, { frozen: b.frozen - 1 })}>Take 1 serving out of the freezer</button>}
            {s.left > 0 && <button className="btn" onClick={() => void updateBatch(b.id, { frozen: b.frozen + 1 })}>Put 1 serving in the freezer</button>}
            <button className="btn subtle" onClick={() => void updateBatch(b.id, { finished: true })}>It's all gone</button>
          </>
        )}
        {r && hiddenIds.has(r.id) && (
          <button className="btn" onClick={() => void db.myRecipes.get(r.id).then((mine) => mine && saveMyRecipe({ ...mine, hidden: undefined }))}>Save this as a recipe</button>
        )}
      </div>
    );
  };

  return (
    <>
      <BackBar onBack={back} />
      <h1>Your batches</h1>
      <button className="btn primary big" onClick={() => open({ name: 'batch-new' })}>I made a batch</button>
      {active.length === 0 && <p className="muted">No batches on the go. When you cook a big batch (like 12 egg bites), tap "I made a batch" and the plan will use it.</p>}
      {active.map(card)}
      {done.length > 0 && (
        <>
          <button className="linkish" onClick={() => setShowDone(!showDone)}>{showDone ? 'Hide' : 'Show'} finished batches ({done.length})</button>
          {showDone && done.map(card)}
        </>
      )}
    </>
  );
}
