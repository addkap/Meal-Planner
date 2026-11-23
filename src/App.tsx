import { useEffect, useMemo, useState } from 'react';
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
    void Promise.race([initialPullIfEmpty().catch(() => {}), new Promise((r) => setTimeout(r, 7000))]).then(() => startAutoSync());
  }, []);
  const online = useOnline();

  const nav = useMemo<Nav>(() => ({
    tab,
    setTab: (t) => { setTabState(t); setStack([]); window.scrollTo(0, 0); },
    open: (r) => { setStack((s) => [...s, r]); window.scrollTo(0, 0); },
    back: () => setStack((s) => s.slice(0, -1)),
  }), [tab]);

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
          {top?.name === 'recipe' ? (
            <RecipePage key={top.recipeId + (top.meal?.date ?? '') + (top.meal?.slot ?? '')} recipeId={top.recipeId} meal={top.meal} />
          ) : top?.name === 'log' ? (
            <LogFoodPage key={top.date + top.slot + (top.editId ?? '')} date={top.date} slot={top.slot} editId={top.editId} />
          ) : top?.name === 'batches' ? (
            <BatchesPage />
          ) : top?.name === 'batch-new' ? (
            <BatchNewPage />
          ) : top?.name === 'batch-plan' ? (
            <BatchPlanPage key={top.batchId + (top.weekStart ?? '')} batchId={top.batchId} weekStart={top.weekStart} />
          ) : top?.name === 'settings' ? (
            <SettingsPage />
          ) : top?.name === 'weight' ? (
            <WeightPage />
          ) : top?.name === 'recipe-edit' ? (
            <RecipeEditorPage key={top.id ?? 'new'} id={top.id} />
          ) : (
            <>
              {tab === 'Plan' && <PlanPage />}
              {tab === 'Groceries' && <GroceriesPage />}
              {tab === 'Today' && <TodayPage />}
              {tab === 'Recipes' && <RecipesPage />}
              {tab === 'More' && <MorePage />}
            </>
          )}
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
