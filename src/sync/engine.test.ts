import 'fake-indexeddb/auto'; // first: gives Dexie an in-memory IndexedDB
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import type { WeighIn } from '../types';
import { NeedsAuthError } from './graph';
import { getStatus, refreshStatus, runCycle, setRemoteFactory, syncNow } from './engine';
import { emptyData, parseSyncData, SYNC_TABLES, type RemoteStore, type SyncData } from './merge';
import { saveMeta } from './meta';

/** A pretend OneDrive file with real eTag behaviour. `beforeWrite` lets a test act as "the other phone". */
class FakeRemote implements RemoteStore {
  text: string | null = null;
  version = 0;
  writes = 0;
  beforeWrite?: () => void;
  authFails = false;
  async read() {
    if (this.authFails) throw new NeedsAuthError();
    return { etag: this.text ? `"v${this.version}"` : null, data: this.text ? parseSyncData(this.text) : null };
  }
  async write(data: SyncData, etag: string | null) {
    this.beforeWrite?.(); this.beforeWrite = undefined;
    const current = this.text ? `"v${this.version}"` : null;
    if (etag !== current) return 'conflict' as const; // someone changed it since we read
    this.text = JSON.stringify(data); this.version++; this.writes++;
    return 'ok' as const;
  }
  /** Simulate the other phone adding a record directly to the file. */
  otherPhoneAdds(w: WeighIn) {
    const d = this.text ? parseSyncData(this.text) : emptyData();
    d.weighIns.push(w);
    this.text = JSON.stringify(d); this.version++;
  }
}

const wk = (id: string, updatedAt = Date.now()): WeighIn => ({ id, date: '2026-11-08', kg: 70, updatedAt });
const live = async () => (await db.weighIns.toArray()).filter((w) => !w.deletedAt).map((w) => w.id).sort();

let remote: FakeRemote;
beforeEach(async () => {
  await Promise.all([...SYNC_TABLES.map((t) => db.table(t).clear()), db.meta.clear()]);
  remote = new FakeRemote();
  setRemoteFactory(() => remote);
  await saveMeta({ folder: { driveId: 'D', itemId: 'F', name: 'Family' } });
});

describe('sync engine', () => {
  it('first sync creates the file; the next sync with no changes uploads nothing', async () => {
    await db.weighIns.add(wk('a'));
    await syncNow();
    expect(remote.writes).toBe(1);
    expect(parseSyncData(remote.text!).weighIns.map((w) => w.id)).toEqual(['a']);
    await syncNow();
    expect(remote.writes).toBe(1);
    await refreshStatus();
    expect(getStatus().dirty).toBe(false);
    expect(getStatus().phase).toBe('idle');
  });

  it('a phone with no data pulls everything from OneDrive', async () => {
    remote.otherPhoneAdds(wk('x'));
    remote.otherPhoneAdds(wk('y'));
    await syncNow();
    expect(await live()).toEqual(['x', 'y']);
  });

  it('local changes show as "not synced" until they upload', async () => {
    await syncNow();
    await db.weighIns.add(wk('new'));
    await refreshStatus();
    expect(getStatus().dirty).toBe(true);
    await syncNow();
    expect(getStatus().dirty).toBe(false);
  });

  it('both phones\' records survive when the other phone writes in the middle of our sync', async () => {
    await db.weighIns.add(wk('mine'));
    remote.otherPhoneAdds(wk('theirs-1'));
    // After we read the file, the other phone saves again, so our upload is refused and we must merge and retry.
    remote.beforeWrite = () => remote.otherPhoneAdds(wk('theirs-2'));
    await runCycle(remote);
    expect(parseSyncData(remote.text!).weighIns.map((w) => w.id).sort()).toEqual(['mine', 'theirs-1', 'theirs-2']);
    expect(await live()).toEqual(['mine', 'theirs-1', 'theirs-2']);
  });

  it('deleting a record syncs as a tombstone and removes it on the other side', async () => {
    const w = wk('gone', 1);
    await db.weighIns.add(w);
    await syncNow();
    await db.weighIns.put({ ...w, deletedAt: 50, updatedAt: 50 });
    await syncNow();
    expect(parseSyncData(remote.text!).weighIns[0].deletedAt).toBe(50);

    // The "other phone" still has the live copy; syncing must not bring it back.
    await db.weighIns.put(w);
    await syncNow();
    expect(await live()).toEqual([]);
  });

  it('an expired sign-in shows "needs-auth" and loses nothing', async () => {
    await db.weighIns.add(wk('keep'));
    remote.authFails = true;
    await syncNow();
    expect(getStatus().phase).toBe('needs-auth');
    expect(await live()).toEqual(['keep']);
    expect(getStatus().dirty).toBe(true); // still queued

    remote.authFails = false;
    await syncNow();
    expect(getStatus().phase).toBe('idle');
    expect(parseSyncData(remote.text!).weighIns.map((w) => w.id)).toEqual(['keep']);
  });

  it('gives up after repeated conflicts without losing local data', async () => {
    await db.weighIns.add(wk('keep'));
    remote.otherPhoneAdds(wk('t0'));
    const original = remote.write.bind(remote);
    let n = 0;
    remote.write = async (d, e) => { remote.otherPhoneAdds(wk('t' + ++n)); return original(d, e); };
    await syncNow();
    expect(getStatus().phase).toBe('error');
    expect(await live()).toContain('keep');
  });
});
