// Settings: targets, who the nutrition targets are for, people, diet rules, stores, recipe feedback review,
// units, OneDrive sync and backups.
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAppData } from '../AppData';
import { useNav } from '../nav';
import { saveSettings, setFavorite, setFeedback } from '../store';
import { DEFAULT_RULES } from '../lib/pool';
import { AGE_RANGES } from '../lib/dri';
import { BackBar, Segmented, Stepper } from '../components/ui';
import OneDriveSettings from '../components/OneDriveSettings';
import BackupSettings from '../components/BackupSettings';
import { StoresEditor } from './GroceriesPage';
import type { AgeRange, DietRules, Feedback, Sex } from '../types';

const FEEDBACK_LABEL: Record<Feedback, string> = { more: 'Use more', less: 'Use less', never: "Don't use again" };

export default function SettingsPage() {
  const { settings } = useAppData();
  const { back } = useNav();
  const [kcal, setKcal] = useState(String(settings.kcal));
  const [fiber, setFiber] = useState(String(settings.fiber));
  const [saved, setSaved] = useState(false);
  const stores = useLiveQuery(() => db.stores.toArray(), []);
  const targetsOk = Number(kcal) >= 1000 && Number(kcal) <= 4000 && Number(fiber) >= 10 && Number(fiber) <= 80;
  const rules = settings.rules;
  const setRule = (patch: Partial<DietRules>) => void saveSettings({ rules: { ...rules, ...patch } });

  return (
    <>
      <BackBar onBack={back} />
      <h1>Settings</h1>

      <form noValidate className="card" onSubmit={(e) => { e.preventDefault(); if (!targetsOk) return; void saveSettings({ kcal: Number(kcal), fiber: Number(fiber) }).then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }); }}>
        <h2>Daily targets</h2>
        <p className="muted small">Used for new plans and the Today tab. Any single day can still be changed on its own.</p>
        <div className="amount-row">
          <label className="field"><span>Calories</span><input type="number" step="any" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} /></label>
          <label className="field"><span>Fiber (g)</span><input type="number" step="any" inputMode="numeric" value={fiber} onChange={(e) => setFiber(e.target.value)} /></label>
        </div>
        {!targetsOk && <p className="error">Calories should be 1000 to 4000 and fiber 10 to 80 grams.</p>}
        <button className="btn primary" type="submit" disabled={!targetsOk}>{saved ? 'Saved' : 'Save targets'}</button>
      </form>

      <section className="card">
        <h2>Nutrition targets are for</h2>
        <p className="muted small">Vitamins and minerals are compared with the Dietary Reference Intakes for this person.</p>
        <Segmented<Sex> label="Sex" value={settings.sex} options={[{ value: 'female', label: 'Woman' }, { value: 'male', label: 'Man' }]} onChange={(sex) => void saveSettings({ sex })} />
        <Segmented<AgeRange> label="Age" value={settings.age} options={AGE_RANGES.map((a) => ({ value: a, label: a }))} onChange={(age) => void saveSettings({ age })} />
      </section>

      <section className="card">
        <h2>Cooking</h2>
        <div className="row-between"><span>Usually cooking for</span><Stepper label="people" value={settings.people} min={1} max={12} onChange={(people) => void saveSettings({ people })} unit={settings.people === 1 ? 'person' : 'people'} /></div>
        <p className="muted small">The starting number for new plans. Each day or meal can still be changed.</p>
      </section>

      <section className="card">
        <h2>Meat, fish and diet rules</h2>
        <p className="muted small">How many times a week the planner uses each. New plans follow these.</p>
        <RuleRange label="Fish or seafood" min={rules.fishMin} max={rules.fishMax} onChange={(fishMin, fishMax) => setRule({ fishMin, fishMax })} />
        <RuleRange label="Poultry" min={rules.poultryMin} max={rules.poultryMax} onChange={(poultryMin, poultryMax) => setRule({ poultryMin, poultryMax })} />
        <div className="row-between rule-row"><span>Red meat, at most</span><Stepper label="red meat times" value={rules.redMeatMax} min={0} max={7} onChange={(redMeatMax) => setRule({ redMeatMax })} /></div>
        <div className="row-between rule-row"><span>Days with beans or legumes, at least</span><Stepper label="legume days" value={rules.legumeDaysMin} min={0} max={7} onChange={(legumeDaysMin) => setRule({ legumeDaysMin })} /></div>
        <div className="row-between rule-row"><span>Egg-based meals, at most</span><Stepper label="egg meals" value={rules.eggMealsMax} min={0} max={14} onChange={(eggMealsMax) => setRule({ eggMealsMax })} /></div>
        <button className="btn subtle" onClick={() => void saveSettings({ rules: DEFAULT_RULES })}>Back to the Mediterranean defaults</button>
      </section>

      {stores && <StoresEditor stores={stores.filter((s) => !s.deletedAt).sort((a, b) => a.order - b.order)} />}

      <FeedbackReview />

      <section className="card">
        <h2>Units</h2>
        <div className="row-between"><span>Weight</span><Segmented label="Weight unit" value={settings.weightUnit} options={[{ value: 'lb', label: 'lb' }, { value: 'kg', label: 'kg' }]} onChange={(weightUnit) => void saveSettings({ weightUnit })} /></div>
        <p className="muted small">Recipes use US cups, spoons, ounces and pounds.</p>
      </section>

      <OneDriveSettings />
      <BackupSettings />
      <PhoneStorage />
    </>
  );
}

