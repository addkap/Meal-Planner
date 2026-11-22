import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as mine from './appIdentity';
import { installStorageNamespace } from './installStorageNamespace';

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
