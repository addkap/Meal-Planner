// Pure merge logic for syncing. No network and no database in this file, so it is easy to test.
// (The same rules as Lift Log, for every kind of record this app keeps.)
//
// Rules: every record has an id and updatedAt. When both sides have the same record, the one with the
// newer updatedAt wins. A deleted record is kept as a "tombstone" (deletedAt set) so the deletion
// travels to the other device instead of the record coming back.

import { SYNC_APP_TAG } from '../appIdentity';
import type { Batch, CustomFood, DayTargets, GroceryMark, LogEntry, MyRecipe, RecipePref, Settings, Store, StoreAssignment, WeekPlan, WeighIn } from '../types';

/** Everything that syncs, by table name. Device-only things (the OneDrive folder choice) are not here. */
export interface SyncTables {
  settings: Settings[];
  plans: WeekPlan[];
  prefs: RecipePref[];
  myRecipes: MyRecipe[];
  customFoods: CustomFood[];
  batches: Batch[];
  logs: LogEntry[];
  dayTargets: DayTargets[];
  stores: Store[];
  storeAssignments: StoreAssignment[];
  groceryMarks: GroceryMark[];
  weighIns: WeighIn[];
}

export const SYNC_TABLES = ['settings', 'plans', 'prefs', 'myRecipes', 'customFoods', 'batches', 'logs', 'dayTargets', 'stores', 'storeAssignments', 'groceryMarks', 'weighIns'] as const satisfies readonly (keyof SyncTables)[];
export type TableName = (typeof SYNC_TABLES)[number];

export interface SyncData extends SyncTables {
  app: typeof SYNC_APP_TAG;
  version: 1;
  savedAt: number;
}

/** The remote copy (the JSON file in OneDrive). etag is null when the file does not exist yet. */
export interface RemoteStore {
  read(): Promise<{ etag: string | null; data: SyncData | null }>;
  /** Save only if the file is still the version we read ('conflict' means someone else wrote first). */
  write(data: SyncData, etag: string | null): Promise<'ok' | 'conflict'>;
}

const emptyTables = (): SyncTables => Object.fromEntries(SYNC_TABLES.map((t) => [t, []])) as unknown as SyncTables;
export const emptyData = (): SyncData => ({ app: SYNC_APP_TAG, version: 1, savedAt: 0, ...emptyTables() });

interface Rec { id: string; updatedAt: number; deletedAt?: number }

/** Should the remote record replace the local one? Newest wins; on an exact tie a deletion wins. */
function remoteIsNewer(local: Rec, remote: Rec): boolean {
  if (remote.updatedAt !== local.updatedAt) return remote.updatedAt > local.updatedAt;
  return !!remote.deletedAt && !local.deletedAt;
}

export function mergeCollections<T extends Rec>(local: T[], remote: T[]): { merged: T[]; remoteWon: T[] } {
  const byId = new Map(local.map((r) => [r.id, r]));
  const remoteWon: T[] = [];
  for (const r of remote) {
    const l = byId.get(r.id);
    if (!l || remoteIsNewer(l, r)) {
      byId.set(r.id, r);
      remoteWon.push(r);
    }
  }
  return { merged: [...byId.values()], remoteWon };
}

export interface MergeResult {
  merged: SyncData;
  /** The records that came from the remote and must be written to the local database. */
  remoteWon: SyncTables;
}

export function mergeData(local: SyncData, remote: SyncData | null): MergeResult {
  if (!remote) return { merged: local, remoteWon: emptyTables() };
  const merged = { ...local, savedAt: Date.now() } as SyncData;
  const remoteWon = emptyTables();
  for (const t of SYNC_TABLES) {
    const m = mergeCollections<Rec>(local[t] as Rec[], remote[t] as Rec[]);
    (merged as unknown as Record<string, Rec[]>)[t] = m.merged;
    (remoteWon as unknown as Record<string, Rec[]>)[t] = m.remoteWon;
  }
  return { merged, remoteWon };
}

/**
 * A short fingerprint of "which version of every record we have". If the fingerprint of the phone's data
 * differs from the fingerprint at the last sync, there are changes waiting to upload.
 */
export function signature(d: SyncTables): string {
  const lines: string[] = [];
  for (const t of SYNC_TABLES) for (const r of d[t] as Rec[]) lines.push(`${t}:${r.id}:${r.updatedAt}:${r.deletedAt ?? 0}`);
  lines.sort();
  let h = 5381; // djb2 hash
  for (const ch of lines.join('\n')) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return `${lines.length}-${h.toString(16)}`;
}

/** True if both sides hold exactly the same record versions (so nothing needs uploading). */
export function sameVersions(a: SyncData, b: SyncData): boolean {
  return signature(a) === signature(b);
}

/** Read and check a JSON data file (from OneDrive or from a backup). Throws a friendly Error if it is wrong. */
export function parseSyncData(text: string): SyncData {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!raw || typeof raw !== 'object' || raw.app !== SYNC_APP_TAG) throw new Error('That is not a Meal Planner data file.');
  if (typeof raw.version === 'number' && raw.version > 1) throw new Error('That file is from a newer version of this app. Update the app first.');
  const records = (v: unknown): Rec[] =>
    Array.isArray(v) ? v.filter((x) => x && typeof x.id === 'string' && typeof x.updatedAt === 'number') : [];
  const out = emptyData();
  out.savedAt = typeof raw.savedAt === 'number' ? raw.savedAt : 0;
  for (const t of SYNC_TABLES) (out as unknown as Record<string, Rec[]>)[t] = records(raw[t]);
  return out;
}

/** How many live (not deleted) records of a kind, e.g. for "Backup saved with 42 meals logged". */
export const liveCount = (d: SyncTables, t: TableName) => (d[t] as Rec[]).filter((r) => !r.deletedAt).length;
