// Full nutrition: every macro, vitamin and mineral as an amount and a percent of her daily target.
// "Not listed" values are never shown as 0; incomplete totals say "at least".
import { NUTRIENTS, type NutrientKey } from '../lib/nutrients';
import { describeTotal, macroSplit, type Totals } from '../lib/nutrition';
import { dailyTargets, pctOf, type Target } from '../lib/dri';
import { useAppData } from '../AppData';
import { Section } from './ui';

function fmt(n: number, unit: string): string {
  if (unit === 'kcal') return `${Math.round(n)}`;
  if (n >= 100) return `${Math.round(n)} ${unit}`;
  if (n >= 10) return `${Math.round(n)} ${unit}`;
  if (n >= 1) return `${n.toFixed(1).replace(/\.0$/, '')} ${unit}`;
  return `${n.toFixed(2).replace(/0$/, '')} ${unit}`;
}

function Row({ k, totals, target, days }: { k: NutrientKey; totals: Totals; target: Target; days: number }) {
  const info = NUTRIENTS.find((n) => n.key === k)!;
  const d = describeTotal(totals[k]);
  const goal = { ...target, amount: target.amount * days };
  const pct = d.text === 'value' ? pctOf(d.amount, goal) : 0;
  const showPct = goal.kind !== 'info' && goal.amount > 0 && d.text === 'value';
  const tone = !showPct ? '' : goal.kind === 'max' ? (pct > 100 ? 'over' : 'ok') : pct >= 100 ? 'ok' : pct >= 70 ? 'mid' : 'low';
  return (
    <div className="nrow">
      <span className="nlabel">{info.label}</span>
      <span className="namount">
        {d.text === 'not listed' ? <span className="muted">not listed</span> : <>{d.atLeast && <span className="atleast" title="Some foods do not list this">≥ </span>}{fmt(d.amount, info.unit)}</>}
      </span>
      <span className={`npct ${tone}`}>{showPct ? `${Math.round(pct)}%${goal.kind === 'max' ? ' of limit' : ''}` : ''}</span>
      {showPct && <span className="nbar" aria-hidden><span className={`nfill ${tone}`} style={{ width: `${Math.min(100, pct)}%` }} /></span>}
    </div>
  );
}

/**
 * `days` = how many days of targets the totals cover (1 for a day or a meal; for a single serving the
 * percents are of one day's target).
 */
export default function NutritionPanel({ totals, kcalTarget, fiberTarget, days = 1, compact = false }: { totals: Totals; kcalTarget?: number; fiberTarget?: number; days?: number; compact?: boolean }) {
  const { settings } = useAppData();
  const targets = dailyTargets(settings.sex, settings.age, kcalTarget ?? settings.kcal, fiberTarget ?? settings.fiber);
  const split = macroSplit(totals);
  const partial = NUTRIENTS.some((n) => totals[n.key].partial);
  const group = (g: string) => NUTRIENTS.filter((n) => n.group === g).map((n) => <Row key={n.key} k={n.key} totals={totals} target={targets[n.key]} days={days} />);
  return (
    <div className="nutrition">
      <div className="macro-split">
        <span><b>{Math.round(totals.kcal.amount)}</b> calories</span>
        <span>Protein {Math.round(split.protein * 100)}% · Carbs {Math.round(split.carbs * 100)}% · Fat {Math.round(split.fat * 100)}%</span>
      </div>
      <Section title="Calories, protein, fat, carbs" open={!compact}>{group('macro')}</Section>
      <Section title="Vitamins" open={false}>{group('vitamin')}</Section>
      <Section title="Minerals" open={false}>{group('mineral')}</Section>
      {partial && <p className="muted small">≥ means some foods do not list that nutrient, so the real amount is likely higher. "Not listed" means no food listed it.</p>}
      <p className="muted small">Percents are of your daily targets for a {settings.sex === 'female' ? 'woman' : 'man'} aged {settings.age} (Settings).</p>
    </div>
  );
}
