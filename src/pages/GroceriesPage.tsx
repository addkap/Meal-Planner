// The Groceries tab: this week's list, one list per store plus "Buy at any store" items on every list.
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAppData } from '../AppData';
import { useNav } from '../nav';
import { addStore, assignStore, removeStore, renameStore, setMark } from '../store';
import { GROCERY_CATEGORIES } from '../lib/categories';
import { addDays, shortDate, todayLocal, weekStartOf } from '../lib/dates';
import { ANY_STORE, buildGroceryList, itemLine, listForStore, resolveItems, storeListText, UNASSIGNED, type ItemState } from '../lib/grocery';
import type { Store } from '../types';

const EVERYTHING = 'everything';

export default function GroceriesPage() {
  const { recipes, foods, batches } = useAppData();
  const { setTab } = useNav();
  const [weekStart, setWeekStart] = useState(() => weekStartOf(todayLocal()));
  const plan = useLiveQuery(async () => (await db.plans.get(weekStart)) ?? null, [weekStart]);
  const stores = useLiveQuery(() => db.stores.toArray(), []);
  const assignments = useLiveQuery(() => db.storeAssignments.toArray(), []);
  const marks = useLiveQuery(() => db.groceryMarks.where('weekStart').equals(weekStart).toArray(), [weekStart]);
  const [view, setView] = useState<string | null>(null);
  const [copied, setCopied] = useState('');

  const items = useMemo(() => (plan && !plan.deletedAt ? buildGroceryList(plan.days, recipes, foods, batches) : []), [plan, recipes, foods, batches]);
  if (plan === undefined || !stores || !assignments || !marks) return null;

  const liveStores = stores.filter((s) => !s.deletedAt).sort((a, b) => a.order - b.order);
  const states = resolveItems(items, weekStart, liveStores, assignments, marks);
  const current = view ?? liveStores[0]?.id ?? EVERYTHING;
  const unassigned = states.filter((s) => s.storeId === UNASSIGNED && !s.have);
  const have = states.filter((s) => s.have);
  const storeName = (id: string) => (id === ANY_STORE ? 'Any store' : id === UNASSIGNED ? 'Not sorted yet' : liveStores.find((s) => s.id === id)?.name ?? 'Not sorted yet');

  async function copy(storeId: string) {
    const text = storeId === EVERYTHING
      ? [...liveStores.map((s) => s.id), ANY_STORE].map((id) => storeListText(storeName(id), weekStart, states, id)).join('\n\n')
      : storeListText(storeName(storeId), weekStart, states, storeId);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // older phones: copy through a hidden text box
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(storeId);
    setTimeout(() => setCopied(''), 2500);
  }

  return (
    <>
      <div className="weekbar">
        <button className="arrow" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}>‹</button>
        <div className="weekbar-title">
          <h1>Groceries</h1>
          <span className="muted">Week of {shortDate(weekStart)}</span>
        </div>
        <button className="arrow" aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))}>›</button>
      </div>

      {!plan || plan.deletedAt ? (
        <div className="card">
          <p>There is no meal plan for this week yet, so there is nothing to buy.</p>
          <button className="btn primary" onClick={() => setTab('Plan')}>Make a plan</button>
        </div>
      ) : (
        <>
          {liveStores.length === 0 && (
            <div className="card">
              <p><b>Add the stores you shop at</b> (at the bottom of this page) to split the list by store. Until then, everything is on one list.</p>
            </div>
          )}

          {unassigned.length > 0 && liveStores.length > 0 && (
            <div className="card sort-card">
              <h2>Where do you buy these?</h2>
              <p className="muted small">New items. Tap a store once and the app remembers it for next time.</p>
              {unassigned.length > 3 && (
                <div className="bulk">
                  <span>Put all {unassigned.length} at:</span>
                  <div className="sort-chips">
                    {liveStores.map((st) => <button key={st.id} className="chip" onClick={() => void Promise.all(unassigned.map((s) => assignStore(s.item.key, st.id)))}>{st.name}</button>)}
                    <button className="chip any" onClick={() => void Promise.all(unassigned.map((s) => assignStore(s.item.key, ANY_STORE)))}>Any store</button>
                  </div>
                  <p className="muted small">You can move single items later from their row.</p>
                </div>
              )}
              {unassigned.map((s) => (
                <div key={s.item.key} className="sort-row">
                  <span className="sort-name">{itemLine(s.item)}</span>
                  <div className="sort-chips">
                    {liveStores.map((st) => <button key={st.id} className="chip" onClick={() => void assignStore(s.item.key, st.id)}>{st.name}</button>)}
                    <button className="chip any" onClick={() => void assignStore(s.item.key, ANY_STORE)}>Any store</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="segmented" role="radiogroup" aria-label="Which list">
            {liveStores.map((s) => <button key={s.id} role="radio" aria-checked={current === s.id} className={current === s.id ? 'seg on' : 'seg'} onClick={() => setView(s.id)}>{s.name}</button>)}
            <button role="radio" aria-checked={current === EVERYTHING} className={current === EVERYTHING ? 'seg on' : 'seg'} onClick={() => setView(EVERYTHING)}>Everything</button>
          </div>

          {current === EVERYTHING ? (
            <>
              {liveStores.map((st) => <StoreSection key={st.id} title={st.name} list={states.filter((s) => s.storeId === st.id && !s.have)} weekStart={weekStart} stores={liveStores} storeName={storeName} />)}
              <AnyStoreBox list={states.filter((s) => s.storeId === ANY_STORE && !s.have)} weekStart={weekStart} stores={liveStores} storeName={storeName} />
              <StoreSection title={liveStores.length ? 'Not sorted yet' : 'Your list'} list={states.filter((s) => s.storeId === UNASSIGNED && !s.have)} weekStart={weekStart} stores={liveStores} storeName={storeName} />
            </>
          ) : (
            (() => {
              const { own, any } = listForStore(states, current);
              return (
                <>
                  <StoreSection title={storeName(current)} list={own} weekStart={weekStart} stores={liveStores} storeName={storeName} />
                  <AnyStoreBox list={any} weekStart={weekStart} stores={liveStores} storeName={storeName} />
                </>
              );
            })()
          )}

          <button className="btn" onClick={() => void copy(current)}>{copied === current ? 'Copied! Paste it into a message or note.' : `Copy ${current === EVERYTHING ? 'the whole list' : `the ${storeName(current)} list`} as text`}</button>

          {have.length > 0 && (
            <details className="card">
              <summary><h2>Already have ({have.length})</h2></summary>
              {have.map((s) => (
                <div key={s.item.key} className="row-between have-row">
                  <span>{itemLine(s.item)}</span>
                  <button className="chip" onClick={() => void setMark(weekStart, s.item.key, { have: false })}>Put back</button>
                </div>
              ))}
            </details>
          )}
        </>
      )}

      <StoresEditor stores={liveStores} />
    </>
  );
}

function StoreSection({ title, list, weekStart, stores, storeName }: { title: string; list: ItemState[]; weekStart: string; stores: Store[]; storeName: (id: string) => string }) {
  if (!list.length) return null;
  const left = list.filter((s) => !s.checked).length;
  return (
    <section className="store-section">
      <h2>{title} <span className="muted small">{left} to buy</span></h2>
      <ItemsByAisle list={list} weekStart={weekStart} stores={stores} storeName={storeName} />
    </section>
  );
}

function AnyStoreBox({ list, weekStart, stores, storeName }: { list: ItemState[]; weekStart: string; stores: Store[]; storeName: (id: string) => string }) {
  if (!list.length) return null;
  return (
    <section className="any-box">
      <h2>Buy at any store</h2>
      <p className="muted small">These show on every store's list. Pick them up wherever you are.</p>
      <ItemsByAisle list={list} weekStart={weekStart} stores={stores} storeName={storeName} />
    </section>
  );
}

function ItemsByAisle({ list, weekStart, stores, storeName }: { list: ItemState[]; weekStart: string; stores: Store[]; storeName: (id: string) => string }) {
  return (
    <>
      {GROCERY_CATEGORIES.map((c) => {
        const inCat = list.filter((s) => s.item.cat === c.id).sort((a, b) => Number(a.checked) - Number(b.checked));
        if (!inCat.length) return null;
        return (
          <div key={c.id} className="aisle">
            <h3>{c.label}</h3>
            {inCat.map((s) => <ItemRow key={s.item.key} s={s} weekStart={weekStart} stores={stores} storeName={storeName} />)}
          </div>
        );
      })}
    </>
  );
}

function ItemRow({ s, weekStart, stores, storeName }: { s: ItemState; weekStart: string; stores: Store[]; storeName: (id: string) => string }) {
  const [open, setOpen] = useState(false);
  const [moveTo, setMoveTo] = useState<string | null>(null);
  const { item } = s;
  return (
    <div className={s.checked ? 'item checked' : 'item'}>
      <div className="item-main">
        <button className={s.checked ? 'check on' : 'check'} role="checkbox" aria-checked={s.checked} aria-label={`Got ${item.name}`} onClick={() => void setMark(weekStart, item.key, { checked: !s.checked })}>
          {s.checked ? '✓' : ''}
        </button>
        <button className="item-text" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="item-name">{itemLine(item)}</span>
          {item.needed && <span className="muted small">Recipes need {item.needed}</span>}
          {s.thisWeekOnly && <span className="muted small">At {storeName(s.storeId)} this week only</span>}
        </button>
      </div>
      {open && (
        <div className="item-more">
          <p className="muted small">For: {item.uses.map((u) => `${u.recipe} (${u.label})`).join('; ')}</p>
          <button className="btn subtle" onClick={() => void setMark(weekStart, item.key, { have: true, checked: false })}>I already have this</button>
          {stores.length > 0 && (moveTo === null ? (
            <button className="btn subtle" onClick={() => setMoveTo(s.storeId === UNASSIGNED ? stores[0].id : s.storeId)}>Change store (now: {storeName(s.storeId)})</button>
          ) : (
            <div className="move-store">
              <div className="sort-chips">
                {stores.map((st) => <button key={st.id} className={moveTo === st.id ? 'chip on' : 'chip'} onClick={() => setMoveTo(st.id)}>{st.name}</button>)}
                <button className={moveTo === ANY_STORE ? 'chip on' : 'chip'} onClick={() => setMoveTo(ANY_STORE)}>Any store</button>
              </div>
              <div className="btns">
                <button className="btn primary" onClick={() => { void assignStore(item.key, moveTo); void setMark(weekStart, item.key, { storeOverride: undefined }); setMoveTo(null); setOpen(false); }}>Always buy it there</button>
                <button className="btn" onClick={() => { void setMark(weekStart, item.key, { storeOverride: moveTo }); setMoveTo(null); setOpen(false); }}>Just this week</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StoresEditor({ stores }: { stores: Store[] }) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  return (
    <details className="card" open={stores.length === 0}>
      <summary><h2>Your stores</h2></summary>
      {stores.map((s) => (
        <div key={s.id} className="store-edit">
          {editing === s.id ? (
            <form noValidate className="row-between" onSubmit={(e) => { e.preventDefault(); if (editName.trim()) void renameStore(s.id, editName); setEditing(null); }}>
              <input className="search" value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="Store name" autoFocus />
              <button className="chip" type="submit">Save</button>
            </form>
          ) : confirmRemove === s.id ? (
            <div>
              <p>Remove <b>{s.name}</b>? Its items go back to "Where do you buy these?".</p>
              <div className="btns">
                <button className="btn danger" onClick={() => { void removeStore(s.id); setConfirmRemove(null); }}>Remove</button>
                <button className="btn" onClick={() => setConfirmRemove(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="row-between">
              <span className="store-name">{s.name}</span>
              <span>
                <button className="chip" onClick={() => { setEditing(s.id); setEditName(s.name); }}>Rename</button>{' '}
                <button className="chip" onClick={() => setConfirmRemove(s.id)}>Remove</button>
              </span>
            </div>
          )}
        </div>
      ))}
      <form noValidate onSubmit={(e) => { e.preventDefault(); if (name.trim()) { void addStore(name); setName(''); } }}>
        <label className="field"><span>Add a store</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Trader Joe's" /></label>
        <button className="btn primary" type="submit" disabled={!name.trim()}>Add store</button>
      </form>
      <p className="muted small">"Buy at any store" is built in, for things like eggs that you pick up wherever you are.</p>
    </details>
  );
}
