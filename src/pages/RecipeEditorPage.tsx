// Typing in her own recipe (or editing one). Nutrition, diet tags and the main protein are worked out from the
// ingredients as she goes; effort comes from the total time unless she picks it.
import { useMemo, useState } from 'react';
import { useAppData } from '../AppData';
import { BUILTIN_BY_ID } from '../data/recipes';
import { useNav } from '../nav';
import { saveMyRecipe } from '../store';
import { newId } from '../lib/ids';
import { draftProblems, draftToRecipe, HAND_TAGS, recipeToDraft, suggestProtein, suggestTags, type RecipeDraft } from '../lib/myRecipes';
import { buildPool, explainPlacement } from '../lib/pool';
import { EFFORT_LABEL, effortFor, recipeNutrition } from '../lib/recipes';
import { makeIndex } from '../lib/search';
import { ingredientText, toGrams, unitsFor } from '../lib/units';
import NutritionPanel from '../components/NutritionPanel';
import { BackBar, kcalText, Segmented, Stepper } from '../components/ui';
import type { Effort, Food, MealSlot, MyRecipe, ProteinKind } from '../types';

const MEALS: { value: MealSlot; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' }, { value: 'lunch', label: 'Lunch' }, { value: 'dinner', label: 'Dinner' }, { value: 'snack', label: 'Snack' },
];
const PROTEINS: ProteinKind[] = ['none', 'salmon', 'white-fish', 'shrimp', 'tuna', 'sardines', 'trout', 'shellfish', 'chicken', 'turkey', 'beef', 'lamb', 'pork', 'chickpeas', 'lentils', 'white-beans', 'black-beans', 'kidney-beans', 'mixed-beans', 'edamame', 'tofu', 'eggs', 'yogurt', 'cheese', 'nuts'];
const proteinLabel = (p: ProteinKind) => (p === 'none' ? 'No main protein' : p.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()));

const emptyDraft = (): RecipeDraft => ({ name: '', meal: 'dinner', alsoFor: [], servings: 4, activeMin: 15, totalMin: 30, tags: [], ingredients: [], steps: '' });

/**
 * `forBatch`: typed in during "I made a batch"; she can choose whether it is also saved to My recipes.
 * Calls onSaved with the saved recipe instead of going back.
 */
export default function RecipeEditorPage({ id, forBatch, onSaved }: { id?: string; forBatch?: boolean; onSaved?: (r: MyRecipe) => void }) {
  const { recipes, foods } = useAppData();
  const { back } = useNav();
  const existing = id ? recipes.get(id) : undefined;
  // A built-in recipe: her version is saved under the same id and replaces the original until she undoes it.
  const builtin = id ? BUILTIN_BY_ID.get(id) : undefined;
  const [d, setD] = useState<RecipeDraft>(() => (existing ? recipeToDraft(existing) : emptyDraft()));
  const [keep, setKeep] = useState(true);
  const [showErrors, setShowErrors] = useState(false);
  const set = (patch: Partial<RecipeDraft>) => setD((x) => ({ ...x, ...patch }));

  const preview = useMemo(() => draftToRecipe(d, foods, d.id ?? 'preview', 0), [d, foods]);
  const nutrition = d.ingredients.length ? recipeNutrition(preview, foods) : null;
  const suggested = suggestProtein(preview, foods);
  const why = d.ingredients.length && d.name ? explainPlacement(buildPool([preview], foods)[0]) : [];
  const problems = draftProblems(d);

  async function save() {
    if (problems.length) { setShowErrors(true); return; }
    const r = draftToRecipe(d, foods, d.id ?? `mine-${newId()}`, Date.now(), forBatch ? !keep : false);
    if (builtin) r.basedOn = builtin.id;
    await saveMyRecipe(r);
    if (onSaved) onSaved(r);
    else back();
  }

  return (
    <>
      {!forBatch && <BackBar onBack={back} />}
      <h1>{builtin ? 'Change recipe' : existing ? 'Edit recipe' : forBatch ? 'What did you make?' : 'Add a recipe'}</h1>
      {builtin && <p className="muted">Your changes are used everywhere this recipe appears, including plans and grocery lists. You can go back to the original from the recipe page.</p>}

      <section className="card">
        <label className="field"><span>Name</span><input value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Mom's lentil soup" /></label>
        <span className="field"><span>Meal</span></span>
        <Segmented label="Meal" value={d.meal} options={MEALS} onChange={(meal) => set({ meal })} />
        <span className="field"><span>Also good for (optional)</span></span>
        <div className="sort-chips">
          {MEALS.filter((m) => m.value !== d.meal).map((m) => (
            <button key={m.value} type="button" className={d.alsoFor.includes(m.value) ? 'chip on' : 'chip'} aria-pressed={d.alsoFor.includes(m.value)}
              onClick={() => set({ alsoFor: d.alsoFor.includes(m.value) ? d.alsoFor.filter((x) => x !== m.value) : [...d.alsoFor, m.value] })}>{m.label}</button>
          ))}
        </div>
        <div className="row-between"><span>Makes</span><Stepper label="servings" value={d.servings} min={1} max={48} onChange={(servings) => set({ servings })} unit={d.servings === 1 ? 'serving' : 'servings'} /></div>
        <div className="amount-row">
          <label className="field"><span>Hands-on minutes</span><input type="number" step="any" inputMode="numeric" value={d.activeMin || ''} onChange={(e) => set({ activeMin: Number(e.target.value) })} /></label>
          <label className="field"><span>Total minutes</span><input type="number" step="any" inputMode="numeric" value={d.totalMin || ''} onChange={(e) => set({ totalMin: Number(e.target.value) })} /></label>
        </div>
        <span className="field"><span>Effort</span></span>
        <Segmented<'auto' | Effort> label="Effort" value={d.effort ?? 'auto'} onChange={(v) => set({ effort: v === 'auto' ? undefined : v })}
          options={[{ value: 'auto', label: `Auto: ${EFFORT_LABEL[effortFor(d.totalMin || 0)]}` }, { value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'long', label: 'Time-consuming' }]} />
      </section>

      <section className="card">
        <h2>Ingredients</h2>
        <ul className="ingredients">
          {d.ingredients.map((ing, i) => {
            const f = foods.get(ing.food);
            return (
              <li key={i} className="row-between">
                <span>{ingredientText(ing.qty, ing.unit, f?.name.toLowerCase() ?? ing.food, ing.note)}</span>
                <button type="button" className="chip small-chip" onClick={() => set({ ingredients: d.ingredients.filter((_, j) => j !== i) })}>Remove</button>
              </li>
            );
          })}
        </ul>
        <IngredientPicker onAdd={(ing) => set({ ingredients: [...d.ingredients, ing] })} />
      </section>

      <section className="card">
        <h2>Steps</h2>
        <label className="field"><span>One step per line</span>
          <textarea rows={6} value={d.steps} onChange={(e) => set({ steps: e.target.value })} placeholder={'Chop the vegetables.\nSimmer 20 minutes.'} />
        </label>
      </section>

      <section className="card">
        <h2>Main protein and tags</h2>
        <label className="field"><span>Main protein (the app suggests {proteinLabel(suggested).toLowerCase()})</span>
          <select value={d.protein ?? 'auto'} onChange={(e) => set({ protein: e.target.value === 'auto' ? undefined : (e.target.value as ProteinKind) })}>
            <option value="auto">Suggested: {proteinLabel(suggested)}</option>
            {PROTEINS.map((p) => <option key={p} value={p}>{proteinLabel(p)}</option>)}
          </select>
        </label>
        {d.ingredients.length > 0 && <div className="tags">{suggestTags(preview, foods).map((t) => <span key={t} className="tag">{t.replace(/-/g, ' ')}</span>)}</div>}
        <div className="sort-chips">
          {HAND_TAGS.map((t) => (
            <button key={t.id} type="button" className={d.tags.includes(t.id) ? 'chip on' : 'chip'} aria-pressed={d.tags.includes(t.id)}
              onClick={() => set({ tags: d.tags.includes(t.id) ? d.tags.filter((x) => x !== t.id) : [...d.tags, t.id] })}>{t.label}</button>
          ))}
        </div>
      </section>

      {nutrition && (
        <section className="card">
          <h2>Per serving: {kcalText(nutrition.perServing.kcal.amount)}</h2>
          <NutritionPanel totals={nutrition.perServing} compact />
          {why.map((w) => <p key={w} className="warn-line">{w}</p>)}
        </section>
      )}

      {forBatch && (
        <label className="check-line"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /> Also save it to My recipes, so the planner can suggest it</label>
      )}
      {showErrors && problems.map((p) => <p key={p} className="error">{p}</p>)}
      <button className="btn primary big" onClick={() => void save()}>{forBatch ? 'Next' : builtin ? 'Save changes' : 'Save recipe'}</button>
      {!forBatch && <button className="btn" onClick={back}>Cancel</button>}
    </>
  );
}

