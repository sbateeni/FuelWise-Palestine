import { openDB, DBSchema } from 'idb';
import type { VehicleProfile } from './types';

const DB_NAME = 'FuelWiseDB';
const DB_VERSION = 2; // Incremented version
const FUEL_PRICES_STORE = 'fuelPrices';
const VEHICLE_PROFILE_STORE = 'vehicleProfile';
const VEHICLE_PROFILE_KEY = 'currentUserVehicle';

interface FuelWiseDB extends DBSchema {
  [FUEL_PRICES_STORE]: {
    key: string;
    value: number;
  };
  [VEHICLE_PROFILE_STORE]: {
    key: string;
    value: VehicleProfile;
  }
}

const defaultPrices: { [key: string]: number } = {
  "بنزين 95": 6.94,
  "بنزين 98": 7.85,
  "سولار": 6.16,
};

export async function getDB() {
  const db = await openDB<FuelWiseDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Create fuel prices store if it doesn't exist (from version 1)
      if (!db.objectStoreNames.contains(FUEL_PRICES_STORE)) {
        const fuelStore = db.createObjectStore(FUEL_PRICES_STORE);
        for (const [fuelType, price] of Object.entries(defaultPrices)) {
          fuelStore.put(price, fuelType);
        }
      }
      
      // Create vehicle profile store if it doesn't exist (from version 2)
      if (!db.objectStoreNames.contains(VEHICLE_PROFILE_STORE)) {
        db.createObjectStore(VEHICLE_PROFILE_STORE);
      }
    },
  });
  return db;
}


export async function getFuelPrice(fuelType: string): Promise<number | undefined> {
  const db = await getDB();
  return db.get(FUEL_PRICES_STORE, fuelType);
}

export async function getAllFuelPrices(): Promise<{ [key: string]: number }> {
    const db = await getDB();
    try {
        const tx = db.transaction(FUEL_PRICES_STORE, 'readonly');
        const store = tx.objectStore(FUEL_PRICES_STORE);
        const keys = await store.getAllKeys();
        const values = await store.getAll();
        await tx.done;

        // This handles the case where the DB might be empty on first load and needs seeding
        if (keys.length === 0 && values.length === 0) {
            const writeTx = db.transaction(FUEL_PRICES_STORE, 'readwrite');
            const writeStore = writeTx.objectStore(FUEL_PRICES_STORE);
            await Promise.all(Object.entries(defaultPrices).map(([key, value]) => writeStore.put(value, key)));
            await writeTx.done;
            return defaultPrices;
        }

        const prices: { [key: string]: number } = {};
        keys.forEach((key, index) => {
            prices[key] = values[index];
        });
        return prices;
    } catch (error) {
        console.warn("Could not get fuel prices, falling back to default. This may happen if the store was just created.", error);
        return defaultPrices;
    }
}

export async function saveVehicleProfile(profile: VehicleProfile): Promise<void> {
    const db = await getDB();
    await db.put(VEHICLE_PROFILE_STORE, profile, VEHICLE_PROFILE_KEY);
}

export async function getVehicleProfile(): Promise<VehicleProfile | undefined> {
    const db = await getDB();
    // Use a transaction to safely access the store
    try {
        const tx = db.transaction(VEHICLE_PROFILE_STORE, 'readonly');
        const store = tx.objectStore(VEHICLE_PROFILE_STORE);
        const profile = await store.get(VEHICLE_PROFILE_KEY);
        await tx.done;
        return profile;
    } catch (error) {
        console.error("Failed to get vehicle profile, the store might not exist yet.", error);
        return undefined;
    }
}
