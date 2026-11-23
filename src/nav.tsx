// Simple in-app navigation: five bottom tabs, and a stack of pages opened on top (like a recipe).
// An iPhone Home Screen app has no browser Back button, so every opened page has its own Back button.
import { createContext, useContext } from 'react';
import type { MealSlot } from './types';

export const TABS = ['Plan', 'Groceries', 'Today', 'Recipes', 'More'] as const;
export type Tab = (typeof TABS)[number];

/** A planned meal the recipe was opened from (so "people" and "lock" act on that meal). */
export interface MealRef { weekStart: string; date: string; slot: MealSlot }

export type Route =
  | { name: 'recipe'; recipeId: string; meal?: MealRef }
  | { name: 'log'; date: string; slot: MealSlot; editId?: string }
  | { name: 'batches' }
  | { name: 'batch-new' }
  | { name: 'batch-plan'; batchId: string; weekStart?: string }
  | { name: 'recipe-edit'; id?: string }
  | { name: 'weight' }
  | { name: 'settings' };

export interface Nav {
  tab: Tab;
  setTab: (t: Tab) => void;
  open: (r: Route) => void;
  back: () => void;
}

export const NavCtx = createContext<Nav | null>(null);
export function useNav(): Nav {
  const v = useContext(NavCtx);
  if (!v) throw new Error('useNav outside NavCtx');
  return v;
}
