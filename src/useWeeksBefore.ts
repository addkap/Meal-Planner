// The two weeks before a week, as the planner needs them: what is still open from them (so this week uses it
// up and buys less) and last week's recipes (used less, so weeks do not look alike).
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { useAppData } from './AppData';
import { addDays } from './lib/dates';
import { fromWeeksBefore } from './lib/planner';
import type { OpenPack } from './lib/leftovers';

export interface WeeksBefore { carryIn: OpenPack[]; recent: Set<string> }

/** Undefined while loading. */
export function useWeeksBefore(weekStart: string): WeeksBefore | undefined {
  const { pool } = useAppData();
  const plans = useLiveQuery(
    async () => {
      const [a, b] = await db.plans.bulkGet([addDays(weekStart, -14), addDays(weekStart, -7)]);
      return [a && !a.deletedAt ? a.days : undefined, b && !b.deletedAt ? b.days : undefined];
    },
    [weekStart],
  );
  return useMemo(() => (plans ? fromWeeksBefore(weekStart, plans, pool) : undefined), [plans, weekStart, pool]);
}
