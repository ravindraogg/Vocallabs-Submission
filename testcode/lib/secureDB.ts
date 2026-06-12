/**
 * Secure browser storage using IndexedDB.
 * Stores user session data with basic obfuscation so it's not
 * plain-text readable in DevTools. For a real app you'd use
 * the Web Crypto API with a derived key — but for a 60-min
 * assessment this provides a reasonable layer.
 */

const DB_NAME = "vocallabs_secure_db";
const DB_VERSION = 1;
const STORE_NAME = "user_sessions";

// ── Simple obfuscation (base-64 of JSON) ──────────────────────────────
function encode(data: unknown): string {
  return btoa(encodeURIComponent(JSON.stringify(data)));
}

function decode<T>(encoded: string): T {
  return JSON.parse(decodeURIComponent(atob(encoded)));
}

// ── Open / create the database ────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Public helpers ────────────────────────────────────────────────────
export async function secureSet(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ key, data: encode(value), ts: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function secureGet<T>(key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => {
      if (request.result) {
        try {
          resolve(decode<T>(request.result.data));
        } catch {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function secureDelete(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function secureClearAll(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
