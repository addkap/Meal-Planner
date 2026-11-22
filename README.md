# Meal Planner

A weekly Mediterranean / Blue Zone meal planner, grocery list and nutrition tracker, built for one person to use on an iPhone. It is an installable web app (PWA), set up the same way as Lift Log: React + TypeScript + Vite, data saved on the phone first, a background copy in her OneDrive folder, and free hosting on GitHub Pages. There is no server and no account.

> **Status: phase 3 of 8.** The data model, food database, recipe library, planner, Plan screen and recipe pages work. Groceries, Today and More are placeholders until their phases.

| Phase | What | Status |
|---|---|---|
| 1 | Data model, food database, recipe library | done |
| 2 | Planner (weekly plan, diet rules, calorie and fiber targets) | done |
| 3 | Meal plan screen and recipe pages | done |
| 4 | Grocery lists by store | |
| 5 | Daily log, nutrition summary, barcode scanning | |
| 6 | Batch cooking and her own recipes | |
| 7 | Weight tracker | |
| 8 | Settings, OneDrive sync, polish, install steps | |

---

## Run it on your computer

You need **Node.js 22.18 or newer** (check with `node -v`).

```bash
cd ~/Projects/Meal-Planner
npm install        # first time only
npm run dev        # test copy at http://localhost:5176
npm test           # runs the automatic tests
npm run build      # builds the real site into the "dist" folder
npm run preview    # serves the built site at http://localhost:4176
```

It uses ports **5176** and **4176**, so it can run at the same time as Lift Log (5173 and 4173).

---

## Decisions

These are the choices made so far, and why.

### Same setup as Lift Log
- **Stack:** React 19, TypeScript, Vite, `vite-plugin-pwa` (installable, works offline), Dexie (the on-phone database), MSAL (Microsoft sign-in), Recharts (charts), Vitest (tests). Same versions as Lift Log.
- **Deploy:** the same GitHub Actions workflow (`.github/workflows/deploy.yml`). It runs the tests, builds, and publishes to `https://addkap.github.io/Meal-Planner/` on every push to `main`.
- **Its own names everywhere.** This app shares the `addkap.github.io` website with Lift Log and Erika's Lift Log, and a browser shares storage across a whole website. So, like Erika's copy, every storage name is different, and every localStorage key (including the Microsoft sign-in cache) is stored with a `meal-planner:` prefix (`src/appIdentity.ts`, `src/installStorageNamespace.ts`). A test checks that no name matches either Lift Log app.
- **Its own Microsoft app registration**, like Erika's copy. The client ID goes in `src/config.ts` in phase 8. Until then sync shows as "not set up".
- **Repository:** `addkap/Meal-Planner`, public. Work is on the `meal-planner-build` branch until it has been reviewed.

### Look
- **Colors:** navy `#1B365D`, blue `#005A9C`, sky `#60C1E5` and pale sky `#A0E0EF`, on a very light blue-white background (`#F5FAFC`). Navy and blue are used for text and buttons; both are easy to read on the light background. Sky and pale sky are too light for text, so they are only used for stripes, fills and borders.
- Big readable text (19px body) and big tap targets (at least 48px). Headings use a serif font.

