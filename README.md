# Meal Planner

A weekly Mediterranean / Blue Zone meal planner, grocery list and nutrition tracker, built for one person to use on an iPhone. It is an installable web app (PWA), set up the same way as Lift Log: React + TypeScript + Vite, data saved on the phone first, a background copy in her OneDrive folder, and free hosting on GitHub Pages. There is no server and no account.

> **Status: all 8 phases built and tested.** Three things are left for you, in the steps below: register the app with Microsoft (for OneDrive), publish the site, and put it on your mom's iPhone.

| Phase | What | Status |
|---|---|---|
| 1 | Data model, food database, recipe library | done |
| 2 | Planner (weekly plan, diet rules, calorie and fiber targets) | done |
| 3 | Meal plan screen and recipe pages | done |
| 4 | Grocery lists by store | done |
| 5 | Daily log, nutrition summary, barcode scanning | done |
| 6 | Batch cooking and her own recipes | done |
| 7 | Weight tracker | done |
| 8 | Settings, OneDrive sync, polish, install steps | done |

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

## Setting it up for your mom

Do these in order. It is the same routine as Lift Log, with this app's own names.

### Step 1: Register the app with Microsoft (once, about 10 minutes)
This app gets **its own** Microsoft app registration, like Erika's copy, so its sign-in never mixes with the Lift Log apps. A test checks that it is not one of their IDs.

1. Go to <https://entra.microsoft.com> and sign in with the same personal Microsoft account you used for the Lift Log registrations.
2. **Entra ID** → **App registrations** → **New registration**.
3. Fill in:
   - **Name:** `Meal Planner`
   - **Supported account types:** **Personal Microsoft accounts only**
   - **Redirect URI:** platform **Single-page application (SPA)**, value `https://addkap.github.io/Meal-Planner/`
4. Click **Register**, then copy the **Application (client) ID** from the Overview page.
5. Left menu → **Authentication** → under **Single-page application** → **Add URI**. Add these two only if you want to test sign-in on your computer:
   - `http://localhost:5176/`
   - `http://localhost:4176/`

   Then **Save**. Every address must match exactly: `https`, the capital M and P in `Meal-Planner`, and the final `/`.
6. Left menu → **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions** → tick **`Files.ReadWrite`** → **Add permissions**.
7. Open `src/config.ts` and paste the ID between the quotes: `export const MS_CLIENT_ID: string = 'paste-it-here';`. It is not a secret, so it is fine in the public repository.
8. Run `npm test`, then commit and push.

Until you do this, the app works normally and Settings says sync is not set up yet.

### Step 2: Publish the site (GitHub Pages)
The repository is `addkap/Meal-Planner`. The work is on the `meal-planner-build` branch. The site is published from `main`.

1. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. In a terminal:

   ```bash
   cd ~/Projects/Meal-Planner
   git status                      # should say "nothing to commit"
   git checkout main
   git merge meal-planner-build
   git push -u origin main
   ```

3. Open the repository's **Actions** tab. When **Deploy to GitHub Pages** has a green tick (about a minute), the site is live at **`https://addkap.github.io/Meal-Planner/`**. The workflow runs all the tests first, so a broken change is never published.
4. Optional: in **Settings → General**, make `main` the default branch and delete `meal-planner-build`.

**Updating later:** change things on `main`, then `git add -A`, `git commit -m "what changed"`, `git push`. Her phone picks up the new version the next time she opens the app (close it fully and reopen once or twice).

