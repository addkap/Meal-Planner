import { describe, expect, it } from 'vitest';
import { createNamespacedStorage } from './namespacedStorage';

/** A tiny stand-in for window.localStorage that behaves like the real one (including Object.keys). */
function fakeStorage(): Storage {
  const data = new Map<string, string>();
  const base = {
    get length() { return data.size; },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, String(v)); },
    removeItem: (k: string) => { data.delete(k); },
    clear: () => data.clear(),
  };
  return new Proxy(base, { ownKeys: () => [...data.keys()], getOwnPropertyDescriptor: (_t, p) => (typeof p === 'string' && data.has(p) ? { value: data.get(p), enumerable: true, configurable: true, writable: true } : undefined) }) as unknown as Storage;
}

describe('private (prefixed) localStorage', () => {
  it('stores keys with the prefix and reads them back without it', () => {
    const real = fakeStorage();
    const mine = createNamespacedStorage(real, 'erika:');
    mine.setItem('msal.token', 'abc');
    expect(mine.getItem('msal.token')).toBe('abc');
    expect(real.getItem('erika:msal.token')).toBe('abc');
    expect(real.getItem('msal.token')).toBeNull();
  });
  it('never sees or touches the other app’s keys', () => {
    const real = fakeStorage();
    real.setItem('msal.token', 'liftlog-token'); // what the original Lift Log stores
    const mine = createNamespacedStorage(real, 'erika:');
    expect(mine.getItem('msal.token')).toBeNull();
    mine.setItem('msal.token', 'erika-token');
    mine.removeItem('msal.token');
    expect(real.getItem('msal.token')).toBe('liftlog-token');
  });
  it('clear() and the key list only cover its own keys (the Microsoft library lists keys this way)', () => {
    const real = fakeStorage();
    real.setItem('msal.a', '1');
    const mine = createNamespacedStorage(real, 'erika:');
    mine.setItem('msal.a', '2');
    mine.setItem('x', '3');
    expect(Object.keys(mine).sort()).toEqual(['msal.a', 'x']);
    expect(mine.length).toBe(2);
    expect(Object.prototype.hasOwnProperty.call(mine, 'x')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(mine, 'nope')).toBe(false);
    // The Microsoft library calls it directly on localStorage, like this:
    expect(mine.hasOwnProperty('x')).toBe(true);
    expect(mine.hasOwnProperty('nope')).toBe(false);
    mine.clear();
    expect(Object.keys(mine)).toEqual([]);
    expect(real.getItem('msal.a')).toBe('1');
  });
  it('supports property-style access too', () => {
    const real = fakeStorage();
    const mine = createNamespacedStorage(real, 'erika:') as unknown as Record<string, string>;
    mine.color = 'blue';
    expect(real.getItem('erika:color')).toBe('blue');
    expect(mine.color).toBe('blue');
    delete mine.color;
    expect(real.getItem('erika:color')).toBeNull();
  });
});
