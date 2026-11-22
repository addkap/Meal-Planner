// The Recipes tab: the built-in library, favorites and her own recipes, searchable, plus "Add a recipe".
import { useState } from 'react';
import { useAppData } from '../AppData';
import { useNav } from '../nav';
import { EffortBadge, kcalText, minutesText, Segmented } from '../components/ui';
import type { MealSlot } from '../types';

type Filter = 'all' | MealSlot | 'favorites' | 'mine';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
  { value: 'favorites', label: '★ Favorites' },
  { value: 'mine', label: 'My recipes' },
];
const FEEDBACK_TEXT = { more: 'Use more', less: 'Use less', never: "Don't use" } as const;

export default function RecipesPage() {
  const { pool, prefs, myIds, hiddenIds } = useAppData();
  const { open } = useNav();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const list = pool
    .filter((p) => !hiddenIds.has(p.id))
    .filter((p) => (filter === 'all' ? true : filter === 'favorites' ? prefs.get(p.id)?.favorite : filter === 'mine' ? myIds.has(p.id) : p.recipe.meal === filter))
    .filter((p) => words.every((w) => p.recipe.name.toLowerCase().includes(w) || [...p.tags].some((t) => t.includes(w))))
    .sort((a, b) => a.recipe.name.localeCompare(b.recipe.name));

  return (
    <>
      <div className="row-between"><h1>Recipes</h1><button className="chip" onClick={() => open({ name: 'recipe-edit' })}>+ Add a recipe</button></div>
      <input className="search" type="search" placeholder="Search recipes (e.g. salmon, lentil)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search recipes" />
      <Segmented label="Show" value={filter} options={FILTERS} onChange={setFilter} />
      <p className="muted">{list.length} {list.length === 1 ? 'recipe' : 'recipes'}</p>
      {list.map((p) => {
        const pref = prefs.get(p.id);
        return (
          <button key={p.id} className="recipe-row" onClick={() => open({ name: 'recipe', recipeId: p.id })}>
            <span className="meal-name">{pref?.favorite ? '★ ' : ''}{p.recipe.name}{myIds.has(p.id) ? ' (mine)' : ''}</span>
            <span className="meal-meta">
              <EffortBadge effort={p.effort} />
              <span>{minutesText(p.recipe.totalMin)}</span>
              <span>{kcalText(p.kcal)} per serving</span>
              {pref?.feedback && <span className="tag">{FEEDBACK_TEXT[pref.feedback]}</span>}
            </span>
          </button>
        );
      })}
      {filter === 'favorites' && list.length === 0 && <p className="muted">No favorites yet. Open a recipe and tap "Mark as favorite".</p>}
      {filter === 'mine' && list.length === 0 && <p className="muted">No recipes of your own yet. Tap "+ Add a recipe" to type one in. They get suggested in your plans.</p>}
    </>
  );
}
