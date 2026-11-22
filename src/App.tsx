// Phase 1 placeholder: a read-only preview of the recipe library with computed nutrition,
// so the data can be reviewed in a browser. The real screens arrive in phase 3.
import { useEffect, useState } from 'react';
import { BUILTIN_RECIPES } from './data/recipes';
import { loadFoodDb, type FoodDb } from './lib/foodDb';
import { EFFORT_LABEL, recipeNutrition } from './lib/recipes';
import { MEAL_SLOTS } from './types';

const TITLES = { breakfast: 'Breakfasts', lunch: 'Lunches', dinner: 'Dinners', snack: 'Snacks' } as const;

export default function App() {
  const [db, setDb] = useState<FoodDb | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { loadFoodDb().then(setDb, (e: Error) => setError(e.message)); }, []);

  return (
    <>
      <header className="banner-top"><span className="brand">Meal Planner</span></header>
      <main className="page">
        <h1>Recipe library</h1>
        <p className="muted">Preview of the {BUILTIN_RECIPES.length} built-in recipes. Nutrition is worked out from the ingredients.</p>
        {error && <p className="error">{error}</p>}
        {!db && !error && <p>Loading the food list…</p>}
        {db && MEAL_SLOTS.map((slot) => (
          <section key={slot}>
            <h2>{TITLES[slot]}</h2>
            {BUILTIN_RECIPES.filter((r) => r.meal === slot).map((r) => {
              const n = recipeNutrition(r, db).perServing;
              return (
                <div className="card" key={r.id}>
                  <strong>{r.name}</strong>
                  <p className="muted">{EFFORT_LABEL[r.effort]} · {r.totalMin} min · {Math.round(n.kcal.amount)} kcal · {Math.round(n.protein.amount)} g protein · {n.fiber.amount.toFixed(0)} g fiber</p>
                </div>
              );
            })}
          </section>
        ))}
      </main>
    </>
  );
}
