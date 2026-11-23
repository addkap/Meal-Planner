import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { changeOver, changeText, cleanEntries, fromKg, inRange, movingAverage, showWeight, toKg } from './weight';
import type { WeighIn } from '../types';

let n = 0;
const w = (date: string, kg: number, extra: Partial<WeighIn> = {}): WeighIn => ({ id: `w${n++}`, updatedAt: n, date, kg, ...extra });

describe('units', () => {
  it('converts pounds and kilograms both ways', () => {
    expect(toKg(150, 'lb')).toBeCloseTo(68.0389, 3);
    expect(fromKg(68.0389, 'lb')).toBeCloseTo(150, 2);
    expect(toKg(70, 'kg')).toBe(70);
    expect(showWeight(toKg(150.04, 'lb'), 'lb')).toBe('150.0 lb');
    expect(showWeight(70.26, 'kg')).toBe('70.3 kg');
  });
});

describe('entries', () => {
  it('ignores deleted entries, sorts by date, and keeps the latest save for a day', () => {
    const list = [w('2026-11-03', 70), w('2026-11-01', 71), w('2026-11-02', 69, { deletedAt: 5 }), w('2026-11-03', 69.5)];
    expect(cleanEntries(list).map((x) => [x.date, x.kg])).toEqual([['2026-11-01', 71], ['2026-11-03', 69.5]]);
  });
});

describe('7-day moving average', () => {
  const daily = Array.from({ length: 10 }, (_, i) => w(`2026-11-${String(i + 1).padStart(2, '0')}`, 70 - i * 0.1));
  const pts = movingAverage(daily);
  it('averages the weigh-ins in the 7 days ending each day', () => {
    expect(pts[0].avg).toBeCloseTo(70);
    expect(pts[6].avg).toBeCloseTo((70 + 69.9 + 69.8 + 69.7 + 69.6 + 69.5 + 69.4) / 7);
    expect(pts[9].avg).toBeCloseTo((69.7 + 69.6 + 69.5 + 69.4 + 69.3 + 69.2 + 69.1) / 7); // days 4-10
  });
  it('handles gaps: only weigh-ins inside the window count', () => {
    const sparse = movingAverage([w('2026-11-01', 80), w('2026-11-20', 70)]);
    expect(sparse[1].avg).toBe(70);
  });
  it('smooths a one-day spike', () => {
    const spiky = movingAverage([...daily.slice(0, 6), w('2026-11-07', 72)]);
    expect(spiky[6].avg - spiky[5].avg).toBeLessThan(0.5); // a 2.5 kg spike moves the average well under 0.5
  });
});

describe('change over time', () => {
  const pts = movingAverage(Array.from({ length: 40 }, (_, i) => w(addDays('2026-10-01', i), 72 - i * 0.05))); // 40 days, losing 0.05 kg a day
  it('measures the change in the average over a period and overall', () => {
    expect(changeOver(pts, 'all')!).toBeLessThan(0);
    expect(changeOver(pts, 7)!).toBeCloseTo(-0.35, 1);
    expect(changeOver(pts, 365)).toBeNull(); // not enough history
    expect(changeOver(pts.slice(0, 1), 7)).toBeNull();
  });
  it('limits the chart to a range', () => {
    expect(inRange(pts, 7).length).toBe(8);
    expect(inRange(pts, 'all').length).toBe(40);
  });
  it('says it in words', () => {
    expect(changeText(toKg(-2.3, 'lb'), 'lb')).toBe('2.3 lb down');
    expect(changeText(0.5, 'kg')).toBe('0.5 kg up');
    expect(changeText(0.01, 'kg')).toBe('no change');
    expect(changeText(null, 'lb')).toBe('not enough weigh-ins yet');
  });
});
