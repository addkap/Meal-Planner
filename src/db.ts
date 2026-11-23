// Local database (IndexedDB via Dexie). This is the source of truth for the app; OneDrive gets a copy.
// Every table that syncs holds records with an id and updatedAt (see src/types.ts).
import Dexie, { type Table } from 'dexie';
import { DB_NAME } from './appIdentity';
import type { Batch, CustomFood, DayTargets, GroceryMark, LogEntry, MyRecipe, RecipePref, Settings, Store, StoreAssignment, SyncMeta, WeekPlan, WeighIn } from './types';

class MealDB extends Dexie {
  settings!: Table<Settings, string>;
  plans!: Table<WeekPlan, string>;
  prefs!: Table<RecipePref, string>;
  myRecipes!: Table<MyRecipe, string>;
  customFoods!: Table<CustomFood, string>;
  batches!: Table<Batch, string>;
  logs!: Table<LogEntry, string>;
  dayTargets!: Table<DayTargets, string>;
  stores!: Table<Store, string>;
  storeAssignments!: Table<StoreAssignment, string>;
  groceryMarks!: Table<GroceryMark, string>;
  weighIns!: Table<WeighIn, string>;
  meta!: Table<SyncMeta, string>; // this device only (sync folder etc.), never uploaded

  constructor() {
    super(DB_NAME);
    // Only indexed fields are listed; other fields are stored automatically.
    this.version(1).stores({
      settings: 'id',
      plans: 'id, weekStart',
      prefs: 'id',
      myRecipes: 'id',
      customFoods: 'id, barcode',
      batches: 'id, cookedOn',
      logs: 'id, date',
      dayTargets: 'id',
      stores: 'id',
      storeAssignments: 'id',
      groceryMarks: 'id, weekStart',
      weighIns: 'id, date',
      meta: 'id',
    });
  }
}

export const db = new MealDB();
