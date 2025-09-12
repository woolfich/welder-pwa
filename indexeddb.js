const DB_NAME = 'welder_pwa_db';
const DB_VERSION = 1;

const OBJECT_STORES = {
    WELDERS: 'welders',
    PRODUCTS: 'products',
    WELDER_RECORDS: 'welder_records',
    SUMMARY: 'summary'
};

let db;

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(OBJECT_STORES.WELDERS)) {
                db.createObjectStore(OBJECT_STORES.WELDERS, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(OBJECT_STORES.PRODUCTS)) {
                db.createObjectStore(OBJECT_STORES.PRODUCTS, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(OBJECT_STORES.WELDER_RECORDS)) {
                db.createObjectStore(OBJECT_STORES.WELDER_RECORDS, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(OBJECT_STORES.SUMMARY)) {
                db.createObjectStore(OBJECT_STORES.SUMMARY, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('Ошибка открытия IndexedDB:', event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

function addData(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            console.error('Ошибка добавления данных:', event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

function getData(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            console.error('Ошибка получения данных:', event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

function getAllData(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            console.error('Ошибка получения всех данных:', event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

function updateData(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            console.error('Ошибка обновления данных:', event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

function deleteData(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            console.error('Ошибка удаления данных:', event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

// Экспортируем функции для использования в других частях приложения
export { openDatabase, addData, getData, getAllData, updateData, deleteData, OBJECT_STORES };
