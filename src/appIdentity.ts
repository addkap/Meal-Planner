// Every name this app uses to store things in the browser or in OneDrive, in ONE place.
//
// Lift Log and Erika's Lift Log live on the same website (addkap.github.io), and the browser shares
// storage between all pages of a website, so none of these names may match theirs.
// src/appIdentity.test.ts checks that they do not.

/** The IndexedDB database that holds plans, logs, recipes and settings. */
export const DB_NAME = 'meal-planner';

/** Added in front of EVERY localStorage key this page reads or writes (see installStorageNamespace.ts), including the Microsoft sign-in cache. */
export const STORAGE_PREFIX = 'meal-planner:';

/** Name prefix for the cross-tab channel the Microsoft sign-in library uses. */
export const BROADCAST_PREFIX = 'meal-planner:';

/** Which tab to reopen after coming back from the Microsoft sign-in page. */
export const RETURN_TAB_KEY = 'meal-planner-return-tab';

/** A second copy of the OneDrive folder choice (survives a wiped database). */
export const SYNC_FOLDER_KEY = 'meal-planner-sync-folder';

/** The only file this app reads or writes in the OneDrive folder. */
export const DATA_FILE_NAME = 'meal-planner-data.json';

/** Written inside the data file and backups so this app refuses files from other apps (and the reverse). */
export const SYNC_APP_TAG = 'meal-planner';

/** Backup downloads are named meal-planner-backup-<date>.json. */
export const BACKUP_FILE_PREFIX = 'meal-planner-backup-';

/** Names the offline file cache. */
export const SW_CACHE_ID = 'meal-planner';

/** What the two Lift Log apps use. Only the test reads this, to prove none of ours match. */
export const OTHER_APPS = [
  { app: 'Lift Log', dbName: 'lift-log', storagePrefix: '', dataFileName: 'lift-log-data.json', syncAppTag: 'lift-log', returnTabKey: 'lift-return-tab', syncFolderKey: 'lift-sync-folder', backupFilePrefix: 'lift-log-backup-', swCacheId: undefined },
  { app: "Erika's Lift Log", dbName: 'erika-lift-log', storagePrefix: 'erika-lift-log:', dataFileName: 'erika-lift-log-data.json', syncAppTag: 'erika-lift-log', returnTabKey: 'erika-return-tab', syncFolderKey: 'erika-sync-folder', backupFilePrefix: 'erika-lift-log-backup-', swCacheId: 'erika-lift-log' },
] as const;
