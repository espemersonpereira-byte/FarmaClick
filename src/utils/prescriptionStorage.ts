import { SavedPrescription } from '../components/PrescriptionsTab';

const LOCAL_STORAGE_KEY = 'farmaclick_prescriptions';
const DELETED_IDS_KEY = 'farmaclick_deleted_prescription_ids';
const IDB_NAME = 'farmaclick_clinical_db';
const IDB_STORE = 'prescriptions';
const IDB_ACCOUNTS_STORE = 'accounts';
const IDB_VERSION = 2;

function getDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function addDeletedId(id: string): void {
  try {
    const set = getDeletedIds();
    set.add(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

function openPrescriptionsDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(IDB_ACCOUNTS_STORE)) {
          db.createObjectStore(IDB_ACCOUNTS_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readFromIndexedDB(): Promise<SavedPrescription[]> {
  const db = await openPrescriptionsDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        resolve(Array.isArray(req.result) ? req.result : []);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

async function saveToIndexedDB(prescription: SavedPrescription): Promise<void> {
  const db = await openPrescriptionsDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(prescription);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function saveManyToIndexedDB(list: SavedPrescription[]): Promise<void> {
  const db = await openPrescriptionsDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      for (const item of list) {
        if (item && item.id) {
          store.put(item);
        }
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function deleteFromIndexedDB(id: string): Promise<void> {
  const db = await openPrescriptionsDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function readPrescriptionsSyncFromLocal(): SavedPrescription[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const deleted = getDeletedIds();
    return Array.isArray(parsed) ? parsed.filter((p) => p && p.id && !deleted.has(p.id)) : [];
  } catch {
    return [];
  }
}

export function writePrescriptionsSafeToLocal(list: SavedPrescription[]): void {
  const deleted = getDeletedIds();
  const cleanList = list.filter((p) => p && p.id && !deleted.has(p.id));
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanList));
  } catch {
    // QuotaExceededError due to base64 photos: store lightweight version in localStorage while IndexedDB & Backend keep the full photos
    try {
      const lightList = cleanList.map((p) => ({
        ...p,
        photoUrl: p.photoUrl && p.photoUrl.length > 40000 ? null : p.photoUrl
      }));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lightList));
    } catch (e2) {
      console.warn('Quota de localStorage atingida, mantendo dados completos no IndexedDB e servidor:', e2);
    }
  }
}

/**
 * Loads and merges saved prescriptions from LocalStorage, IndexedDB, and Backend (/api/prescriptions),
 * ensuring no saved prescription ever disappears across reloads or logouts unless explicitly deleted.
 */
export async function loadAllSavedPrescriptions(): Promise<SavedPrescription[]> {
  const deleted = getDeletedIds();
  const localList = readPrescriptionsSyncFromLocal();
  const idbList = await readFromIndexedDB();

  let serverList: SavedPrescription[] = [];
  try {
    const res = await fetch('/api/prescriptions');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.prescriptions)) {
        serverList = data.prescriptions;
      }
    }
  } catch {
    // Offline fallback uses IndexedDB + LocalStorage
  }

  // Merge by ID, preferring the entry that has photoUrl preserved
  const map = new Map<string, SavedPrescription>();

  for (const source of [idbList, serverList, localList]) {
    for (const item of source) {
      if (!item || !item.id || deleted.has(item.id)) continue;
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, item);
      } else if (!existing.photoUrl && item.photoUrl) {
        map.set(item.id, { ...existing, photoUrl: item.photoUrl });
      }
    }
  }

  const merged = Array.from(map.values());

  // Sync merged state back to all 3 stores so they stay consistent
  writePrescriptionsSafeToLocal(merged);
  await saveManyToIndexedDB(merged);
  if (merged.length > 0) {
    fetch('/api/prescriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prescriptions: merged })
    }).catch(() => {});
  }

  return merged;
}

export async function persistNewPrescription(
  prescription: SavedPrescription,
  currentList: SavedPrescription[]
): Promise<SavedPrescription[]> {
  const updated = [prescription, ...currentList.filter((p) => p.id !== prescription.id)];
  writePrescriptionsSafeToLocal(updated);
  await saveToIndexedDB(prescription);
  fetch('/api/prescriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prescription })
  }).catch(() => {});
  return updated;
}

export async function removeSavedPrescription(
  id: string,
  currentList: SavedPrescription[]
): Promise<SavedPrescription[]> {
  addDeletedId(id);
  const updated = currentList.filter((p) => p.id !== id);
  writePrescriptionsSafeToLocal(updated);
  await deleteFromIndexedDB(id);
  fetch(`/api/prescriptions/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  }).catch(() => {});
  return updated;
}
