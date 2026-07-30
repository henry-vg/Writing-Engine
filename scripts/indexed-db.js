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
    try {
        const db = await openDb();

        return await new Promise((resolve, reject) => {
            const tx = db.transaction(DBStore, "readonly");
            const request = tx.objectStore(DBStore).get(key);

            request.onsuccess = () => resolve(request.result?.value ?? null);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.warn(`dbGet("${key}") failed:`, error);
        return null;
    }
}

async function dbSet(key, value) {
    try {
        const db = await openDb();

        return await new Promise((resolve, reject) => {
            const tx = db.transaction(DBStore, "readwrite");
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.objectStore(DBStore).put({ key, value });
        });
    } catch (error) {
        console.warn(`dbSet("${key}") failed:`, error);
    }
}

async function dbDelete(key) {
    try {
        const db = await openDb();

        return await new Promise((resolve, reject) => {
            const tx = db.transaction(DBStore, "readwrite");
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.objectStore(DBStore).delete(key);
        });
    } catch (error) {
        console.warn(`dbDelete("${key}") failed:`, error);
    }
}