### Food database
- **Source:** USDA FoodData Central **SR Legacy** (April 2018), the free download that needs no API key. It is public domain. SR Legacy reports a full nutrient profile and household portions (cup, tbsp, slice, medium...) for nearly every food. **Foundation Foods** was downloaded too but is not used in v1: it covers only a few hundred foods, most of which SR Legacy already has.
- **Size:** **2,436 foods**, chosen to cover what people commonly eat, so off-plan foods can be logged by searching. That includes fruit, vegetables, dairy, breads, breakfast cereals, snacks, sweets, drinks, meat and fish, and prepared basics such as soups and fast food. Within each USDA food group the most generic foods are kept first (shortest names, like "Bananas, raw"). Baby food, regional specialty foods, and the many near-duplicates of beef cuts and grades are left out. Every food the recipes use is always kept.
- **File:** `public/data/foods.json` is **517 KB**, about **183 KB** as sent to the phone (compressed). It holds only the 32 nutrients the app shows. It is not part of the app's code: it loads on its own when first needed, and the offline service worker keeps a copy on the phone.
- **Rebuilding it:** download `FoodData_Central_sr_legacy_food_csv_2018-04.zip` from <https://fdc.nal.usda.gov/download-datasets>, unzip it **outside** this folder, then run `npm run foods -- /path/to/FoodData_Central_sr_legacy_food_csv_2018-04`. The download is never committed.
- **"Not listed" is never zero.** If a food has no value for a nutrient, it is stored as `null`. Totals remember that something was missing and show "at least X" or "not listed" (`src/lib/nutrition.ts`). This matters most for scanned packaged foods in phase 5.
- **Zeros known from what a food is.** USDA often leaves out a row instead of writing 0. The build fills in only zeros that follow from the food itself: no carbohydrate means no fiber or sugar (meat, fish, oil), and plant foods have no cholesterol, no vitamin B12, and no vitamin D (except mushrooms). Everything else that is missing stays "not listed".
- **Tiny amounts:** a USDA ingredient used at under 5 g in a recipe (a pinch of spice) does not mark the recipe's totals incomplete for nutrients it does not report. Scanned and typed-in foods always do.
- **Folate** is shown as DFE (dietary folate equivalents, what the DRIs use), with total folate as a fallback. **Vitamin A** is RAE. **Vitamin E** is alpha-tocopherol.

### Recipes
- **131 original recipes:** 25 breakfasts, 35 lunches, 51 dinners and 20 snacks, all with everyday US grocery-store ingredients. They live in `src/data/recipes/` and are written like recipe cards (`'1 1/2 cup chickpeas, rinsed'`).
- **Nutrition is computed from the ingredients** every time and never typed in, so scaling is always right.
- **Ingredients link to USDA foods through short names** (`src/data/foodKeys.ts`): `chickpeas` means USDA food 173801, "canned, drained, rinsed". Each also has a friendly name, a grocery section, and extra sizes USDA does not list (a 15-oz can of beans is 240 g drained, a bunch of parsley 60 g...).
- **The right form for accurate numbers:** meat and fish are weighed **raw**, rice, grains, pasta and lentils **dry**, and canned beans **drained**. A test checks this.
- **Effort tier comes from total time:** Easy is 25 minutes or less, Medium 26 to 50, Time-consuming over 50. Overnight soaking (overnight oats, chia pudding) does not count as time.
- **Diet tags are computed from the ingredients** (fish, poultry, red-meat, legume, vegetarian, whole-grain, vegetables...) so they cannot be wrong. Each recipe also has a hand-labeled **main protein** (salmon, chicken, lentils...) for the "no same protein on back-to-back dinners" rule, and a test checks it against the ingredients.
- **Grocery section is per ingredient,** not per recipe, because one recipe's ingredients come from several aisles.
- **Rules every built-in recipe passes (tested):** every ingredient can be weighed; calories per serving are realistic for the meal; red meat is at most about 3.5 oz raw per serving; olive oil is the main added fat; added sugar is at most 12 g per serving. Nearly every lunch and dinner has vegetables, and more than half have beans or legumes.
- **Mix for the planner:** dinners include 14 fish or seafood, 10 poultry, 5 red meat and 22 plant-based. They include 15 Easy, 18 Medium and 18 Time-consuming. Batch-friendly recipes exist for every meal, including the 12 egg bites example.

### Planner (`src/lib/planner.ts`, `src/lib/pool.ts`)
**How a week is built**
1. Meals she marked **Keep** and batch servings go in first and never change.
2. The week's protein quotas are drawn within her rules, minus whatever the fixed meals already use. The default rules are fish or seafood 2 to 3 times, poultry 1 to 2, and red meat at most once. Each quota goes to a specific dinner, or a lunch if no dinner fits. Every other meal is plant-based: beans, lentils, eggs, dairy, nuts. This makes the weekly counts exact rather than lucky.
3. Each day is filled by drawing recipes at random, in proportion to how much she likes them, and keeping the first combination that passes every rule and hits the targets. Her serving size is then tuned between 0.75x and 1.5x, in quarter steps, so the day lands within 5% of its calorie target and meets its fiber target.
4. The whole week is checked against every rule. If anything is off, it starts again from a different random point (up to 25 times) and keeps the best result.

