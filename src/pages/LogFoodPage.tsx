// Logging something she ate that was not planned: search the food list (or her foods and recipes), scan a
// barcode, type a barcode, or enter nutrition from a label. Then pick the amount and the meal.
import { useCallback, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAppData } from '../AppData';
import { useNav } from '../nav';
import { addLog, findFoodByBarcode, saveCustomFood, updateLog } from '../store';
import { newId } from '../lib/ids';
import { entryTotals } from '../lib/log';
import { cleanBarcode, listedCount, lookupBarcode, productToFood, searchProducts, type OffProduct } from '../lib/openFoodFacts';
import { makeIndex } from '../lib/search';
import { formatQty, toGrams, unitsFor } from '../lib/units';
import BarcodeScanner from '../components/BarcodeScanner';
import FoodEditor from '../components/FoodEditor';
import NutritionPanel from '../components/NutritionPanel';
import { BackBar, kcalText, Segmented } from '../components/ui';
import type { CustomFood, Food, LogEntry, MealSlot, Recipe } from '../types';

type Pick = { type: 'food'; food: Food } | { type: 'recipe'; recipe: Recipe };
type Step =
  | { s: 'search' }
  | { s: 'amount'; pick: Pick; note?: string }
  | { s: 'scan' }
  | { s: 'type-barcode' }
  | { s: 'looking'; code: string }
  | { s: 'not-found'; code: string; offline?: boolean }
  | { s: 'online-search'; code?: string }
  | { s: 'editor'; code?: string; initial?: CustomFood; back: Step };

