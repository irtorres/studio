/**
 * Two-tier persistence.
 *
 * localStorage holds track metadata (small, synchronous, easy to reason about).
 * IndexedDB holds downloaded audio blobs, because Suno deletes the source
 * files after 15 days — caching locally is what keeps a library permanent.
 */

const LIBRARY_KEY = 'avanzo.library';
const SETTINGS_KEY = 'avanzo.settings';

/* ------------------------------------------------------------------ */
/* Library metadata                                                    */
/* ------------------------------------------------------------------ */

export function loadLibrary() {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLibrary(tracks) {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(tracks));
  } catch (err) {
    // Quota exceeded — metadata only, so this should be rare.
    console.warn('Could not persist library', err);
  }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/* ------------------------------------------------------------------ */
/* Audio blob cache (IndexedDB)                                        */
/* ------------------------------------------------------------------ */

const DB_NAME = 'avanzo-studio';
const DB_VERSION = 1;
const STORE = 'audio';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const store = transaction.objectStore(STORE);
        const request = fn(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

export function putAudio(id, blob) {
  return tx('readwrite', (store) => store.put(blob, id));
}

export function getAudio(id) {
  return tx('readonly', (store) => store.get(id));
}

export function deleteAudio(id) {
  return tx('readwrite', (store) => store.delete(id));
}

export async function cachedIds() {
  const keys = await tx('readonly', (store) => store.getAllKeys());
  return new Set(keys);
}

/** Rough size of everything we've cached, for the settings panel. */
export async function cacheSize() {
  if (navigator.storage?.estimate) {
    const { usage } = await navigator.storage.estimate();
    return usage ?? 0;
  }
  return 0;
}

export async function clearAudioCache() {
  await tx('readwrite', (store) => store.clear());
}

export function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / 1048576;
  if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
