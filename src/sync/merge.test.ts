import { SYNC_APP_TAG } from '../appIdentity';
import { describe, expect, it } from 'vitest';
import type { LogEntry, WeekPlan, WeighIn } from '../types';
import { emptyData, mergeCollections, mergeData, parseSyncData, sameVersions, signature, type SyncData } from './merge';

// Any synced record works the same way; weigh-ins are the simplest kind.
const wk = (id: string, updatedAt: number, extra: Partial<WeighIn> = {}): WeighIn => ({ id, date: '2026-11-08', kg: 70, updatedAt, ...extra });
const data = (weighIns: WeighIn[]): SyncData => ({ ...emptyData(), weighIns });

describe('merge by id, latest updatedAt wins', () => {
  it('keeps records from both sides', () => {
    const { merged } = mergeCollections([wk('a', 1)], [wk('b', 1)]);
    expect(merged.map((w) => w.id).sort()).toEqual(['a', 'b']);
  });
  it('the newer edit wins in either direction', () => {
    expect(mergeCollections([wk('a', 5, { date: 'L' })], [wk('a', 9, { date: 'R' })]).merged[0].date).toBe('R');
    expect(mergeCollections([wk('a', 9, { date: 'L' })], [wk('a', 5, { date: 'R' })]).merged[0].date).toBe('L');
  });
  it('reports which remote records must be written locally', () => {
    const r = mergeCollections([wk('a', 9)], [wk('a', 5), wk('b', 1)]);
    expect(r.remoteWon.map((w) => w.id)).toEqual(['b']);
  });
  it('a deletion (tombstone) newer than an edit wins, so the delete syncs', () => {
    const m = mergeCollections([wk('a', 5)], [wk('a', 9, { deletedAt: 9 })]).merged[0];
    expect(m.deletedAt).toBe(9);
  });
  it('an edit newer than a deletion wins (latest wins)', () => {
    const m = mergeCollections([wk('a', 12)], [wk('a', 9, { deletedAt: 9 })]).merged[0];
    expect(m.deletedAt).toBeUndefined();
  });
  it('exact tie: a deletion wins, otherwise local stays', () => {
    expect(mergeCollections([wk('a', 5)], [wk('a', 5, { deletedAt: 5 })]).merged[0].deletedAt).toBe(5);
    expect(mergeCollections([wk('a', 5, { date: 'L' })], [wk('a', 5, { date: 'R' })]).merged[0].date).toBe('L');
  });
  it('merging twice changes nothing (idempotent) and both orders agree', () => {
    const a = data([wk('a', 5), wk('b', 2)]);
    const b = data([wk('a', 3), wk('c', 7)]);
    const ab = mergeData(a, b).merged;
    const ba = mergeData(b, a).merged;
    expect(signature(ab)).toBe(signature(ba));
    expect(signature(mergeData(ab, b).merged)).toBe(signature(ab));
  });
  it('no remote file: nothing to bring in', () => {
    expect(mergeData(data([wk('a', 1)]), null).remoteWon.weighIns).toEqual([]);
  });
});

describe('signature', () => {
  it('changes when any record version changes, not when order changes', () => {
    expect(signature(data([wk('a', 1), wk('b', 2)]))).toBe(signature(data([wk('b', 2), wk('a', 1)])));
    expect(signature(data([wk('a', 1)]))).not.toBe(signature(data([wk('a', 2)])));
    expect(signature(data([wk('a', 1)]))).not.toBe(signature(data([wk('a', 1, { deletedAt: 3 })])));
    expect(sameVersions(data([wk('a', 1)]), data([wk('a', 1)]))).toBe(true);
  });
});

describe('parseSyncData', () => {
  it('accepts a valid file and drops junk records', () => {
    const text = JSON.stringify({ app: SYNC_APP_TAG, version: 1, weighIns: [wk('a', 1), { nope: true }] });
    const d = parseSyncData(text);
    expect(d.weighIns).toHaveLength(1);
    expect(d.plans).toEqual([]); // missing tables come back empty
  });
  it('rejects other files with a friendly message', () => {
    expect(() => parseSyncData('not json')).toThrow('not valid JSON');
    expect(() => parseSyncData('{"hello":1}')).toThrow('not a Meal Planner data file');
    expect(() => parseSyncData('{"app":"lift-log","version":1}')).toThrow('not a Meal Planner data file'); // Lift Log's own file is refused
    expect(() => parseSyncData('{"app":"erika-lift-log","version":1}')).toThrow('not a Meal Planner data file');
    expect(() => parseSyncData(`{"app":"${SYNC_APP_TAG}","version":9}`)).toThrow('newer version');
  });
});

describe('every kind of record syncs', () => {
  it('plans, logs and weigh-ins all merge with the same rules', () => {
    const plan = (u: number): WeekPlan => ({ id: '2026-11-23', updatedAt: u, weekStart: '2026-11-23', days: [], finalized: u > 5, seed: u });
    const log = (id: string, u: number): LogEntry => ({ id, updatedAt: u, date: '2026-11-23', slot: 'lunch', kind: 'food', qty: 1, label: id });
    const local: SyncData = { ...emptyData(), plans: [plan(3)], logs: [log('a', 1)] };
    const remote: SyncData = { ...emptyData(), plans: [plan(9)], logs: [log('b', 2)], weighIns: [wk('w', 4)] };
    const { merged, remoteWon } = mergeData(local, remote);
    expect(merged.plans[0].finalized).toBe(true); // the newer plan
    expect(merged.logs.map((l) => l.id).sort()).toEqual(['a', 'b']);
    expect(remoteWon.weighIns).toHaveLength(1);
    expect(signature(merged)).not.toBe(signature(local));
  });
  it('refuses files from other apps (like Lift Log)', () => {
    expect(() => parseSyncData(JSON.stringify({ app: 'lift-log', version: 1 }))).toThrow(/not a Meal Planner data file/);
  });
});