### Step 3: Put it on your mom's iPhone
1. On her iPhone, open **Safari** (not another browser) and go to `https://addkap.github.io/Meal-Planner/`.
2. Tap **Share** (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen** (tap **View More** first if it is not there).
4. Keep the name **Meals** and tap **Add**.
5. Close Safari. From now on she opens **Meals** from the new Home Screen icon. It opens full-screen.

Why this matters (the same as Lift Log):
- iOS can delete the saved data of websites that go unused for a while. Home Screen apps are exempt. Settings → **Phone storage** says "Protected" once the phone agrees.
- The Home Screen app has its own storage, separate from Safari. Do everything, including the OneDrive sign-in, **inside the Home Screen app**.

### Step 4: Connect her OneDrive folder
Her OneDrive owns the folder, so it is in her **My files**.

1. In OneDrive on her phone or at <https://onedrive.live.com>, make a folder for the app, for example **Meal Planner**. The app only ever touches one file in it, `meal-planner-data.json`.
2. In the Home Screen app: **More → Settings → OneDrive sync → Sign in with Microsoft**. She signs in with her own Microsoft account and approves the permission screen. It asks for OneDrive access because Microsoft has no narrower permission; the app's code only touches its one file.
3. Back in Settings: **Choose the data folder** → tap **Use this folder** next to "Meal Planner" (tap **Open** to look inside other folders). The app creates `meal-planner-data.json` there and syncs.
4. The bar under the header says **Synced**, **Not synced yet** (tap it to sync), or **Tap to sync**. "Tap to sync" means the roughly 24-hour Microsoft sign-in expired; one tap signs in again and nothing is lost.

**If you want to see or help with her data:** she shares the folder with your Microsoft account (OneDrive → Share → your email → **Can edit**) and sends you the link. On your phone: Settings → Sign in with Microsoft → Choose the data folder → paste the link under **A folder shared with me**. Edits from either phone merge; the newest change wins.

**Backups:** Settings → **Export backup** saves everything to one file. **Import backup** merges a file back in and never wipes what is on the phone. Lift Log files are refused on purpose.

### Step 5: Quick checks on her phone
1. **Offline:** open the app once with internet, turn on Airplane Mode, and reopen it. Plans, recipes, groceries and logging all work. Search uses the saved food list.
2. **Barcode camera** (not tested yet: my test browser blocks cameras):
   - On Today, tap **Log something else → Scan barcode**. Allow the camera when asked, and point it at a packaged food. Its name and nutrition should appear.
   - If iOS blocked the camera: iPhone **Settings → Safari → Camera → Allow**.
   - Typing the barcode number always works.
3. **Sync:** after Step 4, log something, wait a few seconds, and check that the bar says **Synced**.

### Troubleshooting
- **"Redirect URI mismatch" when signing in:** the address in the address bar must be listed exactly in Step 1.5, including `https`, `Meal-Planner` with capitals, and the final `/`.
- **"Does not exist in tenant 'Microsoft Services'":** the registration must allow personal Microsoft accounts (Step 1.3).
- **Blank page on GitHub Pages:** check the Actions tab for a red run. The address must end in `/Meal-Planner/`, which follows the repository name.
- **The phone shows an old version:** close the app completely and open it again.
- **Running it next to Lift Log on your computer:** this app uses ports 5176 and 4176, so both can run at once.

## Decisions

These are the choices made so far, and why.

### Same setup as Lift Log
- **Stack:** React 19, TypeScript, Vite, `vite-plugin-pwa` (installable, works offline), Dexie (the on-phone database), MSAL (Microsoft sign-in), Recharts (charts), Vitest (tests). Same versions as Lift Log.
- **Deploy:** the same GitHub Actions workflow (`.github/workflows/deploy.yml`). It runs the tests, builds, and publishes to `https://addkap.github.io/Meal-Planner/` on every push to `main`.
- **Its own names everywhere.** This app shares the `addkap.github.io` website with Lift Log and Erika's Lift Log, and a browser shares storage across a whole website. So, like Erika's copy, every storage name is different, and every localStorage key (including the Microsoft sign-in cache) is stored with a `meal-planner:` prefix (`src/appIdentity.ts`, `src/installStorageNamespace.ts`). A test checks that no name matches either Lift Log app.
- **Its own Microsoft app registration**, like Erika's copy (Step 1 above). Until its client ID is in `src/config.ts`, sync shows as "not set up" and everything else works.
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

### Grocery lists (phase 4, `src/lib/grocery.ts`)
**What goes on the list**
- Every ingredient of every planned recipe, scaled to the number of people at that meal. Her own portion size does not change the list.
- Not batch servings, meals she typed in, or tap water.
- A batch she plans to cook this week and has not cooked yet adds its whole recipe, scaled to the batch size. A cooked batch adds nothing.

**Adding up**
- Amounts of the same food are added together. Volumes add as volumes (¼ cup + 2 tbsp = 6 tbsp) and weights as weights.
- Mixed kinds (1 medium onion + ½ cup chopped onion) are added by weight using the food's own USDA portion sizes.
- If an amount cannot be weighed, its parts are listed side by side ("1 cup + 2 handfuls") rather than guessed.

**Amounts you can buy**
- Totals are rounded up to what the store sells: whole onions and lemons, cans, bunches, bags, heads of garlic, loaves, tubs of yogurt, half-gallons of milk, and a dozen eggs. The exact amount the recipes need is shown underneath ("Recipes need 1½ cans").
- A hair over a whole can is not rounded up to another can.
- Lemon and lime juice and zest become whole lemons and limes (about 3 tbsp of juice or 1 tbsp of zest per lemon, 2 tbsp of juice per lime).
- Meat and fish are listed by weight (ounces, or pounds from 1 lb).
- The sizes used are standard US ones, in `src/data/foodKeys.ts`. For example, a 15-oz can of beans is 240 g drained, a bunch of parsley is 60 g, and a bag of spinach is 5 oz.

**Stores**
- She adds, renames and removes stores at the bottom of the Groceries tab. Settings in phase 8 will link to the same place.
- A new item first appears under **Where do you buy these?** One tap on a store (or **Any store**) is remembered for every later week. **Put all at…** sorts a whole batch of new items at once.
- From an item's row she can move it with **Always buy it there** or **Just this week**.
- Removing a store sends its items back to be sorted.

**The list**
- **One list per store**, grouped by aisle in store order.
- **Buy at any store** is a clearly marked box shown on every store's list.
- **Everything** shows all the stores at once.
- **Checking off:** a check mark is one record per week and item, so checking it on one list checks it everywhere. Check marks are saved on the phone, so they stay put while she shops and if the app is closed.
- **I already have this** takes an item off this week's list. It shows under "Already have" with **Put back**.
- Tapping an item shows which meals need it.
- **Copy … as text** copies the store's remaining items, plus the any-store items, grouped by aisle, ready to paste into a message or note.

### Today: daily log and nutrition (phase 5, `src/lib/log.ts`)
**Logging meals**
- Each planned meal has a big **I ate this** checkbox. Checking it logs the amount the plan gave her (for example 1¼ servings, which is what her calories were planned on). She can change it to **Half**, **1**, the planned amount, **1½**, or **Other** (any number). Un-checking removes it.
- A planned batch serving is logged as a batch serving. A meal she typed into the plan is logged with the calories she entered.
- **Log something else** (per meal):
  - **Search:** her own and scanned foods come first, then the 2,437 USDA foods, then recipes (one serving). Every word must match, and plurals match singulars.
  - **Amount:** any number with a household unit (medium, slice, cup, tbsp, oz, g, the label's serving...), showing the grams and the full nutrition before she adds it, and which meal it goes under. Plain foods start at a natural size (1 medium banana); packaged foods start at their label serving.
- Logged items can be edited (tap) or removed.

**The day's totals**
- Calories and fiber against the day's targets, with progress bars.
- Protein, carbs and fat in grams and as a share of calories.
- Each meal's calories and macros.
- Full nutrition for the day, as amounts and % of her targets.
- **Targets:** a one-day override she sets on Today, else the plan's targets for that day, else Settings.
- **Partial data:** if any food eaten that day does not list a nutrient, the day shows a "Partial data" note naming them, and those totals show as "≥" (at least).
- The arrows go back to past days, which can be viewed and edited. The forward arrow stops at today.

### Barcode scanning (phase 5, `src/lib/openFoodFacts.ts`, `src/components/BarcodeScanner.tsx`)
**Reading the barcode**
- **Scan barcode** opens the back camera and reads EAN-13, EAN-8, UPC-A and UPC-E barcodes with the ZXing library (`@zxing/browser`).
- ZXing is bundled into the app, not loaded from a CDN, because Safari on iPhone has no built-in barcode reader. It loads only when the scanner opens, and the offline cache keeps it on the phone. The camera needs https, which GitHub Pages provides.
- **Not tested on a real camera yet:** the browser I tested in blocks cameras. The "camera not available" fallback was tested; real scanning needs a quick check on her iPhone (see phase 8 steps).

**Looking it up**
- **Open Food Facts only** (free, no key). USDA's branded-food data needs an API key, which cannot be hidden in a public static site, so it is left out. Only the barcode or the search words are sent.
- She sees the product name, its label serving, and every nutrient, then picks the amount (servings, grams, ounces) and the meal.
- **Missing nutrients are never zero.** Open Food Facts gives per-100-g values in grams, converted to mg and µg. Anything a product does not list is stored as "not listed". The app says how many of the 32 nutrients the product lists, and days that include it are marked partial.
- **Saved on the phone:** every scanned product is saved, so the next scan of the same barcode needs no internet. **Fix or complete this food's nutrition** opens the label form filled in, and her corrections are saved.

**When it doesn't work**
- If a barcode is not found, or the phone is offline, she can enter nutrition from the label, search packaged foods by name (Open Food Facts), or search the food list.
- If the camera is blocked or missing, she can type the barcode number instead.
- Whatever she chooses is saved with that barcode, so the next scan finds it.

**Typing in a label**
- Name, brand, the serving size as printed, and the serving size in grams (or mL for drinks).
- Then each nutrient **per serving, as printed**. A blank box means "not listed". Values are stored per 100 g like every other food.

Scanned and typed-in foods can also be used as ingredients in her own recipes (phase 6).

### Batch cooking (phase 6, `src/lib/batch.ts`)
**"I made a batch"** (on the Plan tab and under More, then Your batches)
1. **What she made:** a recipe from the library or hers (batch-friendly ones first), or **type in the recipe** from scratch. A typed-in recipe can also be saved to My recipes, or kept just for this batch.
2. **The batch:** how many servings she made, the day she cooked it (or will cook it), and how many servings to freeze.
3. **Which meals it covers:** only meals the recipe suits (egg bites: breakfast or snack), from the cooking day on, never meals she is keeping, and snacks only on snack days.
   - The app starts with up to four of its own meal type. **Fill any that fit** spreads the servings over the week, one per day before doubling up.
   - She can tap meals on and off. It warns if she picks more meals than she has servings.

**Re-planning around it**
- The batch servings take over those meals. The rest of the week is re-balanced (`rebalanceWeek`): kept meals stay, other recipes are kept where the rules still allow, and calories, fiber and the diet rules are re-checked.
- The batch counts toward the week's rules: fish, poultry and red meat, eggs, and beans or legumes.
- If the batch itself breaks a rule (10 egg-bite meals is more than the 4 egg meals the plan allows), the plan says so and adds no other egg dishes.

**Servings left** ("7 of 8 left · 1 in the freezer · 2 planned")
- Counted from the daily log, never stored separately: eating a batch meal, or logging a batch serving from the food logger, uses it up. Half a serving uses half, and un-checking gives it back.
- She is warned when more meals are planned than servings are left (with a nudge to take some out of the freezer) and when only one serving is left.
- **Leftovers** stay available after the week. The Plan tab shows "You have N unplanned servings… Use them this week" for any later week.
- **Your batches** has: put servings in this week's plan, take one out of or put one in the freezer, "I cooked it" (for a batch planned ahead), "It's all gone", and "Save this as a recipe" for a typed-in one.

**Everything else counts it too**
- **Groceries:** a batch not cooked yet adds its whole recipe, scaled to the batch size. A cooked one adds nothing.
- **Nutrition:** each batch serving uses the recipe's per-serving numbers.
- **Cooking day:** cooking it counts as cooking on that day (hands-on time). Eating it later takes none.
- **Food logger:** cooked batches with servings left appear at the top.

**Check-offs follow the exact meal:** if the plan changes after she checked a meal off, what she ate stays logged and the new meal starts unchecked.

### Her own recipes (phase 6, `src/lib/myRecipes.ts`)
**Adding one** (Recipes, then + Add a recipe)
- Name, meal type, other meals it suits, servings, and hands-on and total minutes.
- **Effort:** worked out from the total time unless she picks one.
- **Ingredients:** from the food list with an amount and unit, including her scanned and typed-in foods. The search shows the everyday names the built-in recipes use first ("Extra-virgin olive oil"), and phrases count ("olive oil").
- **Steps:** one per line.
- **Main protein:** suggested from the biggest protein ingredient (meat and fish beat a sprinkle of cheese). She can change it.
- **Tags:** diet tags are worked out from the ingredients. She can add "Good for batch cooking", "Make ahead", "Freezes well", "No cooking" and "Treat".
- **Nutrition per serving** is shown as she types.
- If the recipe breaks a diet rule, she sees why before saving, for example a butter-based fat.

**How they are used**
- Treated exactly like built-in recipes: nutrition from the ingredients, scaling, grocery list, the "Use more / Use less / Don't use again" buttons, and favorites.
- **In the planner:** 1.5x as likely to be picked, 2.5x more as a favorite. A recipe that breaks the rules is not planned as a regular meal, and its page says why. A dessert can still come up as an occasional snack.
- **My recipes** has its own filter. She can edit or delete each one.
- **Deleting:** a deleted recipe is no longer listed or planned, but meals already planned or eaten keep their nutrition.
- Units now include pounds (lb) for meat.

### Weight tracker (phase 7, `src/lib/weight.ts`, More, then Weight)
**Logging**
- She logs a weigh-in with a date, weight and optional note, and can edit or delete any entry.
- **lb or kg** toggle. Weights are stored in kg and shown in her unit with one decimal, like a scale.
- If she logs two weigh-ins on the same day, the later one counts.

**Summary**
- The **7-day average** (the mean of every weigh-in in the 7 days ending that day), which smooths out day-to-day water-weight swings.
- The change over the last 30 days and since her first weigh-in, in words ("3.0 lb down").
- An optional **goal weight** with "x lb to go".

**Chart** (Recharts)
- Weigh-ins are sky-blue dots and the 7-day average is a blue line. There is a dashed goal line when she has a goal.
- Ranges: 1 month, 3 months, 1 year, or all.
- Tapping shows a tooltip.
- The colors were checked with the dataviz palette validator: they pass the colorblind and normal-vision separation checks. The sky dots are faint on white, so there is a legend, and every weigh-in is also listed under the chart.

### Settings, sync and backup (phase 8)
**Settings** (More → Settings)
- Daily calorie and fiber targets.
- Sex and age range, for the vitamin and mineral targets.
- Default number of people.
- Diet rules: fish and poultry at least / at most, red meat at most, days with legumes, and egg meals. There is a button to go back to the Mediterranean defaults.
- Stores: the same editor as on the Groceries tab.
- **Recipe feedback review:** every "Use more / Use less / Don't use again" and favorite, each undoable with one tap.
- Weight unit, OneDrive sync, backup, and whether phone storage is protected.

**OneDrive sync** (`src/sync/`)
- Lift Log's sync code, reused (MSAL redirect sign-in for personal accounts, Microsoft Graph, one JSON file in the chosen folder, newest-change-wins merge with deletions remembered, an eTag check so two phones saving at once never overwrite each other, background sync after changes, on reopen and when the signal returns).
- The merge now covers all 12 kinds of records this app keeps, including settings, plans, recipes, foods, batches, logs, stores, grocery check-offs and weigh-ins. Device-only things (which folder) are never uploaded.
- The file is `meal-planner-data.json`, tagged so neither app can read the other's file.
- A phone with no data pulls everything first. The sync bar sits under the header.
- **Tests:** two phones saving at the same moment, deletions not coming back, an expired sign-in losing nothing, giving up safely after repeated conflicts, every table merging, and refusing Lift Log files.

**Backup:** export and import of the same JSON format. Importing merges and never wipes. The message names what was saved or restored ("It has 3 weekly plans, 42 logged meals and foods and 1 weigh-in.").

### Forms
- **Never blocked silently:** number boxes accept decimals (1.4 mg of iron), and no form is held back by the browser's built-in checks without saying why. The app shows its own message instead.

---

## Project map
- `src/types.ts` the data model (every synced record has an `id` and `updatedAt`, like Lift Log)
- `src/lib/` rules and calculations: units, nutrition math, recipe math, food database, planner (all unit tested)
- `src/data/foodKeys.ts` the USDA foods the recipes use
- `src/data/recipes/` the built-in recipe library
- `src/db.ts`, `src/store.ts` the on-phone database and the actions that change it
- `src/AppData.tsx` shared data for the screens (foods, recipes, planner pool, settings)
- `src/sync/` OneDrive: sign-in (`auth.ts`), Graph calls (`graph.ts`), merge rules (`merge.ts`), sync engine (`engine.ts`), the same design as Lift Log
- `src/config.ts` the Microsoft client ID goes here
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
