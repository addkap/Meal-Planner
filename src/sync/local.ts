// Reading and merging the local database for sync.
import { SYNC_APP_TAG } from '../appIdentity';
import { db } from '../db';
import { mergeData, SYNC_TABLES, type SyncData } from './merge';

export async function readLocalData(): Promise<SyncData> {
  const lists = await Promise.all(SYNC_TABLES.map((t) => db.table(t).toArray()));
  return { app: SYNC_APP_TAG, version: 1, savedAt: Date.now(), ...Object.fromEntries(SYNC_TABLES.map((t, i) => [t, lists[i]])) } as SyncData;
}

/**
 * Merge the remote data into the local database and return the merged result.
 * Reading, merging and writing happen in ONE transaction, so something saved at the same moment
 * can never be overwritten by an older copy.
 */
export function applyMerge(remote: SyncData | null): Promise<SyncData> {
  return db.transaction('rw', SYNC_TABLES.map((t) => db.table(t)), async () => {
    const { merged, remoteWon } = mergeData(await readLocalData(), remote);
    for (const t of SYNC_TABLES) if (remoteWon[t].length) await db.table(t).bulkPut(remoteWon[t]);
    return merged;
  });
}
