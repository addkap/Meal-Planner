// Built-in snacks. Original, simple, mostly whole foods.
import { cards } from './define';

export const SNACKS = cards('snack', [
  {
    name: 'Apple with Almond Butter',
    serves: 1, active: 2, total: 2, protein: 'nuts', tags: ['no-cook'],
    ing: ['1 medium apple, sliced', '1 tbsp almond_butter', '1 pinch cinnamon'],
    steps: ['Slice the apple and serve with almond butter, dusted with cinnamon.'],
  },
  {
    name: 'Hummus with Carrots and Cucumber',
    serves: 1, active: 5, total: 5, protein: 'chickpeas', tags: ['no-cook'],
    ing: ['1/4 cup hummus', '1 carrot, sticks', '1/2 cucumber, sliced', '1/2 red_pepper, strips'],
    steps: ['Cut the vegetables into sticks and serve with hummus.'],
  },
  {
    name: 'Greek Yogurt with Honey and Walnuts',
    serves: 1, active: 2, total: 2, protein: 'yogurt', tags: ['no-cook'],
    ing: ['3/4 cup greek_yogurt', '1 tsp honey', '1 tbsp walnuts, chopped', '1/4 cup raspberries'],
    steps: ['Top the yogurt with walnuts, raspberries and a drizzle of honey.'],
  },
  {
    name: 'Almonds and an Orange',
    serves: 1, active: 1, total: 1, protein: 'nuts', tags: ['no-cook'],
    ing: ['1 oz almonds', '1 orange'],
    steps: ['Peel the orange and enjoy with a small handful (about 23) of almonds.'],
  },
  {
    name: 'Crispy Roasted Chickpeas',
    serves: 4, active: 5, total: 35, protein: 'chickpeas', tags: ['batch-friendly'],
    ing: ['2 can chickpeas, rinsed and dried', '1 tbsp olive_oil', '1 tsp paprika', '1/2 tsp cumin', '1/4 tsp garlic_powder', '1/4 tsp salt'],
    steps: ['Heat the oven to 425°F. Pat the chickpeas very dry.', 'Toss with oil and spices and roast 25 to 30 minutes, shaking the pan halfway, until crunchy.', 'Cool completely. Store loosely covered up to 4 days.'],
  },
  {
    name: 'Cottage Cheese with Tomatoes and Cucumber',
    serves: 1, active: 5, total: 5, protein: 'cheese', tags: ['no-cook'],
    ing: ['1/2 cup cottage_cheese', '1/2 cup cherry_tomatoes, halved', '1/2 cucumber, diced', '1 pinch black_pepper', '1 tsp olive_oil'],
    steps: ['Top the cottage cheese with tomatoes and cucumber, a drizzle of olive oil and black pepper.'],
  },
  {
    name: 'Pear with Pistachios',
    serves: 1, active: 2, total: 2, protein: 'nuts', tags: ['no-cook'],
    ing: ['1 pear', '2 tbsp pistachios'],
    steps: ['Slice the pear and enjoy with the pistachios.'],
  },
  {
    name: 'Dark Chocolate and Strawberries',
    serves: 1, active: 2, total: 2, protein: 'none', tags: ['no-cook', 'treat'],
    ing: ['1/2 oz dark_chocolate', '1 cup strawberries', '1 tbsp almonds'],
    steps: ['Enjoy a square or two of dark chocolate with fresh strawberries and a few almonds.'],
  },
  {
    name: 'Whole-Wheat Crackers with Goat Cheese and Grapes',
    serves: 1, active: 3, total: 3, protein: 'cheese', tags: ['no-cook'],
    ing: ['6 ww_crackers', '1 oz goat_cheese', '1/2 cup grapes'],
    steps: ['Spread the goat cheese on the crackers and serve with grapes.'],
  },
  {
    name: 'Warm Edamame with Sea Salt',
    serves: 1, active: 3, total: 8, protein: 'edamame',
    ing: ['1 cup edamame', '1 pinch salt', '1 tsp lemon_juice'],
    steps: ['Boil or microwave the edamame 4 to 5 minutes. Toss with salt and a squeeze of lemon.'],
  },
  {
    name: 'Date, Oat and Almond Butter Energy Bites',
    serves: 8, active: 15, total: 15, protein: 'nuts', tags: ['batch-friendly', 'make-ahead', 'no-cook'],
    about: 'Makes 16 bites; a serving is 2. Keeps a week in the fridge.',
    ing: ['1 cup oats', '8 dates, pitted', '1/3 cup almond_butter', '2 tbsp chia', '2 tbsp flax', '2 tbsp cocoa', '1 tsp vanilla', '2 tbsp water'],
    steps: ['Pulse the dates in a food processor until a paste forms.', 'Add everything else and pulse until it holds together, adding water a little at a time.', 'Roll into 16 balls and chill.'],
  },
  {
    name: 'Mini Yogurt Parfait with Berries and Hemp',
    serves: 1, active: 3, total: 3, protein: 'yogurt', tags: ['no-cook'],
    ing: ['1/2 cup greek_yogurt', '1/2 cup blueberries', '1 tbsp hemp', '2 tbsp oats'],
    steps: ['Layer the yogurt, berries, oats and hemp hearts in a glass.'],
  },
  {
    name: 'Olive Oil Popcorn with Parmesan',
    serves: 2, active: 5, total: 5, protein: 'none',
    ing: ['6 cup popcorn', '1 tbsp olive_oil', '2 tbsp parmesan', '1/4 tsp garlic_powder'],
    steps: ['Toss freshly air-popped popcorn with the olive oil, then the Parmesan and garlic powder.'],
  },
  {
    name: 'Tzatziki with Veggie Sticks',
    serves: 2, active: 10, total: 10, protein: 'yogurt', tags: ['no-cook'],
    ing: ['1 cup greek_yogurt', '1/2 cucumber, grated', '1 clove garlic, grated', '1 tbsp dill, chopped', '1 tsp lemon_juice', '2 carrot, sticks', '1 red_pepper, strips', '2 celery, sticks'],
    steps: ['Squeeze the grated cucumber dry and stir into the yogurt with garlic, dill and lemon.', 'Serve with the vegetable sticks.'],
  },
  {
    name: 'Hard-Boiled Eggs with Cherry Tomatoes',
    serves: 1, active: 2, total: 12, protein: 'eggs',
    ing: ['2 large egg', '1 cup cherry_tomatoes', '1 pinch black_pepper', '1 pinch salt'],
    steps: ['Boil the eggs 10 minutes, cool in cold water and peel (or make several at once for the week).', 'Serve with tomatoes, salt and pepper.'],
  },
  {
    name: 'Lemony White Bean Dip with Pita',
    serves: 4, active: 10, total: 10, protein: 'white-beans', tags: ['no-cook', 'make-ahead'],
    ing: ['1 can white_beans, rinsed', '2 tbsp olive_oil', '2 tbsp lemon_juice', '1 clove garlic', '1 tbsp parsley, chopped', '1/4 tsp cumin', '2 ww_pita, wedges', '2 carrot, sticks'],
    steps: ['Blend the beans, oil, lemon, garlic and cumin until smooth, adding a splash of water if needed.', 'Top with parsley and serve with pita wedges and carrots.'],
  },
  {
    name: 'Banana with Peanut Butter',
    serves: 1, active: 2, total: 2, protein: 'nuts', tags: ['no-cook'],
    ing: ['1 medium banana', '1 tbsp peanut_butter'],
    steps: ['Slice the banana and serve with peanut butter.'],
  },
  {
    name: 'Walnut-Stuffed Dates',
    serves: 1, active: 3, total: 3, protein: 'nuts', tags: ['no-cook', 'treat'],
    ing: ['2 dates, pitted', '1/2 oz walnuts, halves', '1/2 cup cherries'],
    steps: ['Tuck walnut halves into the pitted dates. Serve with cherries (or another fruit).'],
  },
  {
    name: 'Tuna Cucumber Bites',
    serves: 2, active: 10, total: 10, protein: 'tuna', tags: ['no-cook'],
    ing: ['1 can tuna', '2 tbsp greek_yogurt', '1 tsp mustard', '1 tbsp dill, chopped', '1 cucumber, thick slices', '8 ww_crackers'],
    steps: ['Mix the tuna, yogurt, mustard and dill.', 'Spoon onto cucumber rounds and crackers.'],
  },
  {
    name: 'Baked Cinnamon Apples with Walnuts',
    serves: 2, active: 10, total: 35, protein: 'nuts', tags: ['treat'],
    ing: ['2 medium apple, cored', '2 tbsp walnuts, chopped', '2 tbsp oats', '1 tsp maple_syrup', '1 tsp cinnamon', '1/4 cup greek_yogurt'],
    steps: ['Heat the oven to 375°F. Mix the walnuts, oats, cinnamon and maple syrup.', 'Fill the cored apples, set in a dish with a little water and bake 25 minutes.', 'Serve warm with a spoon of yogurt.'],
  },
]);