function RuleRange({ label, min, max, onChange }: { label: string; min: number; max: number; onChange: (min: number, max: number) => void }) {
  return (
    <div className="rule-row">
      <b>{label}</b>
      <div className="row-between"><span>At least</span><Stepper label={`${label} at least`} value={min} min={0} max={7} onChange={(n) => onChange(n, Math.max(n, max))} /></div>
      <div className="row-between"><span>At most</span><Stepper label={`${label} at most`} value={max} min={0} max={7} onChange={(n) => onChange(Math.min(min, n), n)} /></div>
    </div>
  );
}

/** Review and undo "Use more / Use less / Don't use again" and favorites. */
function FeedbackReview() {
  const { prefs, recipes } = useAppData();
  const { open } = useNav();
  const rows = [...prefs.values()].filter((p) => (p.feedback || p.favorite) && recipes.has(p.id)).sort((a, b) => recipes.get(a.id)!.name.localeCompare(recipes.get(b.id)!.name));
  return (
    <section className="card">
      <h2>Recipe feedback</h2>
      {rows.length === 0 && <p className="muted">None yet. On any recipe page you can choose "Use more", "Use less" or "Don't use again", or mark it as a favorite. They show up here so you can undo them.</p>}
      {rows.map((p) => (
        <div key={p.id} className="fb-row">
          <button className="linkish" onClick={() => open({ name: 'recipe', recipeId: p.id })}>{recipes.get(p.id)!.name}</button>
          <div className="sort-chips">
            {p.feedback && <button className="chip" onClick={() => void setFeedback(p.id, null)}>{FEEDBACK_LABEL[p.feedback]} ✕</button>}
            {p.favorite && <button className="chip" onClick={() => void setFavorite(p.id, false)}>★ Favorite ✕</button>}
          </div>
        </div>
      ))}
      {rows.length > 0 && <p className="muted small">Tap a button to undo it.</p>}
    </section>
  );
}

/** Whether the phone has agreed not to delete the app's data when space runs low (Home Screen apps on iPhone). */
function PhoneStorage() {
  const [state, setState] = useState<'protected' | 'not' | 'unknown'>('unknown');
  useEffect(() => {
    void navigator.storage?.persisted?.().then((p) => setState(p ? 'protected' : 'not'), () => setState('unknown'));
  }, []);
  return (
    <section className="card">
      <h2>Phone storage</h2>
      <p>{state === 'protected' ? 'Protected: the phone will not delete this app’s data.' : state === 'not' ? 'Not protected yet. Add the app to the Home Screen and open it from there.' : 'Unknown on this browser.'}</p>
    </section>
  );
}
