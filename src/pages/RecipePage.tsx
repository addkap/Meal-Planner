// One recipe: ingredients scaled to the number of people, steps, full nutrition, and her feedback buttons.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAppData } from '../AppData';
import { useNav, type MealRef } from '../nav';
import { savePlan, setFavorite, setFeedback } from '../store';
import { explainPlacement } from '../lib/pool';
import { scaleIngredients, servingNutrition, recipeNutrition } from '../lib/recipes';
import { formatAmount, formatQty, ingredientText } from '../lib/units';
import { dayName } from '../lib/dates';
import NutritionPanel from '../components/NutritionPanel';
import { BackBar, EffortBadge, minutesText, Stepper } from '../components/ui';
import type { Feedback } from '../types';

const TAG_LABEL: Record<string, string> = {
  fish: 'Fish or seafood', poultry: 'Poultry', 'red-meat': 'Red meat', legume: 'Beans or legumes', vegetarian: 'Vegetarian',
  'whole-grain': 'Whole grains', vegetables: 'Vegetables', fruit: 'Fruit', 'nuts-seeds': 'Nuts or seeds', eggs: 'Eggs', dairy: 'Dairy',
  'batch-friendly': 'Good for batch cooking', 'make-ahead': 'Make ahead', 'no-cook': 'No cooking', freezer: 'Freezes well', treat: 'Treat',
};

const FEEDBACK: { value: Feedback; label: string }[] = [
  { value: 'more', label: 'Use more' },
  { value: 'less', label: 'Use less' },
  { value: 'never', label: "Don't use again" },
];

export default function RecipePage({ recipeId, meal }: { recipeId: string; meal?: MealRef }) {
  const { recipes, poolById, foods, settings, prefs } = useAppData();
  const { back } = useNav();
  const plan = useLiveQuery(async () => (meal ? (await db.plans.get(meal.weekStart)) ?? null : null), [meal?.weekStart]);
  const planned = meal && plan ? plan.days.find((d) => d.date === meal.date)?.meals.find((m) => m.slot === meal.slot) : undefined;
  const [localPeople, setLocalPeople] = useState(settings.people);

  const recipe = recipes.get(recipeId);
  const p = poolById.get(recipeId);
  if (!recipe || !p) return (<><BackBar onBack={back} /><p>That recipe could not be found.</p></>);

  const people = planned?.people ?? localPeople;
  const setPeople = (n: number) => {
    if (planned && plan && meal) {
      void savePlan({ ...plan, days: plan.days.map((d) => (d.date !== meal.date ? d : { ...d, meals: d.meals.map((m) => (m.slot === meal.slot ? { ...m, people: n } : m)) })) });
    } else setLocalPeople(n);
  };

  const n = recipeNutrition(recipe, foods);
  const pref = prefs.get(recipeId);
  const why = explainPlacement(p);
  const tags = [...p.tags].filter((t) => TAG_LABEL[t]);

  return (
    <article className="recipe">
      <BackBar onBack={back} />
      <h1>{recipe.name}</h1>
      <div className="meal-meta big">
        <EffortBadge effort={recipe.effort} />
        <span>{minutesText(recipe.totalMin)} total</span>
        <span>{minutesText(recipe.activeMin)} hands-on</span>
      </div>
      {meal && <p className="muted">Planned for {dayName(meal.date)} {meal.slot}{planned?.portion && planned.portion !== 1 ? `, your portion ${formatQty(planned.portion)} servings` : ''}.</p>}
      {recipe.about && <p>{recipe.about}</p>}
      {tags.length > 0 && <div className="tags">{tags.map((t) => <span key={t} className="tag">{TAG_LABEL[t]}</span>)}</div>}

      <section className="card">
        <div className="row-between">
          <h2>Ingredients</h2>
          <Stepper label="people" value={people} onChange={setPeople} unit={people === 1 ? 'person' : 'people'} />
        </div>
        <p className="muted small">Amounts for {people} {people === 1 ? 'person' : 'people'} (the recipe as written serves {recipe.servings}).{planned ? ' Changing this changes the grocery list too.' : ''}</p>
        <ul className="ingredients">
          {scaleIngredients(recipe, people).map((ing, i) => {
            const name = foods.get(ing.food)?.name.toLowerCase() ?? ing.food;
            const amount = formatAmount(ing.qty, ing.unit);
            const rest = ingredientText(ing.qty, ing.unit, name, ing.note).slice(amount.length);
            return (
              <li key={i}>
                <span className="qty">{amount}</span>{rest}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <h2>Steps</h2>
        <ol className="steps">{recipe.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      </section>

      <section className="card">
        <h2>Nutrition per serving</h2>
        <NutritionPanel totals={n.perServing} />
        {planned && planned.portion !== 1 && (
          <>
            <h2>Your portion ({formatQty(planned.portion)} servings)</h2>
            <NutritionPanel totals={servingNutrition(n, planned.portion)} compact />
          </>
        )}
      </section>

      <section className="card">
        <h2>How often should the planner use this?</h2>
        <div className="feedback">
          {FEEDBACK.map((f) => (
            <button key={f.value} className={pref?.feedback === f.value ? 'chip big on' : 'chip big'} aria-pressed={pref?.feedback === f.value}
              onClick={() => void setFeedback(recipeId, pref?.feedback === f.value ? null : f.value)}>{f.label}</button>
          ))}
        </div>
        <button className={pref?.favorite ? 'chip big on' : 'chip big'} aria-pressed={!!pref?.favorite} onClick={() => void setFavorite(recipeId, !pref?.favorite)}>
          {pref?.favorite ? '★ Favorite' : '☆ Mark as favorite'}
        </button>
        <p className="muted small">Tap a chosen button again to undo. "Use more" picks it about twice as often, "Use less" about half as often. Favorites come up more often too.</p>
        {why.map((w) => <p key={w} className="warn-line">{w}</p>)}
      </section>
    </article>
  );
}
