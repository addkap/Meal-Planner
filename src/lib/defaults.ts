// Starting values for Settings. She can change all of these.
import type { Settings } from '../types';
import { DEFAULT_RULES } from './pool';
import { DEFAULT_PEOPLE } from './people';

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  updatedAt: 0,
  kcal: 1700,
  fiber: 28,
  sex: 'female',
  age: '51-60',
  peopleBy: DEFAULT_PEOPLE,
  weightUnit: 'lb',
  rules: DEFAULT_RULES,
};
