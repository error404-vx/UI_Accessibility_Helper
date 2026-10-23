import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ScanResult } from '../../shared/types';

interface HelperDB extends DBSchema {
  scans: {
    key: string;
    value: ScanResult;
    indexes: { createdAt: string };
  };
}

let dbPromise: Promise<IDBPDatabase<HelperDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<HelperDB>('ui-accessibility-helper', 1, {
      upgrade(database) {
        const store = database.createObjectStore('scans', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      },
    });
  }
  return dbPromise;
}

export async function saveScan(scan: ScanResult): Promise<void> {
  await (await db()).put('scans', scan);
}

export async function getScan(id: string): Promise<ScanResult | undefined> {
  return (await db()).get('scans', id);
}

/** Newest first. */
export async function listScans(): Promise<ScanResult[]> {
  const all = await (await db()).getAllFromIndex('scans', 'createdAt');
  return all.reverse();
}

export async function deleteScan(id: string): Promise<void> {
  await (await db()).delete('scans', id);
}

export async function clearScans(): Promise<void> {
  await (await db()).clear('scans');
}
