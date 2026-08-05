let dbPromise;
function openDb() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onupgradeneeded = () => {
            request.result.createObjectStore(dbStore, { keyPath: "key" });
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    return dbPromise;
}

async function dbGet(key) {
    try {
        const db = await openDb();

        return await new Promise((resolve, reject) => {
            const tx = db.transaction(dbStore, "readonly");
            const request = tx.objectStore(dbStore).get(key);

            request.onsuccess = () => resolve(request.result?.value ?? null);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        showError(`could not read "${key}" in the browser storage`, error);
        return null;
    }
}

async function dbSet(key, value) {
    try {
        const db = await openDb();

        return await new Promise((resolve, reject) => {
            const tx = db.transaction(dbStore, "readwrite");
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.objectStore(dbStore).put({ key, value });
        });
    } catch (error) {
        showError(`could not write "${key}" in the browser storage`, error);
    }
}

async function dbClear() {
    try {
        const db = await openDb();

        return await new Promise((resolve, reject) => {
            const tx = db.transaction(dbStore, "readwrite");
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.objectStore(dbStore).clear();
        });
    } catch (error) {
        showError("could not clear the browser storage", error);
    }
}

async function dbDelete(key) {
    try {
        const db = await openDb();

        return await new Promise((resolve, reject) => {
            const tx = db.transaction(dbStore, "readwrite");
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.objectStore(dbStore).delete(key);
        });
    } catch (error) {
        showError(`could not delete "${key}" in the browser storage`, error);
    }
}
