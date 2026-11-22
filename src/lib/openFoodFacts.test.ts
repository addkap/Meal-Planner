import { describe, expect, it } from 'vitest';
import { categoryFromTags, cleanBarcode, listedCount, lookupBarcode, parseNutriments, productToFood } from './openFoodFacts';

// Shaped like a real Open Food Facts answer for a granola bar: a few macros, sodium, and nothing else.
const bar = {
  code: '0012345678905',
  product_name: 'Oat & Honey Granola Bar',
  brands: 'Acme Foods, Acme',
  serving_size: '1 bar (40 g)',
  serving_quantity: 40,
  categories_tags: ['en:snacks', 'en:sweet-snacks', 'en:bars'],
  nutriments: { 'energy-kcal_100g': 450, proteins_100g: 8, fat_100g: 17.5, 'saturated-fat_100g': 2.5, carbohydrates_100g: 65, sugars_100g: 25, fiber_100g: 5, sodium_100g: 0.3, calcium_100g: 0.05 },
};

describe('reading Open Food Facts nutrition', () => {
  it('converts grams to mg and µg, per 100 g', () => {
    const v = parseNutriments(bar.nutriments, 40);
    expect(v.kcal).toBe(450);
    expect(v.protein).toBe(8);
    expect(v.sodium).toBe(300); // 0.3 g -> 300 mg
    expect(v.calcium).toBe(50);
    const vit = parseNutriments({ 'vitamin-d_100g': 0.0000025, 'vitamin-c_100g': 0.012 });
    expect(vit.vitD).toBeCloseTo(2.5); // µg
    expect(vit.vitC).toBeCloseTo(12); // mg
  });
  it('never turns a missing nutrient into zero', () => {
    const v = parseNutriments(bar.nutriments, 40);
    expect(v.vitK).toBeNull();
    expect(v.iron).toBeNull();
    expect(v.cholesterol).toBeNull();
    expect(listedCount(v)).toBe(9);
  });
  it('keeps a real zero as zero', () => {
    expect(parseNutriments({ fiber_100g: 0 }).fiber).toBe(0);
    expect(parseNutriments({ fiber_100g: '0' }).fiber).toBe(0);
  });
  it('uses per-serving values when per-100 g are missing, and kJ when kcal is missing', () => {
    const v = parseNutriments({ proteins_serving: 10, energy_100g: 1000 }, 40);
    expect(v.protein).toBe(25);
    expect(v.kcal).toBeCloseTo(239, 0);
  });
  it('ignores junk values', () => {
    expect(parseNutriments({ proteins_100g: 'abc', fat_100g: -3 }).protein).toBeNull();
  });
  it('makes a saved food linked to the scanned barcode', () => {
    const f = productToFood(bar, '0012345678905', 'id1', 5);
    expect(f).toMatchObject({ name: 'Oat & Honey Granola Bar', brand: 'Acme Foods', barcode: '0012345678905', servingG: 40, servingLabel: '1 bar (40 g)', source: 'scanned', cat: 'snacks' });
    expect(productToFood({}, '123', 'id2', 5).name).toBe('Product 123');
  });
  it('guesses a grocery section', () => {
    expect(categoryFromTags(['en:dairies', 'en:yogurts'])).toBe('dairy-eggs');
    expect(categoryFromTags(['en:frozen-foods', 'en:pizzas'])).toBe('frozen');
    expect(categoryFromTags([])).toBe('other');
  });
});

describe('looking up a barcode', () => {
  const fake = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
  it('finds a product', async () => {
    expect(await lookupBarcode('0012345678905', fake(200, { status: 1, product: bar }))).toEqual({ status: 'found', product: bar });
  });
  it('says when it is not in Open Food Facts', async () => {
    expect(await lookupBarcode('1', fake(200, { status: 0 }))).toEqual({ status: 'not-found' });
    expect(await lookupBarcode('1', fake(404, {}))).toEqual({ status: 'not-found' });
  });
  it('treats a network failure as offline', async () => {
    const boom = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
    expect(await lookupBarcode('1', boom)).toEqual({ status: 'offline' });
  });
  it('accepts typed barcodes with spaces or dashes', () => {
    expect(cleanBarcode('0 12345-67890 5')).toBe('012345678905');
    expect(cleanBarcode('123')).toBeNull();
  });
});
