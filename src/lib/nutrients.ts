// The nutrients this app tracks, in ONE fixed order.
// The food database stores each food's values as an array in exactly this order (see scripts/build-foods.ts),
// so never reorder this list without rebuilding public/data/foods.json.

export const NUTRIENTS = [
  // key, label, unit, USDA FoodData Central nutrient id(s) (first found wins), group
  { key: 'kcal', label: 'Calories', unit: 'kcal', usda: [1008], group: 'macro' },
  { key: 'protein', label: 'Protein', unit: 'g', usda: [1003], group: 'macro' },
  { key: 'fat', label: 'Total fat', unit: 'g', usda: [1004], group: 'macro' },
  { key: 'satFat', label: 'Saturated fat', unit: 'g', usda: [1258], group: 'macro' },
  { key: 'monoFat', label: 'Monounsaturated fat', unit: 'g', usda: [1292], group: 'macro' },
  { key: 'polyFat', label: 'Polyunsaturated fat', unit: 'g', usda: [1293], group: 'macro' },
  { key: 'carbs', label: 'Carbohydrates', unit: 'g', usda: [1005], group: 'macro' },
  { key: 'fiber', label: 'Fiber', unit: 'g', usda: [1079], group: 'macro' },
  { key: 'sugars', label: 'Sugars', unit: 'g', usda: [2000], group: 'macro' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', usda: [1253], group: 'macro' },
  { key: 'vitA', label: 'Vitamin A', unit: 'µg', usda: [1106], group: 'vitamin' },
  { key: 'vitC', label: 'Vitamin C', unit: 'mg', usda: [1162], group: 'vitamin' },
  { key: 'vitD', label: 'Vitamin D', unit: 'µg', usda: [1114], group: 'vitamin' },
  { key: 'vitE', label: 'Vitamin E', unit: 'mg', usda: [1109], group: 'vitamin' },
  { key: 'vitK', label: 'Vitamin K', unit: 'µg', usda: [1185], group: 'vitamin' },
  { key: 'thiamin', label: 'Thiamin (B1)', unit: 'mg', usda: [1165], group: 'vitamin' },
  { key: 'riboflavin', label: 'Riboflavin (B2)', unit: 'mg', usda: [1166], group: 'vitamin' },
  { key: 'niacin', label: 'Niacin (B3)', unit: 'mg', usda: [1167], group: 'vitamin' },
  { key: 'pantothenic', label: 'Pantothenic acid (B5)', unit: 'mg', usda: [1170], group: 'vitamin' },
  { key: 'vitB6', label: 'Vitamin B6', unit: 'mg', usda: [1175], group: 'vitamin' },
  { key: 'folate', label: 'Folate', unit: 'µg', usda: [1190, 1177], group: 'vitamin' }, // DFE, else total folate
  { key: 'vitB12', label: 'Vitamin B12', unit: 'µg', usda: [1178], group: 'vitamin' },
  { key: 'calcium', label: 'Calcium', unit: 'mg', usda: [1087], group: 'mineral' },
  { key: 'iron', label: 'Iron', unit: 'mg', usda: [1089], group: 'mineral' },
  { key: 'magnesium', label: 'Magnesium', unit: 'mg', usda: [1090], group: 'mineral' },
  { key: 'phosphorus', label: 'Phosphorus', unit: 'mg', usda: [1091], group: 'mineral' },
  { key: 'potassium', label: 'Potassium', unit: 'mg', usda: [1092], group: 'mineral' },
  { key: 'sodium', label: 'Sodium', unit: 'mg', usda: [1093], group: 'mineral' },
  { key: 'zinc', label: 'Zinc', unit: 'mg', usda: [1095], group: 'mineral' },
  { key: 'copper', label: 'Copper', unit: 'mg', usda: [1098], group: 'mineral' },
  { key: 'manganese', label: 'Manganese', unit: 'mg', usda: [1101], group: 'mineral' },
  { key: 'selenium', label: 'Selenium', unit: 'µg', usda: [1103], group: 'mineral' },
] as const;

export type NutrientKey = (typeof NUTRIENTS)[number]['key'];
export type NutrientGroup = (typeof NUTRIENTS)[number]['group'];
export const NUTRIENT_KEYS: NutrientKey[] = NUTRIENTS.map((n) => n.key);
export const NUTRIENT_INFO = Object.fromEntries(NUTRIENTS.map((n) => [n.key, n])) as Record<NutrientKey, (typeof NUTRIENTS)[number]>;

/**
 * Nutrient amounts. `null` means "not listed" (the source did not report it). It is NEVER the same as 0:
 * a scanned cereal box with no vitamin K on the label has unknown vitamin K, not zero.
 */
export type NutrientValues = Record<NutrientKey, number | null>;

export const emptyValues = (fill: number | null = null): NutrientValues =>
  Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, fill])) as NutrientValues;