**Rules it enforces (defaults, adjustable in Settings in phase 8)**
- Fish or seafood 2 to 3 times a week, poultry 1 to 2 times, red meat at most once. Red meat servings never go above 1x, so it stays a small portion (about 3.5 oz raw at most).
- Beans or legumes on at least 5 of 7 days.
- Vegetables in every lunch and dinner.
- At most 4 egg-based meals a week.
- At most 2 sweet snacks a week. Her recipes that break the sugar rule (desserts) count toward that, and at most 1 of them a week.
- Every recipe passes the sugar, olive-oil and red-meat limits.
- No recipe twice in a week, except batch servings, which are meant to repeat.
- Never the same main protein at dinner two days running, and preferably not at lunch and dinner on the same day.

**Effort**
- An **Easy** day gets only Easy recipes.
- On a **Medium** day, dinner can be Easy or Medium, and Medium is favored.
- On a **Time-consuming** day, dinner can be anything, and long recipes are favored.
- Breakfast, lunch and snacks are Easy or Medium, favoring Easy.
- Each day also has a cap on total hands-on cooking time: Easy 45 minutes, Medium 75, Time-consuming 120.
- Cooking a batch counts toward the cap on the day she cooks it. Eating batch servings later takes no cooking time.
- If her kept meals and batch cooking alone go over the cap, the other meals get the quickest recipes and the day shows a warning.

**Her preferences**
- "Use more" makes a recipe twice as likely, "Use less" half as likely, and "Don't use again" removes it.
- Her own recipes are 1.5x as likely.
- A favorite is 2.5x as likely, on top of any other boost.
- A recipe of hers that breaks a diet rule is not planned as a regular meal, and its page says why. A dessert can still show up as a snack about once a week.

**Changing a plan**
- **Swap** gives one meal a different recipe and tunes its serving size. The rest of the week stays as it is.
- **Regenerate a day** changes only that day.
- **Regenerate the week** keeps kept meals and batch servings and picks mostly new recipes.
- **Re-balancing around a batch** keeps kept meals and batch servings. Where the rules still allow, it keeps the recipes already planned, so the week changes as little as possible.

**Warnings**
- If a day cannot reach its calorie or fiber target, the day says so, with the numbers.
- If her batches or kept meals themselves break a rule (for example a batch that fills 4 fish meals), the plan shows that too, and the planner works around it.

**Tests (`src/lib/planner.test.ts`)**
- 100 random weeks without batches, with random effort, snack, people and calorie and fiber targets (1,400 to 2,000 kcal), plus some per-day overrides. Every rule holds in all of them, and fewer than 5% of days miss a target. When a day does miss, it says so.
- 100 random weeks with 1 or 2 batches and 2 kept meals. Kept meals and batch servings never move, and a batch's protein counts toward the weekly rules. The only rule problems allowed are ones the batch or locked meals cause themselves, and every one of those is shown as a warning.
- Swap, regenerate day and week, the feedback weights ("Use more" picked more than 1.3x as often, "Use less" under 0.8x, "Don't use again" never), and the nutrition review.

