// How many people each meal is cooked for. Breakfast, lunch and the snack are usually just her; dinner is the family.
import type { MealSlot } from '../types';

export type PeopleBy = Record<MealSlot, number>;

export const DEFAULT_PEOPLE: PeopleBy = { breakfast: 1, lunch: 1, dinner: 4, snack: 1 };

/**
 * People for one meal of a day. Plans made before per-meal counts had a single `people` for the whole day;
 * those still read back with that number.
 */
export function peopleFor(d: { people?: number; peopleBy?: Partial<PeopleBy> }, slot: MealSlot): number {
  return d.peopleBy?.[slot] ?? d.people ?? DEFAULT_PEOPLE[slot];
}

export const MEAL_ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
export const MEAL_LABEL: Record<MealSlot, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
