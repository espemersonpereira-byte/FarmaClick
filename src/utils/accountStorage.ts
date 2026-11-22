import { UserProfile } from '../components/SplashScreen';
import { PROFESSION_OPTIONS } from '../data/professions';

const ACCOUNTS_STORAGE_KEY = 'farmaclick_accounts';
const CURRENT_USER_KEY = 'farmaclick_user';
const IDB_NAME = 'farmaclick_clinical_db';
const IDB_VERSION = 2;
const IDB_PRESCRIPTIONS_STORE = 'prescriptions';
const IDB_ACCOUNTS_STORE = 'accounts';

export function normalizeAuthKey(value?: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function doesAccountMatchIdentifier(account: UserProfile, identifier: string): boolean {
  const normId = normalizeAuthKey(identifier);
  if (!normId) return false;

  const normEmail = normalizeAuthKey(account.email);
  const normName = normalizeAuthKey(account.name);
  const normUserId = normalizeAuthKey(account.id);
  const emailPrefix = normEmail.includes('@') ? normEmail.split('@')[0] : '';

  if (normEmail && normEmail === normId) return true;
  if (emailPrefix && emailPrefix === normId) return true;
  if (normName && normName === normId) return true;
  if (normUserId && normUserId === normId) return true;

  // Match first name or partial name if at least 3 chars
  if (normId.length >= 3 && normName) {
    const nameTokens = normName.split(/\s+/);
    if (nameTokens.includes(normId) || normName.includes(normId)) {
      return true;
    }
  }
  if (normId.length >= 3 && normEmail && normEmail.includes(normId)) {
    return true;
  }

  return false;
}

export function compressAvatarSync(dataUrl: string): string {
  if (!dataUrl || !dataUrl.startsWith('data:image/') || dataUrl.length < 40000) {
    return dataUrl;
  }
  return dataUrl;
}

export function compressAvatarImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl || '');
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const MAX_SIZE = 240;
        let width = img.width;
        let height = img.height;
        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height >= width && height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
          return;
        }
      } catch {
        // fallback
      }
      resolve(dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function openClinicalDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_PRESCRIPTIONS_STORE)) {
          db.createObjectStore(IDB_PRESCRIPTIONS_STORE, { keyPath: 'id' });
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

async function readAccountsFromIndexedDB(): Promise<UserProfile[]> {
  const db = await openClinicalDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains(IDB_ACCOUNTS_STORE)) {
        resolve([]);
        return;
      }
      const tx = db.transaction(IDB_ACCOUNTS_STORE, 'readonly');
      const store = tx.objectStore(IDB_ACCOUNTS_STORE);
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

async function saveAccountsToIndexedDB(accounts: UserProfile[]): Promise<void> {
  const db = await openClinicalDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains(IDB_ACCOUNTS_STORE)) {
        resolve();
        return;
      }
      const tx = db.transaction(IDB_ACCOUNTS_STORE, 'readwrite');
      const store = tx.objectStore(IDB_ACCOUNTS_STORE);
      for (const acc of accounts) {
        if (acc && acc.id) {
          store.put(acc);
        }
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function readAccountsSyncFromLocal(): UserProfile[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeAccountsSafeToLocal(accounts: UserProfile[]): void {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // QuotaExceededError due to avatar base64: save lightweight version in localStorage while IndexedDB & Backend keep full avatar
    try {
      const light = accounts.map((a) => ({
        ...a,
        avatarUrl: a.avatarUrl && a.avatarUrl.length > 25000 ? '' : a.avatarUrl
      }));
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(light));
    } catch (e2) {
      console.warn('Quota de localStorage atingida ao salvar contas; mantendo no IndexedDB e servidor:', e2);
    }
  }
}

export function saveActiveSessionLocal(profile: UserProfile): void {
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
  } catch {
    try {
      const light = {
        ...profile,
        avatarUrl: profile.avatarUrl && profile.avatarUrl.length > 25000 ? '' : profile.avatarUrl
      };
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(light));
    } catch {
      // ignore
    }
  }
}

export function mergeAccountsLists(...lists: UserProfile[][]): UserProfile[] {
  const result: UserProfile[] = [];

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const acc of list) {
      if (!acc || !acc.name) continue;
      const cleanEmail = normalizeAuthKey(acc.email);
      const cleanName = normalizeAuthKey(acc.name);

      const existingIdx = result.findIndex(
        (u) =>
          (acc.id && u.id && u.id === acc.id) ||
          (cleanEmail && u.email && normalizeAuthKey(u.email) === cleanEmail) ||
          (cleanName && normalizeAuthKey(u.name) === cleanName)
      );

      if (existingIdx >= 0) {
        const existing = result[existingIdx];
        result[existingIdx] = {
          ...existing,
          ...acc,
          id: existing.id || acc.id || `usr_${Date.now()}`,
          email: acc.email || existing.email || '',
          password: acc.password || existing.password || '',
          avatarUrl: acc.avatarUrl || existing.avatarUrl || '',
          workplace: acc.workplace || existing.workplace || '',
          registrationNumber: acc.registrationNumber || existing.registrationNumber || '',
          profession: acc.profession || existing.profession || PROFESSION_OPTIONS[0].label
        };
      } else {
        result.push({
          ...acc,
          id: acc.id || `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          profession: acc.profession || PROFESSION_OPTIONS[0].label
        });
      }
    }
  }

  return result;
}

export function upsertAccountSync(profile: UserProfile): UserProfile[] {
  const localList = readAccountsSyncFromLocal();
  const merged = mergeAccountsLists([profile], localList);
  writeAccountsSafeToLocal(merged);
  saveAccountsToIndexedDB(merged).catch(() => {});
  return merged;
}

export async function loadAllSavedAccounts(): Promise<UserProfile[]> {
  const localList = readAccountsSyncFromLocal();
  const idbList = await readAccountsFromIndexedDB();

  let serverList: UserProfile[] = [];
  try {
    const res = await fetch('/api/auth/accounts');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.accounts)) {
        serverList = data.accounts;
      }
    }
  } catch {
    // Offline fallback uses IndexedDB + LocalStorage
  }

  const merged = mergeAccountsLists(idbList, localList, serverList);
  writeAccountsSafeToLocal(merged);
  await saveAccountsToIndexedDB(merged);

  // Sync local accounts back to backend so server always knows all accounts created on this device
  if (merged.length > 0) {
    fetch('/api/auth/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accounts: merged })
    }).catch(() => {});
  }

  return merged;
}