### Screens (phase 3)
- **Navigation:** five bottom tabs (Plan, Groceries, Today, Recipes, More), like Lift Log's tab bar. Recipe pages open on top with a big **‹ Back** button, because a Home Screen app on iPhone has no browser Back button.
- **Plan tab:** arrows move between weeks.
  - **Setting up a week:** for each day she picks Easy, Medium or Time-consuming, turns the snack on or off, and sets the number of people. The week's calorie and fiber targets are filled in from Settings, and either can be changed for a single day.
  - **Review:** **Make my plan** shows the week together with a nutrition review: each day's calories and fiber against target, a weekly average of every nutrient, and any nutrients that are consistently low or high. She taps **Use this plan** to finalize it.
  - **Changing it:** she can tap **Keep** on a meal or swap it, get new meals for a day or for the whole week, or change the setup. Kept meals stay.
  - **Swap** opens a menu under the meal:
    - **Pick one for me:** a random fit.
    - **Up to six suggestions** that keep every plan rule. Those near the day's calorie target and her favorites come first.
    - **Show all recipes** for that meal. A recipe that would break a rule says which one, and she can still choose it.
    - **Type in my own:** a name ("Dinner out"), with calories and fiber if she knows them. Nutrients she does not enter show as "not listed".
  - Anything she picks herself is kept automatically. The other meals that day then re-tune their serving sizes to get back near the calorie target.
  - **Keep** (a button on each meal; shows "✓ Kept") is for planning: new plans and re-balancing work around kept meals. It is not "I ate this". That is the Today tab's checkbox (phase 5). It was first called "Lock" and renamed so it is not mistaken for "done". In the code and data the field is still called `locked`.
- **Meal cards** show the meal, the recipe name, an effort badge, total time, calories for her portion, and her serving size when it is not 1.
- **Recipe page:**
  - Ingredients scale with a people stepper. Opened from the plan, the stepper changes that meal's number of people, which the grocery list will use.
  - Steps.
  - Full nutrition per serving, and for her portion when it is not 1.
  - Diet tags.
  - Use more / Use less / Don't use again and Favorite buttons. Tapping a chosen button again undoes it.
  - If the planner will not use the recipe, the reason is shown.
- **Recipes tab:** search, filter by meal, and favorites.
- **Nutrition display:** every nutrient shows an amount and a percent of her daily target.
  - **Targets** (`src/lib/dri.ts`): RDA or AI for her sex and age. Fat (35%), carbs (50%) and saturated fat (under 10%) scale with her calories. Sodium is a "stay under 2,300 mg" limit. Cholesterol has no limit, following the current Dietary Guidelines.
  - **Flags:** "Consistently low" means the weekly average is under 70% of target *and* most days are low. Nutrients with "not listed" data are never called low. "High" applies to saturated fat, sodium, and the few upper limits food can reach (iron, zinc, selenium, copper, manganese, calcium).
- **Kitchen-friendly amounts:** scaled counts round the way a cook would (8 eggs, not 7½), measures tidy up (3 tsp shows as 1 tbsp), and counted foods get plurals (3 oranges).
- **Snacks** are at most 320 calories, so two muffins stay a breakfast. The planner also avoids the same main protein twice in one day (an omelet breakfast and a frittata dinner).

### Barcode scanning (phase 5)
- **Open Food Facts only** (free, no key). USDA's branded-food data needs an API key, which cannot be hidden in a public static site, so it is left out.

---

## Project map
- `src/types.ts` the data model (every synced record has an `id` and `updatedAt`, like Lift Log)
- `src/lib/` rules and calculations: units, nutrition math, recipe math, food database, planner (all unit tested)
- `src/data/foodKeys.ts` the USDA foods the recipes use
- `src/data/recipes/` the built-in recipe library
- `src/db.ts`, `src/store.ts` the on-phone database and the actions that change it
- `src/AppData.tsx` shared data for the screens (foods, recipes, planner pool, settings)
- `src/pages/`, `src/components/` the screens
- `public/data/foods.json` the trimmed USDA database (generated by `scripts/build-foods.ts`)
- `scripts/make-icons.mjs` redraws the app icons (`node scripts/make-icons.mjs`)
- `.github/workflows/deploy.yml` the free deploy

## Privacy
All of her data (plans, logs, weights) stays on her phone and in her own OneDrive folder. The repository holds only code and the public USDA data. Nothing personal and no API keys are ever committed. The Microsoft client ID is not a secret.

## Possible future work (not in v1)
- Accounts or a backend
- AI-generated recipes
- Store price lookups
- Importing recipes from websites
- USDA branded-food barcode lookups (would need her own free API key, entered on the phone)