const SLOT_OPTIONS: { value: MealSlot; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

export default function LogFoodPage({ date, slot, editId }: { date: string; slot: MealSlot; editId?: string }) {
  const { foods, recipes } = useAppData();
  const { back } = useNav();
  const editing = useLiveQuery(async () => (editId ? (await db.logs.get(editId)) ?? null : null), [editId]);
  const customFoods = useLiveQuery(() => db.customFoods.toArray(), []);
  const [step, setStep] = useState<Step>({ s: 'search' });

  const openPick = useCallback(async (food: CustomFood, note?: string) => {
    await saveCustomFood(food);
    setStep({ s: 'amount', pick: { type: 'food', food: { ...foods.get(`custom:${food.id}`)!, ...customAsFood(food) } }, note });
  }, [foods]);

  const lookup = useCallback(async (raw: string) => {
    const code = cleanBarcode(raw);
    if (!code) return;
    setStep({ s: 'looking', code });
    const saved = await findFoodByBarcode(code);
    if (saved) { setStep({ s: 'amount', pick: { type: 'food', food: customAsFood(saved) } }); return; }
    const res = await lookupBarcode(code);
    if (res.status === 'found') {
      const f = productToFood(res.product, code, newId(), Date.now());
      const n = listedCount(f.per100g);
      await openPick(f, n < 32 ? `This product lists ${n} of the 32 nutrients the app tracks. The rest show as "not listed". You can complete them from the label if you like.` : undefined);
    } else setStep({ s: 'not-found', code, offline: res.status === 'offline' });
  }, [openPick]);

  // While editing an existing entry, go straight to its amount.
  if (editId && editing === undefined) return null;
  if (editId && editing && step.s === 'search') {
    const pick: Pick | null = editing.kind === 'food' && editing.food && foods.get(editing.food)
      ? { type: 'food', food: foods.get(editing.food)! }
      : editing.recipeId && recipes.get(editing.recipeId) ? { type: 'recipe', recipe: recipes.get(editing.recipeId)! } : null;
    if (pick) setStep({ s: 'amount', pick });
  }

  return (
    <>
      <BackBar onBack={step.s === 'search' || editId ? back : () => setStep({ s: 'search' })} />
      {step.s === 'search' && <SearchStep customFoods={customFoods ?? []} onPick={(pick) => setStep({ s: 'amount', pick })} onScan={() => setStep({ s: 'scan' })} onTypeBarcode={() => setStep({ s: 'type-barcode' })} onLabel={() => setStep({ s: 'editor', back: { s: 'search' } })} onOnline={() => setStep({ s: 'online-search' })} />}
      {step.s === 'scan' && <ScanStep onResult={lookup} onCancel={() => setStep({ s: 'search' })} onType={() => setStep({ s: 'type-barcode' })} />}
      {step.s === 'type-barcode' && <TypeBarcode onLookup={lookup} />}
      {step.s === 'looking' && <p className="center lead">Looking up {step.code}…</p>}
      {step.s === 'not-found' && (
        <div className="card">
          <h2>{step.offline ? 'No internet connection' : 'Product not found'}</h2>
          <p>{step.offline ? `Barcode ${step.code} is not saved on this phone yet, and looking it up needs the internet.` : `Open Food Facts does not know barcode ${step.code} yet.`}</p>
          <button className="btn primary" onClick={() => setStep({ s: 'editor', code: step.code, back: step })}>Enter nutrition from the label</button>
          {!step.offline && <button className="btn" onClick={() => setStep({ s: 'online-search', code: step.code })}>Search packaged foods by name</button>}
          <button className="btn" onClick={() => setStep({ s: 'search' })}>Search the food list</button>
          <p className="muted small">Whatever you choose is saved on this phone with this barcode, so the next scan finds it.</p>
        </div>
      )}
      {step.s === 'online-search' && <OnlineSearch code={step.code} onChoose={(p) => void openPick(productToFood(p, step.code ?? p.code ?? '', newId(), Date.now()))} />}
      {step.s === 'editor' && <FoodEditor initial={step.initial} barcode={step.code} onCancel={() => setStep(step.back)} onSave={(f) => void openPick(f)} />}
      {step.s === 'amount' && (
        <AmountStep
          pick={step.pick}
          note={step.note}
          date={date}
          slot={editing?.slot ?? slot}
          existing={editing ?? undefined}
          onFix={step.pick.type === 'food' && step.pick.food.source !== 'usda' ? () => {
            const id = step.pick.type === 'food' ? step.pick.food.ref.slice(7) : '';
            const cf = (customFoods ?? []).find((c) => c.id === id);
            if (cf) setStep({ s: 'editor', initial: cf, back: step });
          } : undefined}
          onDone={back}
        />
      )}
    </>
  );
}

/** A saved custom food as a Food, without waiting for the shared food list to refresh. */
function customAsFood(c: CustomFood): Food {
  const portions = [...c.portions];
  if (c.servingG && !portions.some((p) => p.unit === 'serving')) portions.unshift({ unit: 'serving', label: c.servingLabel ? `serving (${c.servingLabel})` : 'serving', g: c.servingG });
  return { ref: `custom:${c.id}`, name: c.brand ? `${c.name} (${c.brand})` : c.name, group: c.source === 'scanned' ? 'Packaged' : 'Custom', cat: c.cat, per100g: c.per100g, portions, source: c.source };
}

// ---------------------------------------------------------------- search

function SearchStep({ customFoods, onPick, onScan, onTypeBarcode, onLabel, onOnline }: { customFoods: CustomFood[]; onPick: (p: Pick) => void; onScan: () => void; onTypeBarcode: () => void; onLabel: () => void; onOnline: () => void }) {
  const { foods, recipes } = useAppData();
  const [q, setQ] = useState('');
  type Row = { id: string; name: string; boost: number; sub: string; pick: Pick };
  const search = useMemo(() => {
    const rows: Row[] = [];
    for (const c of customFoods.filter((x) => !x.deletedAt)) {
      const f = customAsFood(c);
      rows.push({ id: f.ref, name: f.name, boost: 3, sub: c.source === 'scanned' ? 'Scanned' : 'Your food', pick: { type: 'food', food: f } });
    }
    for (const r of recipes.values()) rows.push({ id: r.id, name: r.name, boost: -2, sub: 'Recipe, per serving', pick: { type: 'recipe', recipe: r } }); // plain foods first
    for (const f of foods.usda.values()) rows.push({ id: f.ref, name: f.name, boost: 0, sub: f.group, pick: { type: 'food', food: f } });
    return makeIndex(rows);
  }, [customFoods, foods, recipes]);
  const results = search(q, 40);
  return (
    <>
      <h1>Log food</h1>
      <div className="btns">
        <button className="btn primary" onClick={onScan}>Scan barcode</button>
        <button className="btn" onClick={onTypeBarcode}>Type a barcode</button>
      </div>
      <input className="search" type="search" placeholder="Search foods (e.g. banana, cheddar)" value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Search foods" />
      {results.map((r) => (
        <button key={r.id} className="recipe-row" onClick={() => onPick(r.pick)}>
          <span className="meal-name">{r.name}</span>
          <span className="muted small">{r.sub}</span>
        </button>
      ))}
      {q.trim() && results.length === 0 && <p className="muted">Nothing found. Try fewer words, or one of the options below.</p>}
      <button className="btn" onClick={onLabel}>Enter nutrition from a label</button>
      <button className="btn" onClick={onOnline}>Search packaged foods online</button>
    </>
  );
}

function ScanStep({ onResult, onCancel, onType }: { onResult: (code: string) => void; onCancel: () => void; onType: () => void }) {
  return (
    <>
      <h1>Scan barcode</h1>
      <BarcodeScanner onResult={onResult} onCancel={onCancel} onTypeInstead={onType} />
    </>
  );
}

function TypeBarcode({ onLookup }: { onLookup: (code: string) => void }) {
  const [code, setCode] = useState('');
  const ok = cleanBarcode(code) !== null;
  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); if (ok) onLookup(code); }}>
      <h1>Type the barcode</h1>
      <label className="field"><span>The numbers under the barcode</span><input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 0 12345 67890 5" autoFocus /></label>
      <button className="btn primary" type="submit" disabled={!ok}>Look it up</button>
      {!ok && code.length > 0 && <p className="muted small">A barcode has 8 to 14 digits.</p>}
    </form>
  );
}

