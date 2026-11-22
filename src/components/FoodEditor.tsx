// Typing nutrition from a label (a new food, or correcting/completing a scanned one). Values are entered per
// serving as printed on the label; blank means "not listed". Saved per 100 g like every other food.
import { useState } from 'react';
import { GROCERY_CATEGORIES, type GroceryCategory } from '../lib/categories';
import { emptyValues, NUTRIENTS, type NutrientKey } from '../lib/nutrients';
import { newId } from '../lib/ids';
import { Section } from './ui';
import type { CustomFood } from '../types';

const MAIN: NutrientKey[] = ['kcal', 'fat', 'satFat', 'cholesterol', 'sodium', 'carbs', 'fiber', 'sugars', 'protein', 'vitD', 'calcium', 'iron', 'potassium'];

export default function FoodEditor({ initial, barcode, onSave, onCancel }: { initial?: CustomFood; barcode?: string; onSave: (f: CustomFood) => void; onCancel: () => void }) {
  const servingG0 = initial?.servingG ?? 100;
  const [name, setName] = useState(initial?.name ?? '');
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [servingLabel, setServingLabel] = useState(initial?.servingLabel ?? '');
  const [servingG, setServingG] = useState(String(initial?.servingG ?? ''));
  const [cat, setCat] = useState<GroceryCategory>(initial?.cat ?? 'other');
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(NUTRIENTS.map((n) => {
      const v = initial?.per100g[n.key];
      return [n.key, v === null || v === undefined ? '' : String(Math.round((v * servingG0) / 100 * 100) / 100)];
    })),
  );
  const g = Number(servingG);
  const valid = name.trim() && g > 0 && vals.kcal !== '';

  function save() {
    const per100g = emptyValues(null);
    for (const n of NUTRIENTS) {
      const raw = vals[n.key].trim();
      per100g[n.key] = raw === '' || !Number.isFinite(Number(raw)) ? null : (Number(raw) / g) * 100;
    }
    onSave({
      id: initial?.id ?? newId(),
      updatedAt: 0,
      name: name.trim(),
      brand: brand.trim() || undefined,
      barcode: initial?.barcode ?? barcode,
      cat,
      per100g,
      servingG: g,
      servingLabel: servingLabel.trim() || undefined,
      portions: initial?.portions ?? [],
      source: initial?.source ?? 'custom',
      origin: initial?.origin ? `${initial.origin}, corrected by you` : undefined,
    });
  }

  const field = (k: NutrientKey) => {
    const info = NUTRIENTS.find((n) => n.key === k)!;
    return (
      <label key={k} className="field nutr-field">
        <span>{info.label} ({info.unit === 'kcal' ? 'calories' : info.unit})</span>
        <input type="number" inputMode="decimal" min="0" step="any" value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} placeholder="not listed" />
      </label>
    );
  };

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); if (valid) save(); }}>
      <h2>{initial ? 'Fix or complete this food' : 'Enter from the label'}</h2>
      {barcode && !initial && <p className="muted">It will be linked to barcode {barcode}, so the next scan finds it.</p>}
      <label className="field"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Oat granola bar" /></label>
      <label className="field"><span>Brand (optional)</span><input value={brand} onChange={(e) => setBrand(e.target.value)} /></label>
      <label className="field"><span>Serving size as printed (optional)</span><input value={servingLabel} onChange={(e) => setServingLabel(e.target.value)} placeholder="e.g. 1 bar, 2/3 cup" /></label>
      <label className="field"><span>Serving size in grams (or mL for drinks)</span><input type="number" inputMode="decimal" step="any" value={servingG} onChange={(e) => setServingG(e.target.value)} placeholder="from the label, e.g. 40" /></label>
      <p className="muted small">Type the numbers for <b>one serving</b>, as printed. Leave a box empty if the label does not list it. It will show as "not listed", never as zero.</p>
      {MAIN.map(field)}
      <Section title="More vitamins and minerals" open={false}>
        {NUTRIENTS.filter((n) => !MAIN.includes(n.key)).map((n) => field(n.key))}
      </Section>
      <label className="field"><span>Grocery section</span>
        <select value={cat} onChange={(e) => setCat(e.target.value as GroceryCategory)}>
          {GROCERY_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>
      <button className="btn primary big" type="submit" disabled={!valid}>Save food</button>
      {!valid && <p className="muted small">Needs a name, the serving size in grams, and calories.</p>}
      <button className="btn" type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
}
