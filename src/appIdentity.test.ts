import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as mine from './appIdentity';
import { installStorageNamespace } from './installStorageNamespace';
import { MS_CLIENT_ID, DATA_FILE_NAME as configFile } from './config';

// Lift Log, Erika's Lift Log and this app are on the same website (addkap.github.io), so they share
// the browser's storage. These checks prove every name this app uses is different from theirs.

describe('this app does not collide with the Lift Log apps', () => {
  for (const other of mine.OTHER_APPS) {
    it(`uses different storage and OneDrive names from ${other.app}`, () => {
      expect(mine.DB_NAME).not.toBe(other.dbName);
      expect(mine.STORAGE_PREFIX).not.toBe(other.storagePrefix);
      expect(mine.DATA_FILE_NAME).not.toBe(other.dataFileName);
      expect(mine.SYNC_APP_TAG).not.toBe(other.syncAppTag);
      expect(mine.RETURN_TAB_KEY).not.toBe(other.returnTabKey);
      expect(mine.SYNC_FOLDER_KEY).not.toBe(other.syncFolderKey);
      expect(mine.BACKUP_FILE_PREFIX).not.toBe(other.backupFilePrefix);
      expect(mine.SW_CACHE_ID).not.toBe(other.swCacheId);
    });
  }
  it('prefixes every localStorage key, including the Microsoft sign-in cache', () => {
    expect(mine.STORAGE_PREFIX.startsWith('msal.')).toBe(false);
    expect(mine.STORAGE_PREFIX.length).toBeGreaterThan(0);
  });
  it('names its offline cache after itself and is served from its own address', () => {
    const vite = readFileSync('vite.config.ts', 'utf8');
    expect(vite).toContain('cacheId: SW_CACHE_ID');
    expect(vite).toMatch(/scope: base/);
    expect(readFileSync('.github/workflows/deploy.yml', 'utf8')).toContain('VITE_BASE: /${{ github.event.repository.name }}/');
  });
});

describe('private storage is switched on at start-up', () => {
  it('main.tsx loads it before anything else', () => {
    const lines = readFileSync('src/main.tsx', 'utf8').split('\n').filter((l) => l.startsWith('import'));
    expect(lines[0]).toContain('installStorageNamespace');
  });
  it('wraps a window’s localStorage once, with the app prefix', () => {
    const real = new Map<string, string>();
    const storage = {
      get length() { return real.size; },
      key: (i: number) => [...real.keys()][i] ?? null,
      getItem: (k: string) => real.get(k) ?? null,
      setItem: (k: string, v: string) => { real.set(k, v); },
      removeItem: (k: string) => { real.delete(k); },
      clear: () => real.clear(),
    };
    const fake = new Proxy(storage, { ownKeys: () => [...real.keys()], getOwnPropertyDescriptor: (_t, p) => (typeof p === 'string' && real.has(p) ? { value: real.get(p), enumerable: true, configurable: true, writable: true } : undefined) });
    const win = { localStorage: fake, BroadcastChannel: class { constructor(public name: string) {} } } as unknown as Window & typeof globalThis;
    expect(installStorageNamespace(win)).toBe(true);
    win.localStorage.setItem('msal.x', '1');
    expect([...real.keys()]).toEqual([`${mine.STORAGE_PREFIX}msal.x`]);
    expect(installStorageNamespace(win)).toBe(true);
    expect((new win.BroadcastChannel('msal.broadcast.cache') as unknown as { name: string }).name).toBe(`${mine.BROADCAST_PREFIX}msal.broadcast.cache`);
  });
});

describe('OneDrive and sign-in are this app’s own', () => {
  it('never reuses either Lift Log app’s Microsoft registration', () => {
    // A separate registration keeps sign-ins apart. Empty means "not set up yet", which is allowed.
    expect(['339a83cd-d197-4a3e-9474-12cf7a11b019', '103356ce-fabd-4cfe-9076-8753b3b9261e']).not.toContain(MS_CLIENT_ID.trim());
  });
  it('the sync code uses the names in appIdentity.ts, not hard-coded Lift Log ones', () => {
    expect(configFile).toBe(mine.DATA_FILE_NAME);
    for (const f of ['src/db.ts', 'src/config.ts', 'src/sync/auth.ts', 'src/sync/meta.ts', 'src/sync/merge.ts', 'src/sync/local.ts', 'src/sync/graph.ts', 'src/components/BackupSettings.tsx', 'src/components/FolderPicker.tsx']) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/'lift-log'|'erika-lift-log'|lift-log-data\.json|lift-log-backup|lift-return-tab|lift-sync-folder/);
    }
  });
});
