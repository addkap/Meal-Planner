// A view of localStorage where every key silently gets a prefix. To the code using it (including
// the Microsoft sign-in library) it looks like a normal, separate localStorage, but the real keys
// in the browser are "<prefix><key>". Two apps on the same website that use different prefixes
// can never see or overwrite each other's data.

const API = ['length', 'key', 'getItem', 'setItem', 'removeItem', 'clear'] as const;

export function createNamespacedStorage(backing: Storage, prefix: string): Storage {
  const ownKeys = (): string[] =>
    Object.keys(backing).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));

  const api = {
    get length() { return ownKeys().length; },
    key: (i: number) => ownKeys()[i] ?? null,
    getItem: (k: string) => backing.getItem(prefix + k),
    setItem: (k: string, v: string) => backing.setItem(prefix + k, String(v)),
    removeItem: (k: string) => backing.removeItem(prefix + k),
    clear: () => ownKeys().forEach((k) => backing.removeItem(prefix + k)),
  };
  const isApi = (p: string | symbol): p is (typeof API)[number] => typeof p === 'string' && (API as readonly string[]).includes(p);

  // Real Storage objects also let you read items as properties (storage.foo) and list them with Object.keys.
  return new Proxy({} as Storage, {
    get: (_t, p) => {
      if (isApi(p)) return api[p];
      if (typeof p === 'string') {
        const item = backing.getItem(prefix + p);
        if (item !== null) return item;
      }
      return Reflect.get(Object.prototype, p); // hasOwnProperty, toString... work like on a real Storage
    },
    set: (_t, p, v) => { if (typeof p === 'string' && !isApi(p)) backing.setItem(prefix + p, String(v)); return true; },
    deleteProperty: (_t, p) => { if (typeof p === 'string') backing.removeItem(prefix + p); return true; },
    has: (_t, p) => isApi(p) || (typeof p === 'string' && backing.getItem(prefix + p) !== null),
    ownKeys: () => ownKeys(),
    getOwnPropertyDescriptor: (_t, p) =>
      typeof p === 'string' && !isApi(p) && backing.getItem(prefix + p) !== null
        ? { value: backing.getItem(prefix + p), writable: true, enumerable: true, configurable: true }
        : undefined,
  });
}