/** Search the food list (including her scanned and typed-in foods), then pick an amount. */
function IngredientPicker({ onAdd }: { onAdd: (ing: { food: string; qty: number; unit: string; note?: string }) => void }) {
  const { foods } = useAppData();
  const [q, setQ] = useState('');
  const [food, setFood] = useState<Food | null>(null);
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('cup');
  const [note, setNote] = useState('');
  const search = useMemo(() => makeIndex(foods.searchable().map(({ food: f, boost }) => ({ id: f.ref, name: f.name, boost, food: f }))), [foods]);
  const results = food ? [] : search(q, 12);
  const grams = food ? toGrams(food, Number(qty), unit) : null;

  if (food) {
    const units = unitsFor(food);
    return (
      <div className="picker">
        <p><b>{food.name}</b></p>
        <div className="amount-row">
          <label className="field"><span>Amount</span><input type="number" step="any" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} /></label>
          <label className="field"><span>Unit</span>
            <select value={unit} onChange={(e) => setUnit(e.target.value)}>{units.map((u) => <option key={u} value={u}>{u}</option>)}</select>
          </label>
        </div>
        <label className="field"><span>Note (optional)</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. chopped" /></label>
        {grams === null && <p className="error">Pick a unit this food has a size for.</p>}
        <div className="btns">
          <button type="button" className="btn primary" disabled={!(Number(qty) > 0) || grams === null} onClick={() => { onAdd({ food: food.ref, qty: Number(qty), unit, note: note.trim() || undefined }); setFood(null); setQ(''); setNote(''); }}>Add</button>
          <button type="button" className="btn" onClick={() => setFood(null)}>Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div className="picker">
      <input className="search" type="search" placeholder="Add an ingredient: search foods" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search for an ingredient" />
      {results.map((r) => (
        <button key={r.id} type="button" className="recipe-row" onClick={() => {
          const units = unitsFor(r.food);
          setFood(r.food);
          setQty('1');
          setUnit(units.includes('serving') && r.food.source !== 'usda' ? 'serving' : units.includes('medium') ? 'medium' : units.includes('cup') ? 'cup' : units[0]);
        }}>
          <span className="meal-name">{r.name}</span>
          <span className="muted small">{r.food.ref.startsWith('key:') ? 'Everyday food' : r.food.source === 'usda' ? r.food.group : r.food.source === 'scanned' ? 'Scanned' : 'Your food'}</span>
        </button>
      ))}
    </div>
  );
}
