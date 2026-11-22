import { describe, expect, it } from 'vitest';
import { formatAmount, formatQty, ingredientText, makePortion, normalizeUnit, pluralize, portionUnit, toGrams, unitsFor } from './units';
import { testDb } from './testDb';

const food = (portions: [string, number][]) => ({ portions: portions.map(([l, g]) => makePortion(l, g)) });

describe('normalizeUnit', () => {
  it('maps spellings and plurals to one unit', () => {
    expect(normalizeUnit('Cups')).toBe('cup');
    expect(normalizeUnit('Tablespoons')).toBe('tbsp');
    expect(normalizeUnit('tsp.')).toBe('tsp');
    expect(normalizeUnit('ounces')).toBe('oz');
    expect(normalizeUnit('lbs')).toBe('lb');
    expect(normalizeUnit('cloves')).toBe('clove');
    expect(normalizeUnit('')).toBe('each');
    expect(normalizeUnit('fluid ounces')).toBe('fl oz');
  });
});

describe('portionUnit reads USDA portion labels', () => {
  it.each([
    ['cup, chopped', 'cup'],
    ['cup (8 fl oz)', 'cup'],
    ['tbsp', 'tbsp'],
    ['medium (2-3/4" dia)', 'medium'],
    ['medium whole (2-3/5" dia)', 'medium'],
    ['large', 'large'],
    ['extra large', 'extra large'],
    ['slice regular', 'slice'],
    ['slice, thin', 'slice'],
    ['oz (6 kernels)', 'oz'],
    ['fl oz', 'fl oz'],
    ['fruit (2-1/8" dia)', 'each'],
    ['package (10 oz)', 'package'],
    ['NLEA serving', 'serving'],
  ])('%s -> %s', (label, unit) => expect(portionUnit(label)).toBe(unit));
});

describe('toGrams', () => {
  const flour = food([['cup', 120], ['oz', 28.35]]);
  it('converts weights directly, whatever the food', () => {
    expect(toGrams(flour, 2, 'oz')).toBeCloseTo(56.699, 2);
    expect(toGrams(flour, 1, 'lb')).toBeCloseTo(453.592, 2);
    expect(toGrams(flour, 250, 'g')).toBe(250);
    expect(toGrams({ portions: [] }, 1, 'kg')).toBe(1000);
  });
  it('converts any volume through the food’s own density', () => {
    expect(toGrams(flour, 1, 'cup')).toBeCloseTo(120);
    expect(toGrams(flour, 1, 'tbsp')).toBeCloseTo(7.5, 1); // 120 g / 16
    expect(toGrams(flour, 3, 'tsp')).toBeCloseTo(7.5, 1); // 3 tsp = 1 tbsp
    expect(toGrams(flour, 0.5, 'cup')).toBeCloseTo(60);
  });
  it('prefers a portion in the exact unit asked for', () => {
    const f = food([['cup', 200], ['tbsp', 15]]); // not exactly 1/16 of the cup weight
    expect(toGrams(f, 2, 'tbsp')).toBeCloseTo(30);
  });
  it('uses counted portions (clove, slice, medium...)', () => {
    const garlic = food([['cup', 136], ['tsp', 2.8], ['clove', 3]]);
    expect(toGrams(garlic, 4, 'cloves')).toBe(12);
    const apple = food([['cup, sliced', 109], ['large (3-1/4" dia)', 223], ['medium (3" dia)', 182], ['small (2-3/4" dia)', 149]]);
    expect(toGrams(apple, 2, 'medium')).toBe(364);
    expect(toGrams(apple, 1, 'each')).toBe(182); // a plain count means a medium one
    expect(toGrams(apple, 1, 'small')).toBe(149);
  });
  it('returns null instead of guessing', () => {
    expect(toGrams(food([['oz', 28.35]]), 1, 'cup')).toBeNull(); // no density known
    expect(toGrams(food([['cup', 100]]), 1, 'slice')).toBeNull();
    expect(toGrams(food([['cup', 100]]), -1, 'cup')).toBeNull();
  });
  it('works on real database foods', () => {
    const db = testDb();
    expect(toGrams(db.get('key:olive_oil')!, 1, 'tbsp')).toBeCloseTo(13.5, 0);
    expect(toGrams(db.get('key:chickpeas')!, 1, 'can')).toBe(240);
    expect(toGrams(db.get('key:egg')!, 2, 'large')).toBe(100);
    // 1 cup of dry oats is far heavier than 1 cup of puffed popcorn: density is per food
    expect(toGrams(db.get('key:oats')!, 1, 'cup')!).toBeGreaterThan(70);
    expect(toGrams(db.get('key:popcorn')!, 1, 'cup')!).toBeLessThan(12);
  });
});

