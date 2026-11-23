// Weight tracker: log weigh-ins in lb or kg, see the 7-day average trend and the change over time,
// with an optional goal. Every weigh-in is listed under the chart (the chart's table view), editable.
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../db';
import { useAppData } from '../AppData';
import { useNav } from '../nav';
import { saveSettings } from '../store';
import { newId } from '../lib/ids';
import { shortDate, todayLocal } from '../lib/dates';
import { changeOver, changeText, cleanEntries, dayNumber, fromKg, inRange, movingAverage, showWeight, toKg } from '../lib/weight';
import { BackBar, Segmented } from '../components/ui';
import type { WeighIn } from '../types';

const RANGES: { value: string; label: string; days: number | 'all' }[] = [
  { value: '30', label: '1 month', days: 30 },
  { value: '90', label: '3 months', days: 90 },
  { value: '365', label: '1 year', days: 365 },
  { value: 'all', label: 'All', days: 'all' },
];
// Chart colors (validated): blue line for the 7-day average, sky dots for single weigh-ins.
const AVG = '#005a9c';
const DOT = '#60c1e5';

export default function WeightPage() {
  const { settings } = useAppData();
  const { back } = useNav();
  const unit = settings.weightUnit;
  const all = useLiveQuery(() => db.weighIns.toArray(), []);
  const [range, setRange] = useState('90');
  const [editing, setEditing] = useState<WeighIn | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);

  const entries = useMemo(() => cleanEntries(all ?? []), [all]);
  const points = useMemo(() => movingAverage(entries), [entries]);
  if (!all) return null;

  const days = RANGES.find((r) => r.value === range)!.days;
  const shown = inRange(points, days);
  const last = points[points.length - 1];
  const data = shown.map((p) => ({ x: dayNumber(p.date), date: p.date, weight: Math.round(fromKg(p.kg!, unit) * 10) / 10, avg: Math.round(fromKg(p.avg, unit) * 10) / 10 }));
  const goal = settings.goalKg ? Math.round(fromKg(settings.goalKg, unit) * 10) / 10 : undefined;
  const values = data.flatMap((d) => [d.weight, d.avg]).concat(goal ? [goal] : []);
  const lo = Math.floor(Math.min(...values) - 1);
  const hi = Math.ceil(Math.max(...values) + 1);

  return (
    <>
      <BackBar onBack={back} />
      <div className="row-between">
        <h1>Weight</h1>
        <Segmented label="Unit" value={unit} options={[{ value: 'lb', label: 'lb' }, { value: 'kg', label: 'kg' }]} onChange={(u) => void saveSettings({ weightUnit: u })} />
      </div>

      <WeighInForm key={editing?.id ?? 'new'} unit={unit} editing={editing} onDone={() => setEditing(null)} />

      {points.length > 0 && (
        <section className="card">
          <div className="stat-row">
            <div><span className="stat">{showWeight(last.avg, unit)}</span><span className="muted small">7-day average</span></div>
            <div><span className="stat">{changeText(changeOver(points, 30), unit)}</span><span className="muted small">last 30 days</span></div>
            <div><span className="stat">{changeText(changeOver(points, 'all'), unit)}</span><span className="muted small">since {shortDate(points[0].date)}</span></div>
          </div>
          {goal !== undefined && (
            <p className="muted">Goal {goal.toFixed(1)} {unit}: {Math.abs(fromKg(last.avg - settings.goalKg!, unit)) < 0.05 ? 'reached!' : `${Math.abs(Math.round(fromKg(last.avg - settings.goalKg!, unit) * 10) / 10).toFixed(1)} ${unit} to go`}</p>
          )}
        </section>
      )}

      {shown.length >= 2 && (
        <section className="card">
          <h2>Trend</h2>
          <Segmented label="Time range" value={range} options={RANGES.map((r) => ({ value: r.value, label: r.label }))} onChange={setRange} />
          <div className="legend" aria-hidden>
            <span><i className="swatch line" style={{ background: AVG }} /> 7-day average</span>
            <span><i className="swatch dot" style={{ background: DOT }} /> Weigh-ins</span>
            {goal !== undefined && <span><i className="swatch goal" /> Goal</span>}
          </div>
          <div className="chart" role="img" aria-label={`Weight trend: 7-day average ${showWeight(last.avg, unit)}, ${changeText(changeOver(points, days), unit)} over this range. Every weigh-in is listed below.`}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
                <CartesianGrid stroke="#e3eef3" vertical={false} />
                <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(x: number) => shortDate(data.find((d) => d.x === x)?.date ?? xToDate(x))} tick={{ fontSize: 14, fill: '#4a5b70' }} tickCount={4} />
                <YAxis domain={[lo, hi]} tick={{ fontSize: 14, fill: '#4a5b70' }} width={44} allowDecimals={false} />
                <Tooltip
                  formatter={(v, name) => [`${Number(v).toFixed(1)} ${unit}`, name === 'avg' ? '7-day average' : 'Weigh-in']}
                  labelFormatter={(x) => shortDate(data.find((d) => d.x === Number(x))?.date ?? xToDate(Number(x)))}
                  contentStyle={{ fontSize: 16, borderRadius: 10 }}
                />
                {goal !== undefined && <ReferenceLine y={goal} stroke="#4a5b70" strokeDasharray="6 4" label={{ value: `Goal ${goal}`, position: 'insideBottomRight', fill: '#4a5b70', fontSize: 14 }} />}
                <Line dataKey="weight" stroke="none" dot={{ r: 4, fill: DOT, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                <Line dataKey="avg" stroke={AVG} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="card">
        {goalOpen ? (
          <GoalForm unit={unit} goalKg={settings.goalKg} onDone={() => setGoalOpen(false)} />
        ) : (
          <button className="linkish" onClick={() => setGoalOpen(true)}>{goal !== undefined ? `Goal: ${goal.toFixed(1)} ${unit}. Change` : 'Set a goal weight (optional)'}</button>
        )}
      </section>

      {entries.length > 0 && (
        <section className="card">
          <h2>All weigh-ins</h2>
          {[...entries].reverse().map((e) => (
            <div key={e.id} className="row-between weigh-row">
              <span><b>{showWeight(e.kg, unit)}</b> <span className="muted">{shortDate(e.date)}{e.note ? ` · ${e.note}` : ''}</span></span>
              <span>
                <button className="chip small-chip" onClick={() => { setEditing(e); window.scrollTo(0, 0); }}>Edit</button>
                <button className="chip small-chip" onClick={() => void db.weighIns.put({ ...e, deletedAt: Date.now(), updatedAt: Date.now() })}>Delete</button>
              </span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

const xToDate = (x: number) => new Date(x * 86_400_000).toISOString().slice(0, 10);

function WeighInForm({ unit, editing, onDone }: { unit: 'lb' | 'kg'; editing: WeighIn | null; onDone: () => void }) {
  const [date, setDate] = useState(editing?.date ?? todayLocal());
  const [value, setValue] = useState(editing ? String(Math.round(fromKg(editing.kg, unit) * 10) / 10) : '');
  const [note, setNote] = useState(editing?.note ?? '');
  const v = Number(value);
  const ok = v > (unit === 'lb' ? 50 : 23) && v < (unit === 'lb' ? 700 : 320);
  return (
    <form noValidate className="card" onSubmit={(e) => {
      e.preventDefault();
      if (!ok) return;
      const rec: WeighIn = { id: editing?.id ?? newId(), updatedAt: Date.now(), date, kg: toKg(v, unit), note: note.trim() || undefined };
      void db.weighIns.put(rec).then(() => { setValue(''); setNote(''); onDone(); });
    }}>
      <h2>{editing ? 'Change weigh-in' : 'Log a weigh-in'}</h2>
      <label className="field"><span>Weight ({unit})</span><input type="number" step="any" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder={unit === 'lb' ? 'e.g. 152.4' : 'e.g. 69.1'} /></label>
      <label className="field"><span>Date</span><input type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value || todayLocal())} /></label>
      <label className="field"><span>Note (optional)</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. after a big dinner" /></label>
      {value && !ok && <p className="error">That does not look like a weight in {unit}.</p>}
      <button className="btn primary" type="submit" disabled={!ok}>{editing ? 'Save' : 'Add weigh-in'}</button>
      {editing && <button className="btn" type="button" onClick={onDone}>Cancel</button>}
    </form>
  );
}

function GoalForm({ unit, goalKg, onDone }: { unit: 'lb' | 'kg'; goalKg?: number; onDone: () => void }) {
  const [v, setV] = useState(goalKg ? String(Math.round(fromKg(goalKg, unit) * 10) / 10) : '');
  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void saveSettings({ goalKg: Number(v) > 0 ? toKg(Number(v), unit) : undefined }).then(onDone); }}>
      <label className="field"><span>Goal weight ({unit})</span><input type="number" step="any" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} /></label>
      <div className="btns">
        <button className="btn primary" type="submit">Save goal</button>
        {goalKg && <button className="btn" type="button" onClick={() => void saveSettings({ goalKg: undefined }).then(onDone)}>No goal</button>}
        <button className="btn" type="button" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}
