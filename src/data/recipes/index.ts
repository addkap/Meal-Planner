// The built-in recipe library: 25 breakfasts, 35 lunches, 51 dinners and 20 snacks.
import type { Recipe } from '../../types';
import { BREAKFASTS } from './breakfasts';
import { LUNCHES } from './lunches';
import { DINNERS } from './dinners';
import { SNACKS } from './snacks';

export const BUILTIN_RECIPES: Recipe[] = [...BREAKFASTS, ...LUNCHES, ...DINNERS, ...SNACKS];
export const BUILTIN_BY_ID = new Map(BUILTIN_RECIPES.map((r) => [r.id, r]));
