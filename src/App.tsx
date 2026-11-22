import { useEffect, useMemo, useState } from 'react';
import { AppDataProvider } from './AppData';
import { NavCtx, TABS, type Nav, type Route, type Tab } from './nav';
import PlanPage from './pages/PlanPage';
import RecipePage from './pages/RecipePage';
import RecipesPage from './pages/RecipesPage';
import ComingSoon from './pages/ComingSoon';

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
  const [tab, setTabState] = useState<Tab>('Plan');
  const [stack, setStack] = useState<Route[]>([]);
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
      {!online && <p className="offline" role="status">Offline: everything still saves on this phone.</p>}
      <main className="page">
        <AppDataProvider>
          {top?.name === 'recipe' ? (
            <RecipePage key={top.recipeId + (top.meal?.date ?? '') + (top.meal?.slot ?? '')} recipeId={top.recipeId} meal={top.meal} />
          ) : (
            <>
              {tab === 'Plan' && <PlanPage />}
              {tab === 'Groceries' && <ComingSoon title="Groceries" phase={4} text="Grocery lists split by store." />}
              {tab === 'Today' && <ComingSoon title="Today" phase={5} text="Check off what you ate, log other foods, scan barcodes, and see the day's nutrition." />}
              {tab === 'Recipes' && <RecipesPage />}
              {tab === 'More' && <ComingSoon title="More" phase={7} text="Weight tracker and Settings." />}
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
