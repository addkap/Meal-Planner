import { useState } from 'react';
import { BACKUP_FILE_PREFIX } from '../appIdentity';
import { todayLocal } from '../lib/dates';
import { applyMerge, readLocalData } from '../sync/local';
import { liveCount, parseSyncData, type SyncData, type TableName } from '../sync/merge';

const KINDS: [TableName, string, string][] = [
  ['plans', 'weekly plan', 'weekly plans'], ['logs', 'logged meal or food', 'logged meals and foods'], ['myRecipes', 'recipe of yours', 'recipes of yours'],
  ['customFoods', 'saved food', 'saved foods'], ['batches', 'batch', 'batches'], ['weighIns', 'weigh-in', 'weigh-ins'], ['stores', 'store', 'stores'],
];

/** "It has 3 weekly plans, 42 logged meals and foods and 1 weigh-in." Only kinds that are there are named. */
function backupSummary(d: SyncData): string {
  const parts = KINDS.map(([t, one, many]) => [liveCount(d, t), one, many] as const).filter(([n]) => n > 0).map(([n, one, many]) => `${n} ${n === 1 ? one : many}`);
  if (!parts.length) return 'It had nothing in it yet.';
  return `It has ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]}.`;
}

/** Export / Import a JSON backup. The file has the same format as the one in OneDrive. */
export default function BackupSettings() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function exportBackup() {
    const data = await readLocalData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${BACKUP_FILE_PREFIX}${todayLocal()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    setError('');
    setMessage(`Backup saved. ${backupSummary(data)}`);
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    try {
      const incoming = parseSyncData(await file.text());
      await applyMerge(incoming); // merges: newer data on this phone is kept, nothing is wiped
      setError('');
      setMessage(`Restored. ${backupSummary(incoming)}`);
    } catch (e) {
      setMessage('');
      setError(e instanceof Error ? e.message : 'Could not read that file.');
    }
  }

  return (
    <section className="card">
      <h2>Backup</h2>
      <p className="muted">Save everything (plans, logs, your recipes and foods, stores, weigh-ins, settings) to a file, or restore from one. Restoring adds to what is on this phone, it never wipes it.</p>
      <button className="btn" onClick={exportBackup}>Export backup</button>
      <label className="btn filebtn">
        Import backup
        <input type="file" accept="application/json,.json" onChange={(e) => { void importBackup(e.target.files?.[0]); e.target.value = ''; }} />
      </label>
      {message && <p className="banner ok" role="status">{message}</p>}
      {error && <p className="banner err" role="alert">{error}</p>}
    </section>
  );
}
