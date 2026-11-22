// Tests only: the real food database, read straight from disk.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FoodDb, type FoodsFile } from './foodDb';

let db: FoodDb | null = null;
export function testDb(): FoodDb {
  db ??= new FoodDb(JSON.parse(readFileSync(join(__dirname, '../../public/data/foods.json'), 'utf8')) as FoodsFile);
  return db;
}
