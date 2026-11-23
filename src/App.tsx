import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppDataProvider } from './AppData';
import { NavCtx, TABS, type Nav, type Route, type Tab } from './nav';
import PlanPage from './pages/PlanPage';
import RecipePage from './pages/RecipePage';
import RecipesPage from './pages/RecipesPage';
import GroceriesPage from './pages/GroceriesPage';
import TodayPage from './pages/TodayPage';
import LogFoodPage from './pages/LogFoodPage';
import MorePage from './pages/MorePage';
import WeightPage from './pages/WeightPage';
import SettingsPage from './pages/SettingsPage';
import SyncChip from './components/SyncChip';
import { RETURN_TAB_KEY } from './appIdentity';
import { initialPullIfEmpty, startAutoSync } from './sync/engine';
import RecipeEditorPage from './pages/RecipeEditorPage';
import { BatchesPage, BatchNewPage, BatchPlanPage } from './pages/BatchPages';
import { repairPlanDates } from './store';

/** True when the phone has internet. Everything works either way. */
function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

export default function App() {
  // After coming back from the Microsoft sign-in page, reopen Settings.
  const returnTo = (() => { try { return localStorage.getItem(RETURN_TAB_KEY); } catch { return null; } })();
  const [tab, setTabState] = useState<Tab>(returnTo === 'settings' ? 'More' : 'Plan');
  const [stack, setStack] = useState<Route[]>(returnTo === 'settings' ? [{ name: 'settings' }] : []);

  // Background OneDrive sync (local-first: nothing waits for it). A phone with no data pulls first.
  useEffect(() => {
    try { localStorage.removeItem(RETURN_TAB_KEY); } catch { /* ignore */ }
    void repairPlanDates().catch(() => {});
    void Promise.race([initialPullIfEmpty().catch(() => {}), new Promise((r) => setTimeout(r, 7000))]).then(() => startAutoSync());
  }, []);
  const online = useOnline();

  // Where she was scrolled on each page under the top one, so Back returns her to the same spot.
  const scrollSpots = useRef<number[]>([]);
  const restoreTo = useRef<number | null>(null);
  const nav = useMemo<Nav>(() => ({
    tab,
    setTab: (t) => { scrollSpots.current = []; setTabState(t); setStack([]); window.scrollTo(0, 0); },
    open: (r) => { scrollSpots.current.push(window.scrollY); setStack((s) => [...s, r]); window.scrollTo(0, 0); },
    back: () => { restoreTo.current = scrollSpots.current.pop() ?? 0; setStack((s) => s.slice(0, -1)); },
  }), [tab]);
  // After going back, the page underneath is shown again (it stayed open, hidden): put the scroll back.
  useLayoutEffect(() => {
    if (restoreTo.current === null) return;
    window.scrollTo(0, restoreTo.current);
    restoreTo.current = null;
  }, [stack]);

  const top = stack[stack.length - 1];

  return (
    <NavCtx.Provider value={nav}>
      <header className="banner-top">
        <span className="brand">Meal Planner</span>
      </header>
      <SyncChip />
      {!online && <p className="offline" role="status">Offline: everything still saves on this phone.</p>}
      <main className="page">
        <AppDataProvider>
          {/* Pages opened on top stay open underneath (hidden) so Back finds them as she left them:
              same scroll spot, same search, same filters. */}
          <div hidden={stack.length > 0}>
            {tab === 'Plan' && <PlanPage />}
            {tab === 'Groceries' && <GroceriesPage />}
            {tab === 'Today' && <TodayPage />}
            {tab === 'Recipes' && <RecipesPage />}
            {tab === 'More' && <MorePage />}
          </div>
          {stack.map((r, i) => (
            <div key={`${i}:${routeKey(r)}`} hidden={i !== stack.length - 1}>{routePage(r)}</div>
          ))}
        </AppDataProvider>
      </main>
      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button key={t} className={t === tab && !top ? 'tab active' : 'tab'} aria-current={t === tab ? 'page' : undefined} onClick={() => nav.setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
    </NavCtx.Provider>
  );
}

function routeKey(r: Route): string {
  switch (r.name) {
    case 'recipe': return `recipe:${r.recipeId}:${r.meal?.date ?? ''}:${r.meal?.slot ?? ''}`;
    case 'log': return `log:${r.date}:${r.slot}:${r.editId ?? ''}`;
    case 'batch-plan': return `batch-plan:${r.batchId}:${r.weekStart ?? ''}`;
    case 'recipe-edit': return `recipe-edit:${r.id ?? 'new'}`;
    default: return r.name;
  }
}

function routePage(r: Route): ReactNode {
  switch (r.name) {
    case 'recipe': return <RecipePage recipeId={r.recipeId} meal={r.meal} />;
    case 'log': return <LogFoodPage date={r.date} slot={r.slot} editId={r.editId} />;
    case 'batches': return <BatchesPage />;
    case 'batch-new': return <BatchNewPage />;
    case 'batch-plan': return <BatchPlanPage batchId={r.batchId} weekStart={r.weekStart} />;
    case 'settings': return <SettingsPage />;
    case 'weight': return <WeightPage />;
    case 'recipe-edit': return <RecipeEditorPage id={r.id} />;
  }
}
