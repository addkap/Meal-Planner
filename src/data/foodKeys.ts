// Short, readable names for the USDA foods the built-in recipes use.
// Recipes say "chickpeas" instead of "USDA food 173801", and this table links the two.
//
// Each entry: USDA FoodData Central id (SR Legacy), a friendly name, a grocery category, and
// optional extra household portions (unit -> grams for ONE unit) for sizes USDA does not list,
// such as a standard 15-oz can of beans. The build script (scripts/build-foods.ts) always keeps these
// foods and merges in the extra portions.
//
// Form matters for accuracy: meat and fish are weighed RAW, grains and lentils DRY, canned beans DRAINED.

import type { GroceryCategory } from '../lib/categories';

export interface FoodKey {
  id: number;
  name: string;
  cat: GroceryCategory;
  portions?: Record<string, number>;
  /** Never put on the grocery list (tap water). */
  noGrocery?: boolean;
}

const k = (id: number, name: string, cat: GroceryCategory, portions?: Record<string, number>): FoodKey => ({ id, name, cat, portions });

export const FOOD_KEYS = {
  // ---------------------------------------------------------------- vegetables
  spinach: k(168462, 'Spinach, fresh', 'produce', { bag: 142 }),
  kale: k(168421, 'Kale, fresh', 'produce', { bunch: 200 }),
  arugula: k(169387, 'Arugula', 'produce'),
  romaine: k(169247, 'Romaine lettuce', 'produce', { head: 626 }),
  greens: k(169249, 'Mixed salad greens', 'produce'),
  cabbage: k(169975, 'Green cabbage', 'produce'),
  red_cabbage: k(169977, 'Red cabbage', 'produce'),
  broccoli: k(170379, 'Broccoli, fresh', 'produce', { head: 450 }),
  cauliflower: k(169986, 'Cauliflower', 'produce'),
  zucchini: k(169291, 'Zucchini', 'produce'),
  eggplant: k(169228, 'Eggplant', 'produce'),
  red_pepper: k(170108, 'Red bell pepper', 'produce'),
  green_pepper: k(170427, 'Green bell pepper', 'produce'),
  onion: k(170000, 'Onion', 'produce'),
  red_onion: k(170000, 'Red onion', 'produce'),
  shallot: k(170499, 'Shallot', 'produce', { medium: 30 }),
  garlic: k(169230, 'Garlic', 'produce'),
  carrot: k(170393, 'Carrots', 'produce'),
  celery: k(169988, 'Celery', 'produce', { each: 40, stalk: 40 }),
  cucumber: k(168409, 'Cucumber', 'produce', { each: 250 }),
  tomato: k(170457, 'Tomatoes', 'produce'),
  cherry_tomatoes: k(170457, 'Cherry tomatoes', 'produce', { pint: 300 }),
  sweet_potato: k(168482, 'Sweet potato', 'produce', { medium: 130, large: 180 }),
  potato: k(170029, 'Red potatoes', 'produce', { medium: 170, small: 120, large: 280 }),
  butternut: k(169295, 'Butternut squash', 'produce', { each: 850 }),
  mushrooms: k(169251, 'Mushrooms, white or cremini', 'produce', { package: 227 }),
  portobello: k(169255, 'Portobello mushrooms', 'produce', { cap: 85 }),
  asparagus: k(168389, 'Asparagus', 'produce', { bunch: 450 }),
  green_beans: k(169961, 'Green beans', 'produce'),
  fennel: k(169385, 'Fennel bulb', 'produce'),
  beets: k(169145, 'Beets', 'produce', { each: 110 }),
  radish: k(169276, 'Radishes', 'produce'),
  scallion: k(170005, 'Green onions', 'produce'),
  parsley: k(170416, 'Fresh parsley', 'produce', { bunch: 60 }),
  cilantro: k(169997, 'Fresh cilantro', 'produce', { bunch: 50 }),
  basil: k(172232, 'Fresh basil', 'produce'),
  dill: k(172233, 'Fresh dill', 'produce'),
  mint: k(173475, 'Fresh mint', 'produce'),
  ginger: k(169231, 'Fresh ginger', 'produce'),
  avocado: k(171705, 'Avocado', 'produce'),
  lemon: k(167746, 'Lemon', 'produce'),
  lemon_juice: k(167747, 'Lemon juice', 'produce'),
  lemon_zest: k(167749, 'Lemon zest', 'produce'),
  lime_juice: k(168156, 'Lime juice', 'produce'),
  chard: k(169991, 'Swiss chard', 'produce', { bunch: 300 }),
  leek: k(169246, 'Leek', 'produce'),
  brussels: k(170383, 'Brussels sprouts', 'produce'),
  jalapeno: k(168576, 'Jalapeño', 'produce'),
  russet: k(170027, 'Russet potato', 'produce'),

  // ---------------------------------------------------------------- fruit
  apple: k(171688, 'Apple', 'produce'),
  banana: k(173944, 'Banana', 'produce'),
  blueberries: k(171711, 'Blueberries', 'produce', { pint: 290 }),
  strawberries: k(167762, 'Strawberries', 'produce'),
  raspberries: k(167755, 'Raspberries', 'produce'),
  orange: k(169097, 'Orange', 'produce'),
  pear: k(169118, 'Pear', 'produce'),
  grapes: k(174683, 'Grapes', 'produce'),
  peach: k(169928, 'Peach', 'produce'),
  dates: k(168191, 'Medjool dates', 'produce'),
  dried_apricots: k(173941, 'Dried apricots', 'nuts-dried-fruit'),
  raisins: k(168165, 'Raisins', 'nuts-dried-fruit'),
  dried_figs: k(174665, 'Dried figs', 'nuts-dried-fruit'),
  pomegranate: k(169134, 'Pomegranate', 'produce'),
  cherries: k(171719, 'Cherries', 'produce'),
  kiwi: k(168153, 'Kiwi', 'produce'),
  mango: k(169910, 'Mango', 'produce'),
  pineapple: k(169124, 'Pineapple', 'produce'),
  clementine: k(168195, 'Clementine', 'produce'),
  cantaloupe: k(169092, 'Cantaloupe', 'produce'),

  // ---------------------------------------------------------------- grains and bread (dry weights)
  oats: k(173904, 'Rolled oats', 'grains-pasta'),
  quinoa: k(168874, 'Quinoa, dry', 'grains-pasta'),
  brown_rice: k(169703, 'Brown rice, dry', 'grains-pasta'),
  barley: k(170284, 'Pearled barley, dry', 'grains-pasta'),
  bulgur: k(170688, 'Bulgur, dry', 'grains-pasta'),
  ww_pasta: k(169738, 'Whole-wheat pasta, dry', 'grains-pasta', { box: 454 }),
  pasta: k(169736, 'Pasta, dry', 'grains-pasta', { box: 454 }),
  couscous: k(169699, 'Couscous, dry', 'grains-pasta'),
  cornmeal: k(169697, 'Whole-grain cornmeal (polenta), dry', 'grains-pasta'),
  ww_flour: k(168893, 'Whole-wheat flour', 'baking'),
  wild_rice: k(169726, 'Wild rice, dry', 'grains-pasta'),
  ww_bread: k(172688, 'Whole-wheat bread', 'bakery', { slice: 32 }),
  multigrain_bread: k(168013, 'Multigrain bread', 'bakery'),
  rye_bread: k(172684, 'Rye bread', 'bakery', { slice: 32 }),
  sourdough: k(172675, 'Sourdough bread', 'bakery', { slice: 50 }),
  ww_pita: k(174916, 'Whole-wheat pita', 'bakery'),
  tortilla: k(175037, 'Flour tortilla (8 inch)', 'bakery'),
  corn_tortilla: k(175036, 'Corn tortilla', 'bakery'),
  english_muffin: k(174093, 'Whole-grain English muffin', 'bakery'),
  ww_crackers: k(172749, 'Whole-wheat crackers', 'snacks', { each: 4.5, cracker: 4.5 }),
  popcorn: k(170246, 'Popcorn, air-popped', 'snacks'),

  // ---------------------------------------------------------------- beans and legumes
  chickpeas: k(173801, 'Chickpeas, canned, drained', 'canned-jarred', { can: 240 }),
  lentils: k(172420, 'Brown or green lentils, dry', 'grains-pasta'),
  red_lentils: k(174284, 'Red lentils, dry', 'grains-pasta'),
  black_beans: k(175238, 'Black beans, canned, low sodium', 'canned-jarred', { can: 240 }),
  white_beans: k(175204, 'White (cannellini) beans, canned', 'canned-jarred', { can: 240 }),
  kidney_beans: k(175243, 'Kidney beans, canned, drained', 'canned-jarred', { can: 240 }),
  pinto_beans: k(173797, 'Pinto beans, canned, drained', 'canned-jarred', { can: 240 }),
  edamame: k(168410, 'Edamame, frozen, shelled', 'frozen'),
  hummus: k(174289, 'Hummus', 'dairy-eggs', { container: 283 }),
  tofu: k(172475, 'Firm tofu', 'dairy-eggs', { block: 397 }),
  peanut_butter: k(172470, 'Natural peanut butter', 'oils-condiments'),
  tahini: k(170189, 'Tahini', 'oils-condiments'),

  // ---------------------------------------------------------------- nuts and seeds
  almonds: k(170567, 'Almonds', 'nuts-dried-fruit'),
  walnuts: k(170187, 'Walnuts', 'nuts-dried-fruit'),
  pistachios: k(170184, 'Pistachios', 'nuts-dried-fruit'),
  pine_nuts: k(170591, 'Pine nuts', 'nuts-dried-fruit'),
  pecans: k(170182, 'Pecans', 'nuts-dried-fruit'),
  cashews: k(170162, 'Cashews', 'nuts-dried-fruit', { tbsp: 9 }),
  chia: k(170554, 'Chia seeds', 'nuts-dried-fruit', { tbsp: 12 }),
  flax: k(169414, 'Ground flaxseed', 'nuts-dried-fruit'),
  sunflower_seeds: k(170562, 'Sunflower seeds', 'nuts-dried-fruit'),
  pumpkin_seeds: k(170556, 'Pumpkin seeds (pepitas)', 'nuts-dried-fruit'),
  sesame: k(170150, 'Sesame seeds', 'nuts-dried-fruit'),
  hemp: k(170148, 'Hemp hearts', 'nuts-dried-fruit'),
  almond_butter: k(168588, 'Almond butter', 'oils-condiments'),

  // ---------------------------------------------------------------- dairy and eggs
  egg: k(171287, 'Eggs', 'dairy-eggs'),
  egg_white: k(172183, 'Egg whites', 'dairy-eggs'),
  greek_yogurt: k(170894, 'Plain Greek yogurt, nonfat', 'dairy-eggs', { cup: 227, tbsp: 14 }),
  greek_yogurt_2: k(170903, 'Plain Greek yogurt, low-fat', 'dairy-eggs', { cup: 227, tbsp: 14 }),
  yogurt: k(170886, 'Plain yogurt, low-fat', 'dairy-eggs'),
  feta: k(173420, 'Feta cheese', 'dairy-eggs'),
  parmesan: k(171247, 'Parmesan cheese, grated', 'dairy-eggs'),
  mozzarella: k(170847, 'Mozzarella, part-skim', 'dairy-eggs', { cup: 113 }),
  ricotta: k(171248, 'Ricotta, part-skim', 'dairy-eggs'),
  milk: k(171267, 'Milk, 2%', 'dairy-eggs'),
  cottage_cheese: k(172182, 'Cottage cheese, 2%', 'dairy-eggs'),
  goat_cheese: k(173435, 'Goat cheese', 'dairy-eggs', { tbsp: 14, cup: 112 }),
  kefir: k(170904, 'Plain kefir, low-fat', 'dairy-eggs'),
  butter: k(173430, 'Butter, unsalted', 'dairy-eggs'),
  cheddar: k(171292, 'Cheddar, reduced-fat', 'dairy-eggs', { cup: 113 }),
  soymilk: k(172456, 'Soy milk', 'dairy-eggs'),
  almond_milk: k(174832, 'Almond milk, unsweetened', 'dairy-eggs'),

  // ---------------------------------------------------------------- fish and seafood (raw weights)
  salmon: k(175167, 'Salmon fillet', 'meat-seafood'),
  cod: k(171955, 'Cod fillet', 'meat-seafood'),
  tilapia: k(175176, 'Tilapia fillet', 'meat-seafood'),
  shrimp: k(175179, 'Shrimp, peeled', 'meat-seafood'),
  tuna: k(173709, 'Canned light tuna in water, drained', 'canned-jarred', { can: 113 }),
  sardines: k(175139, 'Sardines in olive oil, drained', 'canned-jarred', { can: 92 }),
  trout: k(173717, 'Rainbow trout fillet', 'meat-seafood'),
  canned_salmon: k(175175, 'Canned salmon, drained', 'canned-jarred', { can: 140 }),
  scallops: k(174220, 'Sea scallops', 'meat-seafood'),
  mussels: k(174216, 'Mussels', 'meat-seafood'),
  halibut: k(174200, 'Halibut fillet', 'meat-seafood'),

  // ---------------------------------------------------------------- poultry and meat (raw weights)
  chicken_breast: k(171077, 'Chicken breast, boneless skinless', 'meat-seafood'),
  chicken_thigh: k(173627, 'Chicken thighs, boneless skinless', 'meat-seafood'),
  ground_turkey: k(172850, 'Ground turkey, 93% lean', 'meat-seafood'),
  ground_beef: k(174030, 'Ground beef, 90% lean', 'meat-seafood'),
  lamb: k(174370, 'Ground lamb', 'meat-seafood'),
  pork_tenderloin: k(168249, 'Pork tenderloin', 'meat-seafood'),
  sirloin: k(172173, 'Top sirloin steak', 'meat-seafood'),

  // ---------------------------------------------------------------- canned, jarred, condiments
  diced_tomatoes: k(170138, 'Diced tomatoes, canned, no salt added', 'canned-jarred', { can: 411 }),
  crushed_tomatoes: k(170501, 'Crushed tomatoes, canned', 'canned-jarred', { can: 794 }),
  tomato_paste: k(170459, 'Tomato paste', 'canned-jarred', { can: 170 }),
  tomato_sauce: k(170054, 'Tomato sauce', 'canned-jarred', { can: 227 }),
  marinara: k(171597, 'Marinara sauce, low sodium', 'canned-jarred', { jar: 680 }),
  roasted_peppers: k(168546, 'Roasted red peppers, jarred', 'canned-jarred', { jar: 340 }),
  artichokes: k(168387, 'Artichoke hearts', 'frozen'),
  olives: k(169094, 'Black olives', 'canned-jarred'),
  green_olives: k(169096, 'Green olives', 'canned-jarred'),
  capers: k(172238, 'Capers', 'canned-jarred'),
  pesto: k(171579, 'Basil pesto', 'canned-jarred'),
  salsa: k(174524, 'Salsa', 'canned-jarred'),
  veg_broth: k(171583, 'Vegetable broth', 'canned-jarred', { carton: 946 }),
  chicken_broth: k(172888, 'Chicken broth, reduced sodium', 'canned-jarred', { carton: 946 }),
  olive_oil: k(171413, 'Extra-virgin olive oil', 'oils-condiments'),
  balsamic: k(172241, 'Balsamic vinegar', 'oils-condiments'),
  red_wine_vinegar: k(172240, 'Red wine vinegar', 'oils-condiments'),
  mustard: k(172234, 'Dijon mustard', 'oils-condiments'),
  soy_sauce: k(172473, 'Soy sauce, low sodium', 'oils-condiments'),
  honey: k(169640, 'Honey', 'baking'),
  maple_syrup: k(169661, 'Maple syrup', 'baking'),
  dark_chocolate: k(170273, 'Dark chocolate (70-85%)', 'snacks'),
  cocoa: k(169593, 'Unsweetened cocoa powder', 'baking'),
  vanilla: k(173471, 'Vanilla extract', 'baking'),
  baking_powder: k(172803, 'Baking powder', 'baking'),
  sugar: k(169655, 'Sugar', 'baking'),

  // ---------------------------------------------------------------- frozen
  frozen_spinach: k(169287, 'Frozen chopped spinach', 'frozen', { package: 284 }),
  frozen_broccoli: k(169968, 'Frozen broccoli', 'frozen', { bag: 340 }),
  frozen_berries: k(173950, 'Frozen blueberries', 'frozen', { bag: 454 }),
  frozen_strawberries: k(168173, 'Frozen strawberries', 'frozen'),
  peas: k(170016, 'Frozen peas', 'frozen', { bag: 454 }),
  corn: k(168398, 'Frozen corn', 'frozen', { bag: 454 }),

  // ---------------------------------------------------------------- spices and herbs (dried)
  oregano: k(171328, 'Dried oregano', 'spices'),
  cumin: k(170923, 'Ground cumin', 'spices'),
  paprika: k(171329, 'Paprika', 'spices'),
  cinnamon: k(171320, 'Ground cinnamon', 'spices'),
  turmeric: k(172231, 'Ground turmeric', 'spices'),
  red_pepper_flakes: k(170932, 'Red pepper flakes', 'spices'),
  black_pepper: k(170931, 'Black pepper', 'spices'),
  salt: k(173468, 'Salt', 'spices'),
  thyme: k(170938, 'Dried thyme', 'spices'),
  rosemary: k(171333, 'Dried rosemary', 'spices'),
  coriander: k(170922, 'Ground coriander', 'spices'),
  garlic_powder: k(171325, 'Garlic powder', 'spices'),
  chili_powder: k(171319, 'Chili powder', 'spices'),
  ground_ginger: k(170926, 'Ground ginger', 'spices'),
  curry_powder: k(170924, 'Curry powder', 'spices'),
  nutmeg: k(171326, 'Ground nutmeg', 'spices'),
  bay_leaf: k(170917, 'Bay leaves', 'spices', { leaf: 0.6 }),
  allspice: k(171315, 'Ground allspice', 'spices'),

  // ---------------------------------------------------------------- other
  water: { ...k(173647, 'Water', 'other'), noGrocery: true },
} satisfies Record<string, FoodKey>;

export type FoodKeyName = keyof typeof FOOD_KEYS;

/** Food id used inside the app for a USDA food. */
export const usdaFoodId = (fdcId: number) => `usda:${fdcId}`;
