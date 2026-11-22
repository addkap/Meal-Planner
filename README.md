# Meal Planner

A weekly Mediterranean / Blue Zone meal planner, grocery list and nutrition tracker, built for one person to use on an iPhone. It is an installable web app (PWA), set up the same way as Lift Log: React + TypeScript + Vite, data saved on the phone first, a background copy in her OneDrive folder, and free hosting on GitHub Pages. There is no server and no account.

> **Status: phase 1 of 8.** The data model, the USDA food database and the 131-recipe library are done and tested. The app screens come in later phases. Right now the app shows a read-only preview of the recipe library.

| Phase | What | Status |
|---|---|---|
| 1 | Data model, food database, recipe library | done |
| 2 | Planner (weekly plan, diet rules, calorie and fiber targets) | |
| 3 | Meal plan screen and recipe pages | |
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

### Food database
- **Source:** USDA FoodData Central **SR Legacy** (April 2018), the free download that needs no API key. It is public domain. SR Legacy reports a full nutrient profile and household portions (cup, tbsp, slice, medium...) for nearly every food. **Foundation Foods** was downloaded too but is not used in v1: it covers only a few hundred foods, most of which SR Legacy already has.
- **Size:** **2,436 foods**, chosen to cover what people commonly eat, so off-plan foods can be logged by searching. That includes fruit, vegetables, dairy, breads, breakfast cereals, snacks, sweets, drinks, meat and fish, and prepared basics such as soups and fast food. Within each USDA food group the most generic foods are kept first (shortest names, like "Bananas, raw"). Baby food, regional specialty foods, and the many near-duplicates of beef cuts and grades are left out. Every food the recipes use is always kept.
- **File:** `public/data/foods.json` is **517 KB**, about **183 KB** as sent to the phone (compressed). It holds only the 32 nutrients the app shows. It is not part of the app's code: it loads on its own when first needed, and the offline service worker keeps a copy on the phone.
- **Rebuilding it:** download `FoodData_Central_sr_legacy_food_csv_2018-04.zip` from <https://fdc.nal.usda.gov/download-datasets>, unzip it **outside** this folder, then run `npm run foods -- /path/to/FoodData_Central_sr_legacy_food_csv_2018-04`. The download is never committed.
- **"Not listed" is never zero.** If a food has no value for a nutrient, it is stored as `null`. Totals remember that something was missing and show "at least X" or "not listed" (`src/lib/nutrition.ts`). This matters most for scanned packaged foods in phase 5.
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

### Barcode scanning (phase 5)
- **Open Food Facts only** (free, no key). USDA's branded-food data needs an API key, which cannot be hidden in a public static site, so it is left out.

---

## Project map
- `src/types.ts` the data model (every synced record has an `id` and `updatedAt`, like Lift Log)
- `src/lib/` rules and calculations: units, nutrition math, recipe math, food database (all unit tested)
- `src/data/foodKeys.ts` the USDA foods the recipes use
- `src/data/recipes/` the built-in recipe library
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
