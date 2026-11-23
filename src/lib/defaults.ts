// Starting values for Settings. She can change all of these.
import type { Settings } from '../types';
import { DEFAULT_RULES } from './pool';

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  updatedAt: 0,
  kcal: 1700,
  fiber: 28,
  sex: 'female',
  age: '51-60',
  people: 3,
  weightUnit: 'lb',
  rules: DEFAULT_RULES,
};