function OnlineSearch({ code, onChoose }: { code?: string; onChoose: (p: OffProduct) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<OffProduct[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <>
      <h1>Search packaged foods</h1>
      <p className="muted">Searches Open Food Facts by name{code ? `. The one you choose is saved with barcode ${code}` : ''}.</p>
      <form noValidate onSubmit={(e) => { e.preventDefault(); if (!q.trim()) return; setBusy(true); setError(''); searchProducts(q).then(setResults, (er: Error) => setError(er.message)).finally(() => setBusy(false)); }}>
        <input className="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Brand and product name" autoFocus aria-label="Product name" />
        <button className="btn primary" type="submit" disabled={busy || !q.trim()}>{busy ? 'Searching…' : 'Search'}</button>
      </form>
      {error && <p className="error">{error}</p>}
      {results?.map((p, i) => (
        <button key={(p.code ?? '') + i} className="recipe-row" onClick={() => onChoose(p)}>
          <span className="meal-name">{p.product_name || p.product_name_en}</span>
          <span className="muted small">{[p.brands, p.serving_size].filter(Boolean).join(' · ')}</span>
        </button>
      ))}
      {results && results.length === 0 && <p className="muted">No products found.</p>}
    </>
  );
}

// ---------------------------------------------------------------- amount

function AmountStep({ pick, note, date, slot, existing, onFix, onDone }: { pick: Pick; note?: string; date: string; slot: MealSlot; existing?: LogEntry; onFix?: () => void; onDone: () => void }) {
  const { foods, recipes } = useAppData();
  const food = pick.type === 'food' ? pick.food : null;
  const units = food ? unitsFor(food) : [];
  // Default: the label serving for packaged foods; "medium" (or another natural size) for plain foods.
  const counted = units.filter((u) => !['g', 'oz', 'cup', 'tbsp', 'tsp'].includes(u));
  const defaultUnit = !food ? 'serving'
    : food.source !== 'usda' && counted.includes('serving') ? 'serving'
      : counted.includes('medium') ? 'medium'
        : counted.find((u) => u !== 'serving') ?? (units.includes('cup') ? 'cup' : 'g');
  const [qty, setQty] = useState(String(existing?.qty ?? (defaultUnit === 'g' ? 100 : 1)));
  const [unit, setUnit] = useState(existing?.unit ?? defaultUnit);
  const [where, setWhere] = useState<MealSlot>(existing?.slot ?? slot);
  const q = Number(qty);
  const grams = food ? toGrams(food, q, unit) : null;
  const entry: LogEntry = {
    id: 'preview', updatedAt: 0, date, slot: where, qty: q, label: food ? food.name : pick.type === 'recipe' ? pick.recipe.name : '',
    ...(food ? { kind: 'food' as const, food: food.ref, unit, grams: grams ?? undefined } : { kind: 'recipe' as const, recipeId: pick.type === 'recipe' ? pick.recipe.id : undefined }),
  };
  const totals = entryTotals(entry, { foods, recipes });
  const valid = q > 0 && (!food || grams !== null);

  async function save() {
    const { id: _id, updatedAt: _u, ...rest } = entry;
    if (existing) await updateLog(existing.id, rest);
    else await addLog(rest);
    onDone();
  }

  return (
    <>
      <h1>{entry.label}</h1>
      {note && <p className="warn-line">{note}</p>}
      <div className="card">
        <div className="amount-row">
          <label className="field"><span>Amount</span><input type="number" inputMode="decimal" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} /></label>
          {food ? (
            <label className="field"><span>Unit</span>
              <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                {units.map((u) => <option key={u} value={u}>{u === 'serving' ? food.portions.find((p) => p.unit === 'serving')?.label ?? 'serving' : u}</option>)}
              </select>
            </label>
          ) : <span className="unit-word">{q <= 1 ? 'serving' : 'servings'}</span>}
        </div>
        {!food && (
          <div className="sort-chips">
            {[0.5, 1, 1.5, 2].map((c) => <button key={c} className={q === c ? 'chip on' : 'chip'} onClick={() => setQty(String(c))}>{c === 0.5 ? 'Half' : formatQty(c)}</button>)}
          </div>
        )}
        {food && grams !== null && <p className="muted small">That is about {Math.round(grams)} g.</p>}
        {food && grams === null && q > 0 && <p className="error">This food has no size for "{unit}". Pick another unit.</p>}
        <span className="field"><span>Which meal?</span></span>
        <Segmented label="Meal" value={where} options={SLOT_OPTIONS} onChange={setWhere} />
      </div>
      {valid && (
        <section className="card">
          <h2>{kcalText(totals.kcal.amount)}</h2>
          <NutritionPanel totals={totals} compact />
        </section>
      )}
      <button className="btn primary big" disabled={!valid} onClick={() => void save()}>{existing ? 'Save changes' : 'Add to log'}</button>
      {onFix && <button className="btn" onClick={onFix}>Fix or complete this food's nutrition</button>}
    </>
  );
}
