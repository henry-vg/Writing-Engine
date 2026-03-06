let dbPromise;
function openDb() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DBName, 1);

        request.onupgradeneeded = () => {
            request.result.createObjectStore(DBStore, { keyPath: "key" });
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    return dbPromise;
}

async function dbGet(key) {
    const db = await openDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(DBStore, "readonly");
        const request = tx.objectStore(DBStore).get(key);

        request.onsuccess = () => resolve(request.result?.value ?? null);
        request.onerror = () => reject(request.error);
    });
}

async function dbSet(key, value) {
    const db = await openDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(DBStore, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.objectStore(DBStore).put({ key, value });
    });
}