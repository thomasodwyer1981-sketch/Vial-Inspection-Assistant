/**
 * Small IndexedDB adapter used only when WKWebView rejects localStorage.
 *
 * IndexedDB is available in iOS WKWebView and has a separate quota path from
 * the Web Storage API. Values are structured-cloned, so compacted sessions do
 * not need another JSON round-trip before they are persisted.
 */

const DATABASE_NAME = 'pepscan-storage';
const DATABASE_VERSION = 1;
const STORE_NAME = 'records';

let databasePromise: Promise<IDBDatabase | null> | null = null;

function openDatabase(): Promise<IDBDatabase | null> {
  if (databasePromise) return databasePromise;
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);

  databasePromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return databasePromise;
}

export async function readIndexedRecord<T>(key: string): Promise<T | null> {
  const database = await openDatabase();
  if (!database) return null;

  return new Promise((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function writeIndexedRecord(key: string, value: unknown): Promise<boolean> {
  const database = await openDatabase();
  if (!database) return false;

  return new Promise((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(value, key);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
      transaction.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function deleteIndexedRecord(key: string): Promise<void> {
  const database = await openDatabase();
  if (!database) return;

  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(key);
  } catch {
    // Best effort cleanup. The localStorage path remains authoritative when it works.
  }
}

export async function writeIndexedSessionAndHistory(params: {
  sessionKey: string;
  session: unknown;
  historyKey: string;
  history: unknown;
  deleteSessionKeys?: string[];
}): Promise<boolean> {
  const database = await openDatabase();
  if (!database) return false;

  return new Promise((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(params.session, params.sessionKey);
      store.put(params.history, params.historyKey);
      for (const key of params.deleteSessionKeys ?? []) store.delete(key);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
      transaction.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function deleteIndexedSessionAndWriteHistory(params: {
  sessionKey: string;
  historyKey: string;
  history: unknown;
}): Promise<boolean> {
  const database = await openDatabase();
  if (!database) return false;

  return new Promise((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(params.sessionKey);
      store.put(params.history, params.historyKey);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
      transaction.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function clearIndexedHistory(
  historyKey: string,
  sessionKeyPrefix: string,
): Promise<boolean> {
  const database = await openDatabase();
  if (!database) return false;

  return new Promise((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      // Keep an empty index as the durable marker that IndexedDB remains the
      // authoritative store. Deleting it would expose stale localStorage data
      // again on the next launch.
      store.put([], historyKey);
      const cursorRequest = store.openKeyCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        if (typeof cursor.key === 'string' && cursor.key.startsWith(sessionKeyPrefix)) {
          store.delete(cursor.key);
        }
        cursor.continue();
      };
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
      transaction.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function replaceIndexedHistory(params: {
  historyKey: string;
  history: unknown;
  sessions: Array<{ key: string; value: unknown }>;
  deleteSessionKeys: string[];
}): Promise<boolean> {
  const database = await openDatabase();
  if (!database) return false;

  return new Promise((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(params.history, params.historyKey);
      for (const session of params.sessions) store.put(session.value, session.key);
      for (const key of params.deleteSessionKeys) store.delete(key);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
      transaction.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}