describe('unitsFor', () => {
  it('lists counted units, kitchen volumes when the density is known, and weights', () => {
    expect(unitsFor(food([['cup', 100], ['slice', 30]]))).toEqual(['slice', 'cup', 'tbsp', 'tsp', 'g', 'oz']);
    expect(unitsFor(food([['oz', 28]]))).toEqual(['g', 'oz']);
  });
});

describe('formatting amounts for a recipe card', () => {
  it('uses kitchen fractions', () => {
    expect(formatQty(1.5, 'cup')).toBe('1½');
    expect(formatQty(0.333, 'cup')).toBe('⅓');
    expect(formatQty(0.25, 'tsp')).toBe('¼');
    expect(formatQty(2.97, 'cup')).toBe('3');
    expect(formatQty(0.66, 'cup')).toBe('⅔');
    expect(formatQty(0.02, 'tsp')).toBe('⅛'); // never "0" for a real amount
  });
  it('rounds weights and big numbers', () => {
    expect(formatQty(453.6, 'g')).toBe('454');
    expect(formatQty(12.4, 'each')).toBe('12');
    expect(formatQty(1.25, 'lb')).toBe('1.3');
    expect(formatQty(6, 'oz')).toBe('6');
  });
  it('rounds counted things like a cook would', () => {
    expect(formatAmount(7.5, 'large')).toBe('8 large'); // 10 eggs for 4 people, cooking for 3
    expect(formatAmount(1.5, 'clove')).toBe('1½ cloves');
    expect(formatAmount(1.4, 'clove')).toBe('1½ cloves');
    expect(formatAmount(0.2, 'each')).toBe('½');
    expect(formatAmount(0.75, 'can')).toBe('1 can');
    expect(formatAmount(1.125, 'cup')).toBe('1⅛ cups'); // measured amounts are not rounded to halves
  });
  it('pluralizes counted units and hides "each"', () => {
    expect(formatAmount(2, 'cup')).toBe('2 cups');
    expect(formatAmount(1, 'can')).toBe('1 can');
    expect(formatAmount(3, 'each')).toBe('3');
    expect(formatAmount(2, 'tbsp')).toBe('2 tbsp');
    expect(formatAmount(2, 'leaf')).toBe('2 leaves');
  });
});

describe('ingredient lines', () => {
  it('reads naturally', () => {
    expect(ingredientText(3, 'each', 'orange')).toBe('3 oranges');
    expect(ingredientText(1, 'each', 'orange')).toBe('1 orange');
    expect(ingredientText(2, 'medium', 'onion', 'diced')).toBe('2 medium onions, diced');
    expect(ingredientText(7.5, 'large', 'eggs')).toBe('8 large eggs');
    expect(ingredientText(1.5, 'cup', 'spinach')).toBe('1½ cups spinach');
    expect(ingredientText(3, 'tsp', 'olive oil')).toBe('1 tbsp olive oil');
    expect(ingredientText(8, 'tbsp', 'feta')).toBe('½ cup feta');
    expect(ingredientText(6, 'tbsp', 'feta')).toBe('6 tbsp feta'); // 3/8 cup is not a clean measure
    expect(ingredientText(1.5, 'tsp', 'cumin')).toBe('1½ tsp cumin');
    expect(pluralize('tomato')).toBe('tomatoes');
    expect(pluralize('peach')).toBe('peaches');
    expect(pluralize('celery')).toBe('celery stalks');
    expect(pluralize('red bell pepper')).toBe('red bell peppers');
    expect(pluralize('chickpeas, canned, drained')).toBe('chickpeas, canned, drained');
  });
});
