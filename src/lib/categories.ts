// Grocery list sections, in the order a typical US store is walked.

export const GROCERY_CATEGORIES = [
  { id: 'produce', label: 'Produce' },
  { id: 'meat-seafood', label: 'Meat and seafood' },
  { id: 'dairy-eggs', label: 'Dairy, eggs and refrigerated' },
  { id: 'bakery', label: 'Bread and bakery' },
  { id: 'grains-pasta', label: 'Grains, pasta and dry beans' },
  { id: 'canned-jarred', label: 'Canned and jarred' },
  { id: 'nuts-dried-fruit', label: 'Nuts, seeds and dried fruit' },
  { id: 'oils-condiments', label: 'Oils, vinegars and condiments' },
  { id: 'baking', label: 'Baking and sweeteners' },
  { id: 'spices', label: 'Spices and dried herbs' },
  { id: 'frozen', label: 'Frozen' },
  { id: 'snacks', label: 'Snacks and crackers' },
  { id: 'beverages', label: 'Drinks' },
  { id: 'other', label: 'Other' },
] as const;

export type GroceryCategory = (typeof GROCERY_CATEGORIES)[number]['id'];

/** Best-guess grocery section for a USDA food group (used for foods that are not in FOOD_KEYS). */
export const CATEGORY_BY_USDA_GROUP: Record<string, GroceryCategory> = {
  'Dairy and Egg Products': 'dairy-eggs',
  'Spices and Herbs': 'spices',
  'Fats and Oils': 'oils-condiments',
  'Poultry Products': 'meat-seafood',
  'Soups, Sauces, and Gravies': 'canned-jarred',
  'Sausages and Luncheon Meats': 'meat-seafood',
  'Breakfast Cereals': 'grains-pasta',
  'Fruits and Fruit Juices': 'produce',
  'Pork Products': 'meat-seafood',
  'Vegetables and Vegetable Products': 'produce',
  'Nut and Seed Products': 'nuts-dried-fruit',
  'Beef Products': 'meat-seafood',
  Beverages: 'beverages',
  'Finfish and Shellfish Products': 'meat-seafood',
  'Legumes and Legume Products': 'canned-jarred',
  'Lamb, Veal, and Game Products': 'meat-seafood',
  'Baked Products': 'bakery',
  Sweets: 'snacks',
  'Cereal Grains and Pasta': 'grains-pasta',
  'Fast Foods': 'other',
  'Meals, Entrees, and Side Dishes': 'frozen',
  Snacks: 'snacks',
  'Restaurant Foods': 'other',
  'Alcoholic Beverages': 'beverages',
};
