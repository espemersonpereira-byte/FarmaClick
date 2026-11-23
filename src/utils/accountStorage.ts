import { UserProfile } from '../components/SplashScreen';
import { PROFESSION_OPTIONS } from '../data/professions';

const ACCOUNTS_STORAGE_KEY = 'farmaclick_accounts';
const DELETED_ACCOUNT_IDS_KEY = 'farmaclick_deleted_account_ids';
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

export function getAccountUniqueKey(profile?: UserProfile | null): string {
  if (!profile) return 'anonymous';
  const email = normalizeAuthKey(profile.email);
  if (email) return `email:${email}`;
  if (profile.id) return `id:${profile.id}`;
  const name = normalizeAuthKey(profile.name);
  return `name:${name || 'user'}`;
}

export function doesRecordBelongToUser(
  record: { ownerId?: string; ownerEmail?: string; savedBy?: string; pharmacistName?: string },
  user?: UserProfile | null
): boolean {
  if (!user) return false;
  const userEmail = normalizeAuthKey(user.email);
  const userId = (user.id || '').trim();
  const userName = normalizeAuthKey(user.name);

  if (record.ownerEmail && userEmail) {
    return normalizeAuthKey(record.ownerEmail) === userEmail;
  }
  if (record.ownerId && userId) {
    return record.ownerId === userId;
  }
  // If record has an ownerEmail or ownerId that does NOT match this user, hide it
  if (record.ownerEmail && (!userEmail || normalizeAuthKey(record.ownerEmail) !== userEmail)) {
    return false;
  }
  if (record.ownerId && (!userId || record.ownerId !== userId)) {
    return false;
  }

  // Fallback for legacy records without ownerId/ownerEmail: check savedBy or pharmacistName
  if (record.savedBy && userName) {
    return normalizeAuthKey(record.savedBy).includes(userName);
  }
  if (record.pharmacistName && userName) {
    return normalizeAuthKey(record.pharmacistName).includes(userName);
  }
  return false;
}

function getDeletedAccountIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_ACCOUNT_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function addDeletedAccountKey(key: string): void {
  if (!key) return;
  try {
    const set = getDeletedAccountIds();
    set.add(key);
    localStorage.setItem(DELETED_ACCOUNT_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

function isAccountDeleted(acc: UserProfile, deletedSet: Set<string>): boolean {
  if (!acc) return true;
  if (acc.id && deletedSet.has(acc.id)) return true;
  const email = normalizeAuthKey(acc.email);
  if (email && deletedSet.has(`email:${email}`)) return true;
  return false;
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

  // Match first name or partial name ONLY if identifier does NOT look like an email
  if (!normId.includes('@') && normId.length >= 3 && normName) {
    const nameTokens = normName.split(/\s+/);
    if (nameTokens.includes(normId) || normName.includes(normId)) {
      return true;
    }
  }

  return false;
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
        const deleted = getDeletedAccountIds();
        const list = Array.isArray(req.result) ? req.result : [];
        resolve(list.filter((a) => !isAccountDeleted(a, deleted)));
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

async function deleteAccountFromIndexedDB(id: string): Promise<void> {
  const db = await openClinicalDB();
  if (!db || !id) return;
  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains(IDB_ACCOUNTS_STORE)) {
        resolve();
        return;
      }
      const tx = db.transaction(IDB_ACCOUNTS_STORE, 'readwrite');
      const store = tx.objectStore(IDB_ACCOUNTS_STORE);
      store.delete(id);
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
    const deleted = getDeletedAccountIds();
    return Array.isArray(parsed) ? parsed.filter((a) => !isAccountDeleted(a, deleted)) : [];
  } catch {
    return [];
  }
}

export function writeAccountsSafeToLocal(accounts: UserProfile[]): void {
  const deleted = getDeletedAccountIds();
  const clean = accounts.filter((a) => !isAccountDeleted(a, deleted));
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    try {
      const light = clean.map((a) => ({
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
  const deleted = getDeletedAccountIds();

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const acc of list) {
      if (!acc || !acc.name || isAccountDeleted(acc, deleted)) continue;
      const cleanEmail = normalizeAuthKey(acc.email);
      const cleanName = normalizeAuthKey(acc.name);

      // Strict matching:
      // 1. Same unique ID
      // 2. Or same email (when email is provided)
      // 3. Or same name ONLY when neither account has a different email
      const existingIdx = result.findIndex((u) => {
        if (acc.id && u.id && u.id === acc.id) return true;
        if (cleanEmail && u.email && normalizeAuthKey(u.email) === cleanEmail) return true;
        if (!cleanEmail && !u.email && cleanName && normalizeAuthKey(u.name) === cleanName) return true;
        return false;
      });

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
  // If an account is explicitly upserted/registered, remove its email/id from deleted set if it was previously deleted
  try {
    const deleted = getDeletedAccountIds();
    if (profile.id) deleted.delete(profile.id);
    const email = normalizeAuthKey(profile.email);
    if (email) deleted.delete(`email:${email}`);
    localStorage.setItem(DELETED_ACCOUNT_IDS_KEY, JSON.stringify(Array.from(deleted)));
  } catch {
    // ignore
  }

  const localList = readAccountsSyncFromLocal();
  const merged = mergeAccountsLists([profile], localList);
  writeAccountsSafeToLocal(merged);
  saveAccountsToIndexedDB(merged).catch(() => {});
  return merged;
}

export async function deleteUserAccountCompletely(profile: UserProfile): Promise<UserProfile[]> {
  if (profile.id) {
    addDeletedAccountKey(profile.id);
    await deleteAccountFromIndexedDB(profile.id);
  }
  const cleanEmail = normalizeAuthKey(profile.email);
  if (cleanEmail) {
    addDeletedAccountKey(`email:${cleanEmail}`);
  }

  const localList = readAccountsSyncFromLocal();
  const remaining = localList.filter((u) => {
    if (profile.id && u.id === profile.id) return false;
    if (cleanEmail && u.email && normalizeAuthKey(u.email) === cleanEmail) return false;
    if (!cleanEmail && !u.email && normalizeAuthKey(u.name) === normalizeAuthKey(profile.name)) return false;
    return true;
  });

  writeAccountsSafeToLocal(remaining);

  // Also remove active session if it belongs to this user
  localStorage.removeItem(CURRENT_USER_KEY);

  // Delete from backend server
  const targetId = profile.id || 'by-query';
  const params = new URLSearchParams();
  if (profile.email) params.set('email', profile.email);
  if (profile.name) params.set('name', profile.name);

  fetch(`/api/auth/accounts/${encodeURIComponent(targetId)}?${params.toString()}`, {
    method: 'DELETE'
  }).catch(() => {});

  return remaining;
}

export async function loadAllSavedAccounts(): Promise<UserProfile[]> {
  const localList = readAccountsSyncFromLocal();
  const idbList = await readAccountsFromIndexedDB();
  const deleted = getDeletedAccountIds();

  let serverList: UserProfile[] = [];
  try {
    const res = await fetch('/api/auth/accounts');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.accounts)) {
        serverList = data.accounts.filter((a: UserProfile) => !isAccountDeleted(a, deleted));
      }
    }
  } catch {
    // Offline fallback uses IndexedDB + LocalStorage
  }

  const merged = mergeAccountsLists(idbList, localList, serverList);
  writeAccountsSafeToLocal(merged);
  await saveAccountsToIndexedDB(merged);

  if (merged.length > 0 || deleted.size > 0) {
    fetch('/api/auth/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accounts: merged,
        deletedIds: Array.from(deleted)
      })
    }).catch(() => {});
  }

  return merged;
}
