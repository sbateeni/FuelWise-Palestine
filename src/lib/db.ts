import { openDB, DBSchema } from 'idb';

const DB_NAME = 'FuelWiseDB';
const DB_VERSION = 1;
const STORE_NAME = 'fuelPrices';

interface FuelWiseDB extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: number;
  };
}

const defaultPrices: { [key: string]: number } = {
  "بنزين 95": 6.94,
  "بنزين 98": 7.85,
  "سولار": 6.16,
};

export async function getDB() {
  const db = await openDB<FuelWiseDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const store = db.createObjectStore(STORE_NAME);
        // Initialize with default prices
        for (const [fuelType, price] of Object.entries(defaultPrices)) {
          store.put(price, fuelType);
        }
      }
    },
  });
  return db;
}

export async function getFuelPrice(fuelType: string): Promise<number | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, fuelType);
}

export async function getAllFuelPrices(): Promise<{ [key: string]: number }> {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const keys = await store.getAllKeys();
    const values = await store.getAll();
    await tx.done;

    const prices: { [key: string]: number } = {};
    keys.forEach((key, index) => {
        prices[key] = values[index];
    });
    return prices;
}

// Ensure the database is initialized when the app loads
getDB();
