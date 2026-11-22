// Imported FIRST in main.tsx. After this runs, this page's localStorage is private to this app:
// every key is stored with STORAGE_PREFIX in front. The Microsoft sign-in library keeps its tokens
// under fixed "msal.*" key names (shared by every app on the site that uses the same client ID),
// so this is what keeps this app's sign-in separate from the Lift Log apps on the same website.
import { BROADCAST_PREFIX, STORAGE_PREFIX } from './appIdentity';
import { createNamespacedStorage } from './lib/namespacedStorage';

const FLAG = '__mealPlannerStorageNamespace';

export function installStorageNamespace(win: Window & typeof globalThis = window): boolean {
  const w = win as unknown as Record<string, unknown>;
  if (w[FLAG]) return true; // already installed (for example after a hot reload)
  try {
    const scoped = createNamespacedStorage(win.localStorage, STORAGE_PREFIX);
    Object.defineProperty(win, 'localStorage', { value: scoped, configurable: true, writable: true });
    // The sign-in library also announces cache changes to other tabs on a channel with a fixed name.
    const Native = win.BroadcastChannel;
    if (Native) {
      win.BroadcastChannel = class extends Native {
        constructor(name: string) { super(name.startsWith('msal.') ? BROADCAST_PREFIX + name : name); }
      };
    }
    w[FLAG] = true;
    return true;
  } catch {
    return false; // storage not available (private mode): the app still works, it just cannot stay signed in
  }
}

if (typeof window !== 'undefined') installStorageNamespace();
